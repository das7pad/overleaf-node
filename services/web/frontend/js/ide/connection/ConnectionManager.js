// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

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
      this.disconnectIfInactive()
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
      lastConnectionAttempt: new Date(),
      get stillReconnecting() {
        return (
          this.reconnecting && new Date() - this.lastConnectionAttempt > 1000
        )
      },
      get forced_disconnect() {
        return ide.socket.forcedDisconnect
      },
      reconnectAt: null,
      get reconnection_countdown() {
        if (!this.reconnectAt) return 0
        if (!ide.socket.canReconnect) return 0
        const seconds = Math.ceil((this.reconnectAt - new Date()) / 1000)
        if (seconds > 0) return seconds
        return 0
      },
      inactive_disconnect: false,
    }

    this.$scope.tryReconnectNow = () => {
      // user manually requested reconnection via "Try now" button
      this.tryReconnectInForeground()
    }

    this.lastUserAction = new Date()
    this.$scope.$on('cursor:editor:update', () => {
      this.lastUserAction = new Date() // time of last edit
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
    // from the server, either "bootstrap" or
    // "connectionRejected".

    this.ide.socket.on(
      'bootstrap',
      ({ project, privilegeLevel, connectedClients }) => {
        this.ide.socket.removeListener('error', connectionErrorHandler)
        this.ide.pushEvent('connected')
        this.$scope.$applyAsync(() => {
          this.updateConnectionManagerState('ready')
          this.$scope.project = project
          this.$scope.permissionsLevel = privilegeLevel
          this.ide.loadingManager.socketLoaded()
          this.$scope.connectedUsers = connectedClients
          window.dispatchEvent(
            new CustomEvent('project:joined', { detail: project })
          )
          this.$scope.$broadcast('project:joined', project, privilegeLevel)
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
        this.enterInactiveMode()
      } else {
        this.startAutoReconnectCountdown()
      }
    })

    // Site administrators can send the forceDisconnect event to all users

    this.ide.socket.on('forceDisconnect', (message, delay = 10) => {
      this.enterInactiveMode()
      // flush changes before disconnecting
      this.ide.$scope.$broadcast('flush-changes')
      setTimeout(() => this.ide.socket.disconnect(), 1000)
      this.ide.showLockEditorMessageModal(
        'Please wait',
        `\
We're performing maintenance on Overleaf and you need to wait a moment.
Sorry for any inconvenience.
The editor will refresh automatically in ${delay} seconds.\
`
      )
      return setTimeout(() => location.reload(), delay * 1000)
    })

    this.ide.socket.on('reconnectGracefully', () => {
      sl_console.log('Reconnect gracefully')
      this.reconnectGracefully()
    })

    this.ide.socket.connect()
    this.updateConnectionManagerState('connecting')
  }

  enterInactiveMode() {
    this.updateConnectionManagerState('inactive')
    this.$scope.$apply(() => {
      this.$scope.permissions.write = false
      this.$scope.connection.inactive_disconnect = true
    })
  }

  updateConnectionManagerState(state) {
    const from = this.$scope.connection.state
    sl_console.log(`[updateConnectionManagerState] from ${from} to ${state}`)
    this.$scope.connection.state = state
    if (this.$scope.connection.debug) this.$scope.$applyAsync(() => {})
  }

  reconnectImmediately() {
    this.reconnectGracefullyUntil = null
    this.disconnect()
    this.tryReconnect()
  }

  disconnect() {
    sl_console.log('[socket.io] disconnecting client')
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

    this.$scope.connection.reconnectAt = new Date(Date.now() + ms)
    clearTimeout(this.reconnectCountdownInterval)
    this.reconnectCountdownInterval = setInterval(() => {
      if (this.$scope.connection.reconnection_countdown === 0) {
        this.tryReconnect()
      }
      // Update the UI every second
      this.$scope.$applyAsync(() => {})
    }, 1000)
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
      this.ide.socket.removeListener('bootstrap', handleSuccess)
    }
    const handleFailure = () => {
      sl_console.log('[ConnectionManager] tryReconnect: failed')
      removeHandler()
      this.updateConnectionManagerState('reconnectFailed')
      this.tryReconnectInForeground()
    }
    const handleSuccess = () => {
      sl_console.log('[ConnectionManager] tryReconnect: success')
      removeHandler()
    }
    this.ide.socket.on('error', handleFailure)
    this.ide.socket.on('bootstrap', handleSuccess)

    this.$scope.connection.lastConnectionAttempt = new Date()
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
    if (new Date() - this.$scope.connection.lastConnectionAttempt < backoff) {
      this.startAutoReconnectCountdown()
    } else {
      this.tryReconnect()
    }
  }

  disconnectIfInactive() {
    if (
      this.userIsInactiveSince(DISCONNECT_AFTER_MS) &&
      this.ide.socket.connected
    ) {
      this.disconnect()
    }
  }

  userIsInactiveSince(since) {
    return new Date() - this.lastUserAction > since
  }

  _isReconnectingSoon(ms) {
    if (!this.$scope.connection.reconnectAt) return false
    return this.$scope.connection.reconnection_countdown <= ms / 1000
  }

  reconnectGracefully() {
    if (!this.reconnectGracefullyUntil) {
      this.reconnectGracefullyUntil = new Date(
        Date.now() + MAX_RECONNECT_GRACEFULLY_INTERVAL_MS
      )
    }
    if (this.userIsInactiveSince(RECONNECT_GRACEFULLY_RETRY_INTERVAL_MS)) {
      sl_console.log(
        "[reconnectGracefully] User didn't do anything for last 5 seconds, reconnecting"
      )
      this.reconnectImmediately()
    } else if (this.reconnectGracefullyUntil < new Date()) {
      sl_console.log('[reconnectGracefully] graceful period expired, forcing')
      this.reconnectImmediately()
    } else {
      sl_console.log(
        '[reconnectGracefully] User is working, will try again in 5 seconds'
      )
      this.updateConnectionManagerState('waitingGracefully')
      setTimeout(() => {
        this.reconnectGracefully()
      }, RECONNECT_GRACEFULLY_RETRY_INTERVAL_MS)
    }
  }
}
