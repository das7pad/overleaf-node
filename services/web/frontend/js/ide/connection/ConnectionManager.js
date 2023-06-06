import SocketIoShim from './SocketIoShim'
import getMeta from '../../utils/meta'

const ONE_HOUR_IN_MS = 1000 * 60 * 60
const TWO_MINUTES_IN_MS = 2 * 60 * 1000
const DISCONNECT_AFTER_MS = ONE_HOUR_IN_MS * 24

// rate limit on reconnects for user clicking "try now"
const MIN_RETRY_INTERVAL_MS = 1000
const BACKGROUND_RETRY_INTERVAL_MS = 5 * 1000

const RECONNECT_GRACEFULLY_RETRY_INTERVAL_MS = 5000
const MAX_RECONNECT_GRACEFULLY_INTERVAL_MS = 45 * 1000

export default class ConnectionManager {
  constructor(ide, $scope) {
    this.ide = ide
    this.$scope = $scope

    setInterval(() => {
      if (
        this.userIsInactiveSince(DISCONNECT_AFTER_MS) &&
        this.ide.socket.connected
      ) {
        this.disconnect()
      }
    }, ONE_HOUR_IN_MS)

    // trigger a reconnect immediately if network comes back online
    window.addEventListener('online', () => {
      sl_console.log('[online] browser notified online')
      if (!this.$scope.connection.inactive_disconnect) this.ensureIsConnected()
    })

    ide.socket = new SocketIoShim()
    this.$scope.connection = {
      debug: sl_debugging,
      get reconnecting() {
        return ide.socket.reconnecting
      },
      lastConnectionAttempt: performance.now(),
      get sinceLastConnectionAttempt() {
        return performance.now() - this.lastConnectionAttempt
      },
      get stillReconnecting() {
        return this.reconnecting && this.sinceLastConnectionAttempt > 1000
      },
      get forced_disconnect() {
        return ide.socket.forcedDisconnect
      },
      reconnectAt: null,
      get reconnection_countdown() {
        if (!this.reconnectAt) return 0
        if (!ide.socket.canReconnect) return 0
        const seconds = Math.ceil((this.reconnectAt - performance.now()) / 1000)
        if (seconds > 0) return seconds
        return 0
      },
      inactive_disconnect: false,
    }

    this.$scope.tryReconnectNow = () => {
      // user manually requested reconnection via "Try now" button
      this.tryReconnectInForeground()
    }

    this.lastUserAction = performance.now()
    this.$scope.$on('cursor:editor:update', () => {
      this.lastUserAction = performance.now() // time of last edit
      this.ensureIsConnected()
    })

    document.body.addEventListener('click', () => this.ensureIsConnected())

    if (this.$scope.state.loading) {
      this.$scope.state.load_progress = 70
    }

    // handle network-level websocket errors (e.g. failed dns lookups)

    let connectionAttempt = 1
    const connectionErrorHandler = err => {
      if (connectionAttempt++ < getMeta('ol-wsRetryHandshake')) {
        return setTimeout(() => this.ide.socket.connect(), 100)
      }
      this.updateConnectionManagerState('error')
      sl_console.log('socket.io error', err)
      this.$scope.$apply(() => {
        this.$scope.state.error =
          "Unable to connect, please view the <u><a href='/learn/Kb/Connection_problems'>connection problems guide</a></u> to fix the issue."
      })
    }
    this.ide.socket.on('error', connectionErrorHandler)

    // The next event we should get is an authentication response
    // from the server, either "bootstrap" or "connectionRejected".

    this.ide.socket.on(
      'bootstrap',
      ({ project, privilegeLevel, connectedClients }) => {
        this.ide.socket.removeListener('error', connectionErrorHandler)
        this.ide.pushEvent('connected')
        this.$scope.$applyAsync(() => {
          this.updateConnectionManagerState('ready')
          this.$scope.project = Object.assign(project, {
            // populate fake fields
            invites: [],
            members: [],
          })
          this.$scope.permissionsLevel = privilegeLevel
          this.$scope.connectedUsers = connectedClients
          window.dispatchEvent(
            new CustomEvent('project:joined', { detail: project })
          )
          this.$scope.$broadcast('project:joined', project, privilegeLevel)
          this.ide.loadingManager.socketLoaded()
        })
      }
    )

    this.ide.socket.on('connectionRejected', err => {
      sl_console.log('[socket.io connectionRejected]', err)
      if (err?.message === 'retry' || err?.code === 'BadWsBootstrapBlob') {
        return this.tryReconnectInForeground()
      }
      this.updateConnectionManagerState('error')
      this.ide.socket.forceDisconnect()
      this.ide.showGenericMessageModal(
        'Something went wrong connecting',
        `\
Something went wrong connecting to your project. Please refresh if this continues to happen.\
`
      )
    })

    // We can get a "disconnect" event at any point after the
    // "connect" event.

    this.ide.socket.on('disconnect', () => {
      sl_console.log('[socket.io disconnect] Disconnected')
      this.ide.pushEvent('disconnected')

      if (this.userIsInactiveSince(DISCONNECT_AFTER_MS)) {
        this.updateConnectionManagerState('inactive')
        this.$scope.$apply(() => {
          this.$scope.permissions.write = false
          this.$scope.connection.inactive_disconnect = true
        })
      } else {
        this.startAutoReconnectCountdown()
      }
    })

    // Site administrators can send the forceDisconnect event to all users

    this.ide.socket.on('forceDisconnect', (delay = 10) => {
      // flush changes before disconnecting
      this.ide.$scope.$broadcast('flush-changes')
      this.updateConnectionManagerState('forceDisconnect')
      this.ide.socket.forceDisconnectSoon(1000)
      this.$scope.$apply(() => {
        this.$scope.permissions.write = false
      })
      this.ide.showLockEditorMessageModal(
        'Please wait',
        `\
We're performing maintenance on Overleaf and you need to wait a moment.
Sorry for any inconvenience.
The editor will refresh automatically in ${delay} seconds.\
`
      )
      setTimeout(() => location.reload(), delay * 1000)
    })

    this.ide.socket.on('reconnectGracefully', () => {
      this.reconnectGracefully()
    })

    this.ide.socket.connect()
    this.updateConnectionManagerState('connecting')
  }

