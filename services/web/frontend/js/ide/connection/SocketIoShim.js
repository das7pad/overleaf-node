import getMeta from '../../utils/meta'
import {
  clearProjectJWT,
  getProjectJWT,
  isExpired,
  refreshProjectJWT,
} from '../../infrastructure/jwt-fetch-json'

const CODE_CONNECT_TIMEOUT = 4000
const CODE_CLIENT_REQUESTED_DISCONNECT = 4001
const TIMEOUT = 30 * 1000

export default class SocketIoShim {
  constructor() {
    this._connectionCounter = 0
    this._events = new Map()

    this.on('bootstrap', ({ publicId }) => {
      this.id = publicId
    })
    this.on('connectionRejected', blob => {
      if (blob && blob.code === 'BadWsBootstrapBlob') {
        clearProjectJWT()
      }
    })

    // Clear project jwt when detecting a changed epoch.
    this.on('project:membership:changed', () => {
      clearProjectJWT()
    })
    this.on('project:tokens:changed', () => {
      clearProjectJWT()
    })

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

  get connecting() {
    return this._ws.readyState === WebSocket.CONNECTING
  }

  get reconnecting() {
    return this.connecting && this._connectionCounter > 0
  }

  connect() {
    if (this.connected || this.connecting) return
    const jwt = getProjectJWT()
    if (!jwt || isExpired(jwt)) {
      clearProjectJWT()
      refreshProjectJWT()
        .then(jwt => this._connect(jwt))
        .catch(reason => {
          this._emit('error', `client bootstrap failed: ${reason}`)
        })
    } else {
      this._connect(jwt)
    }
  }

  disconnect(reason = 'client requested disconnect') {
    // the 'connect timeout' handler should not trigger an error
    clearTimeout(this._connectTimeoutHandler)
    // calling .close on a closed ws is a noop
    this._ws.close(CODE_CLIENT_REQUESTED_DISCONNECT, reason)
    this._emit('disconnect', reason)
  }

  async rpc({ action, docId, body, async = false }) {
    if (!this.connected) {
      // sending on a connecting/closing/closed ws throws INVALID_STATE_ERR
      // discard the event as it is associated with an old session anyway.
      // -> a new connection can start from scratch
      sl_console.log('[SocketIoShim] ws not ready, discarding', action)
      throw new Error('rpc cancelled: ws is not ready')
    }
    let cbId = this._nextCallbackId++
    if (async) {
      cbId = -cbId // A negative cbId indicates a lazy success callback.
    }
    const payload = { a: action, b: body, c: cbId, d: docId }
    const blob = JSON.stringify(payload)
    if (blob.length > 7 * 1024 * 1024) {
      throw new Error('payload too large')
    }
    this._ws.send(blob)
    return new Promise((resolve, reject) => {
      this._callbacks.set(cbId, { resolve, reject })
    })
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

  _connect(jwt) {
    const newSocket = this._createWebsocket(jwt)
    this._ws = newSocket
    this._connectionCounter++

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
        sl_console.log('[SocketIoShim] replaced: ignoring connect')
        return
      }
      clearTimeout(this._connectTimeoutHandler)
      newSocket.onclose = event => {
        if (callbacks.size) {
          // there are pending RPCs that need cancelling
          const cancelledError = new Error('rpc cancelled: ws is closed')
          // detach -- do not block the event loop for too long.
          callbacks.forEach(({ reject }) =>
            setTimeout(reject, 0, cancelledError)
          )
          callbacks.clear()
        }
        if (this._ws !== newSocket) {
          sl_console.log('[SocketIoShim] replaced: ignoring disconnect', event)
          return
        }
        if (event.code !== CODE_CLIENT_REQUESTED_DISCONNECT) {
          this._emit('disconnect', event.reason)
        }
      }
      this._startHealthCheck()
      this._emit('connect')
    }
    newSocket.onerror = event => {
      if (this._ws !== newSocket) {
        sl_console.log('[SocketIoShim] replaced: ignoring error', event)
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
      sl_console.log('[SocketIoShim] missing handler', event)
      return
    }
    listeners.slice().forEach(listener => {
      listener.apply(null, args)
    })
  }

  _callCallback(callbacks, cbId, err, body) {
    if (callbacks.has(cbId)) {
      const { resolve, reject } = callbacks.get(cbId)
      callbacks.delete(cbId)
      if (err) {
        reject(err)
      } else {
        resolve(body)
      }
    } else {
      sl_console.log('[SocketIoShim] unknown cbId', cbId, body)
    }
  }

  _onMessage(callbacks, parsed) {
    const {
      c: cbId,
      n: event,
      b: body,
      e: err,
      s: lazySuccessResponses,
    } = parsed
    if (lazySuccessResponses) {
      for (const { c: otherCbId } of lazySuccessResponses) {
        this._callCallback(callbacks, otherCbId)
      }
    }
    if (cbId) {
      this._callCallback(callbacks, cbId, err, body)
    } else {
      if (Array.isArray(body)) {
        this._emit(event, ...body)
      }
      this._emit(event, body)
    }
  }

  _startHealthCheck() {
    const healthCheckEmitter = setInterval(() => {
      if (!this.connected) {
        clearInterval(healthCheckEmitter)
      }
      this.rpc({ action: 'ping' })
        .catch(err => {
          this.disconnect(`client health check failed: ${err}`)
        })
        .finally(() => {
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

  _createWebsocket(jwt) {
    const url = new URL(
      getMeta('ol-wsUrl') || '/socket.io',
      window.location.origin
    )
    // http -> ws; https -> wss
    url.protocol = url.protocol.replace(/^http/, 'ws')
    return new WebSocket(url, [
      'v8.real-time.overleaf.com',
      jwt + '.bootstrap.v8.real-time.overleaf.com',
    ])
  }
}
