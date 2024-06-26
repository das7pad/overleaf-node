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

function getStubWebSocket(readyState) {
  return {
    protocol: '',
    readyState,
    send: () => {},
    close() {
      this.readyState = WebSocket.CLOSING
    },
  }
}

export default class SocketIoShim {
  constructor() {
    this._connectionCounter = 0
    this._events = new Map()
    this._forcedDisconnect = false
    this._publicId = ''
    this._ws = /** @type{WebSocket} */ getStubWebSocket(WebSocket.CLOSED)

    this.on('bootstrap', ({ publicId }) => {
      this._publicId = publicId
    })
    this.on('connectionRejected', err => {
      if (err.code === 'BadWsBootstrapBlob') clearProjectJWT()
    })
    this.on('forceDisconnect', () => {
      this._forcedDisconnect = true
    })

    // Clear project jwt when detecting a changed epoch.
    this.on('project:membership:changed', () => {
      clearProjectJWT()
    })
    this.on('project:publicAccessLevel:changed', () => {
      clearProjectJWT()
    })
  }

  get canReconnect() {
    return !(this.connected || this.connecting || this._forcedDisconnect)
  }

  get connected() {
    return this._ws.readyState === WebSocket.OPEN
  }

  get connecting() {
    return this._ws.readyState === WebSocket.CONNECTING
  }

  get forcedDisconnect() {
    return this._forcedDisconnect
  }

  get protocol() {
    return this._ws.protocol
  }

  get publicId() {
    return this._publicId
  }

  get reconnecting() {
    return this.connecting && this._connectionCounter > 1
  }

  connect() {
    if (!this.canReconnect) return
    this._connectionCounter++
    const jwt = getProjectJWT()
    if (!jwt || isExpired(jwt)) {
      const stubWs = getStubWebSocket(WebSocket.CONNECTING)
      this._ws = stubWs
      clearProjectJWT()
      refreshProjectJWT()
        .then(jwt => {
          if (stubWs.readyState !== WebSocket.CONNECTING) return
          this._connect(jwt)
        })
        .catch(reason => {
          stubWs.readyState = WebSocket.CLOSED
          this._emit('error', `client bootstrap failed: ${reason}`)
        })
    } else {
      this._connect(jwt)
    }
  }

  forceDisconnectSoon(ms) {
    this._forcedDisconnect = true
    setTimeout(() => this.disconnect(), ms)
  }

  forceDisconnect() {
    this._forcedDisconnect = true
    this.disconnect()
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
      // discard the rpc call as it is associated with an old session anyway.
      // -> a new connection can start from scratch
      sl_console.log('[SocketIoShim] ws not ready, discarding', action)
      throw new Error('rpc cancelled: ws is not ready')
    }
    if (this._callbacks.size === 0) {
      this._nextCallbackId = 1 // Save bandwidth: reset counter when idle.
    }
    let cbId = this._nextCallbackId++
    if (async) {
      cbId = -cbId // A negative cbId indicates a lazy success callback.
    }
    const payload = { a: action, b: body, c: cbId, d: docId }
    const blob = JSON.stringify(payload)
    if (new TextEncoder().encode(blob).byteLength > 7 * 1024 * 1024) {
      throw new Error('payload too large')
    }
    this._ws.send(blob)
    return new Promise((resolve, reject) => {
      this._callbacks.set(cbId, { resolve, reject })
    })
  }

  on(event, listener) {
    if (!this._events.has(event)) this._events.set(event, [])
    this._events.get(event).push(listener)
  }

  removeListener(event, listener) {
    const listeners = this._events.get(event)
    if (!listeners) return
    const idx = listeners.indexOf(listener)
    if (idx === -1) return
    listeners.splice(idx, 1)
  }

  _connect(jwt) {
    const newSocket = this._createWebsocket(jwt)
    this._ws = newSocket

    this._earlyMessageQueue = []

    // reset the rpc tracking
    const callbacks = new Map()
    this._callbacks = callbacks
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
        } else {
          if (event.code !== CODE_CLIENT_REQUESTED_DISCONNECT) {
            this._emit('disconnect', event.reason)
          }
        }
      }
      this._startHealthCheck(newSocket)
    }
    newSocket.onerror = event => {
      if (this._ws !== newSocket) {
        sl_console.log('[SocketIoShim] replaced: ignoring error', event)
      } else {
        clearTimeout(this._connectTimeoutHandler)
        this._emit('error', event)
      }
    }
    newSocket.onmessage = event => {
      this._onMessage(callbacks, JSON.parse(event.data))
    }
  }

  _emit(event, ...args) {
    const listeners = this._events.get(event)
    if (listeners) {
      listeners.slice().forEach(listener => listener.apply(null, args))
    } else {
      sl_console.log('[SocketIoShim] missing handler', event)
    }
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
    const { c: cbId, n: event, b: body, e: err, s: successCbIds } = parsed
    if (successCbIds) {
      for (const { c: successCbId } of successCbIds) {
        this._callCallback(callbacks, successCbId)
      }
    }
    if (cbId) {
      this._callCallback(callbacks, cbId, err, body)
    } else {
      if (this._earlyMessageQueue) {
        switch (event) {
          case 'bootstrap': {
            const queue = this._earlyMessageQueue
            delete this._earlyMessageQueue
            setTimeout(() => {
              queue.forEach(({ event, body }) => {
                console.log(event, body)
                this._emit(event, body)
              })
            }, 1)
            break
          }
          case 'connectionRejected':
            break
          default:
            this._earlyMessageQueue.push({ event, body })
            return
        }
      }
      this._emit(event, body)
    }
  }

  _startHealthCheck(ws) {
    let waitingForPong = false
    const healthCheckInterval = setInterval(() => {
      if (ws !== this._ws || !this.connected) {
        clearInterval(healthCheckInterval)
        return
      }
      if (waitingForPong) {
        this.disconnect('client health check timeout')
        return
      }
      waitingForPong = true
      this.rpc({ action: 'ping' })
        .then(() => {
          waitingForPong = false
        })
        .catch(err => {
          if (ws !== this._ws || !this.connected) return
          this.disconnect(`client health check failed: ${err}`)
        })
    }, TIMEOUT)
    ws.addEventListener('close', () => {
      clearInterval(healthCheckInterval)
    })
  }

  _createWebsocket(jwt) {
    const url = new URL(getMeta('ol-wsUrl'), window.location.origin)
    url.protocol = url.protocol.replace(/^http/, 'ws')
    return new WebSocket(url, [
      'v8.real-time.overleaf.com',
      jwt + '.bootstrap.v8.real-time.overleaf.com',
    ])
  }
}
