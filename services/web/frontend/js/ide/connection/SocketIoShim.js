import getMeta from '../../utils/meta'
import { isExpired } from '../../infrastructure/jwt-fetch-json'
import { getJSON } from '../../infrastructure/fetch-json'

const CODE_CONNECT_TIMEOUT = 4000
const CODE_CLIENT_REQUESTED_DISCONNECT = 4001
const TIMEOUT = 30 * 1000

export default class SocketIoShim {
  constructor() {
    this._events = new Map()

    this.on('connectionAccepted', (_, publicId, id) => {
      this.id = id || publicId
      this._startHealthCheck()
    })
    this.on('connectionRejected', blob => {
      if (blob && blob.code === 'BadWsBootstrapBlob') {
        this._bootstrap = undefined
      }
    })
    this.on('project:membership:changed', () => {
      this._bootstrap = undefined
    })
    this.on('project:tokens:changed', () => {
      this._bootstrap = undefined
    })

    this._populateWsBootstrapBlob(getMeta('ol-wsBootstrap'))
    this._ws = {
      protocol: '',
      readyState: WebSocket.CLOSED,
      send: () => {},
      close: () => {},
    }

    // socket.io v0 interface
    const self = this
    this.socket = {
      get connected() {
        return self.connected
      },
      get sessionid() {
        return self.id
      },
      transport: {
        get name() {
          return self._ws.protocol || 'websocket-v6-dead'
        },
      },
      connect: self.connect.bind(self),
      disconnect: self.disconnect.bind(self),
    }

    this.connect()
  }

  get connected() {
    return this._ws.readyState === WebSocket.OPEN
  }