  updateConnectionManagerState(state) {
    const from = this.$scope.connection.state
    sl_console.log(`[updateConnectionManagerState] from ${from} to ${state}`)
    this.$scope.connection.state = state
    if (this.$scope.connection.debug) this.$scope.$applyAsync(() => {})
  }

  reconnectImmediately() {
    this.disconnect()
    this.tryReconnect()
  }

  disconnect() {
    sl_console.log('[socket.io] disconnecting client')
    this.reconnectGracefullyUntil = null
    this.ide.socket.disconnect()
  }

  startAutoReconnectCountdown() {
    sl_console.log('[ConnectionManager] starting autoReconnect countdown')
    if (!this.ide.socket.canReconnect) return
    let countdown
    if (this.userIsInactiveSince(TWO_MINUTES_IN_MS)) {
      countdown = 60 + Math.floor(Math.random() * 2 * 60)
    } else {
      countdown = 3 + Math.floor(Math.random() * 7)
    }
    const ms = countdown * 1000
    if (this._isReconnectingSoon(ms)) return

    this.$scope.connection.reconnectAt = performance.now() + ms
    clearTimeout(this.reconnectCountdownInterval)
    this.reconnectCountdownInterval = setInterval(() => {
      if (this.$scope.connection.reconnection_countdown === 0) {
        this.tryReconnect()
      }
      // Update the UI every second
      this.$scope.$applyAsync(() => {})
    }, 1000)
    this.$scope.$applyAsync(() => {})
    this.updateConnectionManagerState('waitingCountdown')
  }

  tryReconnect() {
    sl_console.log('[ConnectionManager] tryReconnect')
    clearTimeout(this.reconnectCountdownInterval)
    this.$scope.connection.reconnectAt = null
    this.$scope.$applyAsync(() => {})

    if (!this.ide.socket.canReconnect) return
    sl_console.log('[ConnectionManager] Starting new connection')
    this.$scope.connection.inactive_disconnect = false

    const removeHandler = () => {
      this.ide.socket.removeListener('error', handleFailure)
      this.ide.socket.removeListener('bootstrap', removeHandler)
    }
    const handleFailure = () => {
      removeHandler()
      this.updateConnectionManagerState('reconnectFailed')
      this.tryReconnectInForeground()
    }
    this.ide.socket.on('error', handleFailure)
    this.ide.socket.on('bootstrap', removeHandler)

    this.$scope.connection.lastConnectionAttempt = performance.now()
    this.ide.socket.connect()

    // Show "reconnecting..." when reconnecting takes more than 1s.
    setTimeout(() => this.$scope.$applyAsync(() => {}), 1001)
    this.$scope.$applyAsync(() => {})
    this.updateConnectionManagerState('reconnecting')
  }

  ensureIsConnected() {
    if (!this.ide.socket.connected) this.tryReconnectInBackground()
  }

  tryReconnectInForeground() {
    this.tryReconnectWithRateLimit(MIN_RETRY_INTERVAL_MS)
  }

  tryReconnectInBackground() {
    if (this._isReconnectingSoon(BACKGROUND_RETRY_INTERVAL_MS)) return
    this.tryReconnectWithRateLimit(BACKGROUND_RETRY_INTERVAL_MS)
  }

  tryReconnectWithRateLimit(backoff) {
    if (this.$scope.connection.sinceLastConnectionAttempt < backoff) {
      this.startAutoReconnectCountdown()
    } else {
      this.tryReconnect()
    }
  }

  userIsInactiveSince(since) {
    return performance.now() - this.lastUserAction > since
  }

  _isReconnectingSoon(ms) {
    if (!this.$scope.connection.reconnectAt) return false
    return this.$scope.connection.reconnection_countdown <= ms / 1000
  }

  reconnectGracefully() {
    if (!this.reconnectGracefullyUntil) {
      this.reconnectGracefullyUntil =
        performance.now() + MAX_RECONNECT_GRACEFULLY_INTERVAL_MS
    }
    if (this.reconnectGracefullyUntil < performance.now()) {
      sl_console.log('[reconnectGracefully] graceful period expired, forcing')
      this.reconnectImmediately()
    } else if (this.userIsInactiveSince(MAX_RECONNECT_GRACEFULLY_INTERVAL_MS)) {
      sl_console.log('[reconnectGracefully] inactive, lazy reconnecting')
      this.disconnect()
    } else if (
      this.userIsInactiveSince(RECONNECT_GRACEFULLY_RETRY_INTERVAL_MS)
    ) {
      sl_console.log('[reconnectGracefully] inactive for last 5s, reconnecting')
      this.reconnectImmediately()
    } else {
      sl_console.log('[reconnectGracefully] user is active, try again in 5s')
      this.updateConnectionManagerState('waitingGracefully')
      setTimeout(() => {
        this.reconnectGracefully()
      }, RECONNECT_GRACEFULLY_RETRY_INTERVAL_MS)
    }
  }
}