  connect() {
    if (!this._bootstrap || isExpired(this._bootstrap)) {
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), TIMEOUT)
      getJSON(`/api/project/${getMeta('ol-project_id')}/ws/bootstrap`, {
        signal: c.signal,
      })
        .then(async blob => {
          this._populateWsBootstrapBlob(blob)

          this._connect()
        })
        .catch(reason => {
          this._emit('error', `client bootstrap failed: ${reason}`)
        })
        .finally(() => clearTimeout(t))
    } else {
      this._connect()
    }
  }

  disconnect(reason = 'client requested disconnect') {
    // the 'connect timeout' handler should not trigger an error
    clearTimeout(this._connectTimeoutHandler)
    // calling .close on a closed ws is a noop
    this._ws.close(CODE_CLIENT_REQUESTED_DISCONNECT, reason)
    this._emit('disconnect', reason)
  }

  emit(event, ...args) {
    const cb = typeof args[args.length - 1] === 'function' && args.pop()

    if (!this.connected) {
      // sending on a connecting/closing/closed ws throws INVALID_STATE_ERR
      // discard the event as it is associated with an old session anyway.
      // -> a new connection can start from scratch
      sl_console.log('[SocketShimV6] ws not ready, discarding', event, args)
      if (cb) {
        const cancelledError = new Error('rpc cancelled: ws is not ready')
        setTimeout(cb, 0, cancelledError)
      }
      return
    }

    let transformedCallback = cb
    switch (event) {
      case 'joinProject':
        transformedCallback = (err, res) => {
          if (err) {
            return cb(err)
          }
          const { project, privilegeLevel, connectedClients } = res
          const protocolVersion = 6
          cb(null, project, privilegeLevel, protocolVersion, connectedClients)
        }
        break
      case 'joinDoc':
        transformedCallback = (err, res) => {
          if (err) {
            return cb(err)
          }
          const { snapshot, version, updates } = res
          cb(null, snapshot, version, updates)
        }
        break
      case 'clientTracking.getConnectedUsers':
        transformedCallback = (err, res) => {
          if (err) {
            return cb(err)
          }
          const { connectedClients } = res
          cb(null, connectedClients)
        }
        break
    }

    const payload = { a: event, b: args }
    if (transformedCallback) {
      const cbId = this._nextCallbackId++
      this._callbacks.set(cbId, transformedCallback)
      payload.c = cbId
    }
    if (['joinDoc', 'leaveDoc', 'applyOtUpdate'].includes(event)) {
      payload.d = args.shift()
    }
    if (
      [
        'joinProject',
        'applyOtUpdate',
        'clientTracking.updatePosition',
      ].includes(event)
    ) {
      payload.b = args[0]
    }
    if (event === 'joinDoc') {
      payload.b = { fromVersion: typeof args[0] === 'number' ? args[0] : -1 }
    }
    if (event === 'clientTracking.updatePosition') {
      payload.d = payload.b.doc_id
      delete payload.b.doc_id
    }
    if (event === 'applyOtUpdate') {
      delete payload.b.doc
      let isUpdate = false
      for (const op of payload.b.op) {
        if (op.i || op.d) {
          isUpdate = true
          break
        }
      }
      payload.a = isUpdate ? 'applyUpdate' : 'addComment'
    }
    if (Array.isArray(payload.b) && payload.b.length === 0) {
      delete payload.b
    }
    this._ws.send(JSON.stringify(payload))
  }

  on(event, listener) {
    if (!this._events.has(event)) {
      this._events.set(event, [])
    }
    this._events.get(event).push(listener)
  }

  removeListener(event, listener) {
    const listeners = this._events.get(event)
    if (!listeners) {
      return false
    }
    const position = listeners.indexOf(listener)
    if (position === -1) {
      return false
    }
    listeners.splice(position, 1)
    return true
  }

  _connect() {
    const newSocket = this._createWebsocket()
    this._ws = newSocket

    // reset the rpc tracking
    const callbacks = (this._callbacks = new Map())
    this._nextCallbackId = 1

    clearTimeout(this._connectTimeoutHandler)
    this._connectTimeoutHandler = setTimeout(() => {
      if (newSocket.readyState === WebSocket.CONNECTING) {
        this._emit('error', 'connect timeout')
        newSocket.close(CODE_CONNECT_TIMEOUT, 'connect timeout')
      }
    }, TIMEOUT)
    newSocket.onopen = () => {
      if (this._ws !== newSocket) {
        sl_console.log('[SocketShimV6] replaced: ignoring connect')
        return
      }
      clearTimeout(this._connectTimeoutHandler)
      newSocket.onclose = event => {
        if (callbacks.size) {
          // there are pending RPCs that need cancelling
          const cancelledError = new Error('rpc cancelled: ws is closed')
          // detach -- do not block the event loop for too long.
          callbacks.forEach(cb => setTimeout(cb, 0, cancelledError))
          callbacks.clear()
        }
        if (this._ws !== newSocket) {
          sl_console.log('[SocketShimV6] replaced: ignoring disconnect', event)
          return
        }
        if (event.code !== CODE_CLIENT_REQUESTED_DISCONNECT) {
          this._emit('disconnect', event.reason)
        }
      }
      this._emit('connect')
    }
    newSocket.onerror = event => {
      if (this._ws !== newSocket) {
        sl_console.log('[SocketShimV6] replaced: ignoring error', event)
        return
      }
      clearTimeout(this._connectTimeoutHandler)
      this._emit('error', event)
    }
    newSocket.onmessage = event => {
      this._onMessage(callbacks, JSON.parse(event.data))
    }
  }

  _emit(event, ...args) {
    const listeners = this._events.get(event)
    if (!listeners) {
      sl_console.log('[SocketShimV6] missing handler', event)
      return
    }
    switch (event) {
      case 'connectionAccepted':
        args = [null, args[0].publicId]
        break
    }
    listeners.slice().forEach(listener => {
      listener.apply(null, args)
    })
  }

  _onMessage(callbacks, parsed) {
    let { c: cbId, n: event, b: args, e: err } = parsed
    if (!args) {
      args = []
    }
    if (!Array.isArray(args)) {
      args = [args]
    }
    if (cbId || err) {
      args.unshift(err)
    }
    if (cbId) {
      if (callbacks.has(cbId)) {
        const cb = callbacks.get(cbId)
        callbacks.delete(cbId)
        cb.apply(null, args)
      } else {
        sl_console.log('[SocketShimV6] unknown cbId', cbId, args)
      }
      return
    }
    this._emit(event, ...args)
  }

  _populateWsBootstrapBlob({ bootstrap }) {
    this._bootstrap = bootstrap
  }

  _startHealthCheck() {
    const healthCheckEmitter = setInterval(() => {
      if (!this.connected) {
        clearInterval(healthCheckEmitter)
      }
      this.emit('ping', () => {
        clearTimeout(timeout)
      })
      const timeout = setTimeout(() => {
        if (!this.connected) return
        this.disconnect('client health check timeout')
      }, TIMEOUT)
    }, TIMEOUT)
    const cleanup = () => {
      clearInterval(healthCheckEmitter)
      this.removeListener('disconnect', cleanup)
    }
    this.on('disconnect', cleanup)
  }

  _createWebsocket() {
    const url = new URL(
      getMeta('ol-wsUrl') || '/socket.io',
      window.location.origin
    )
    // http -> ws; https -> wss
    url.protocol = url.protocol.replace(/^http/, 'ws')
    url.searchParams.set('bootstrap', this._bootstrap)
    return new WebSocket(url, 'v6.real-time.overleaf.com')
  }
}
