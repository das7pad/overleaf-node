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
      return this.disconnectIfInactive()
    }, ONE_HOUR_IN_MS)

    // trigger a reconnect immediately if network comes back online
    window.addEventListener('online', () => {
      sl_console.log('[online] browser notified online')
      if (!this.connected) {
        return this.tryReconnectWithRateLimit({ force: true })
      }
    })

    this.connected = false
    this.shuttingDown = false

    this.$scope.connection = {
      debug: sl_debugging,
      reconnecting: false,
      stillReconnecting: false,
      // If we need to force everyone to reload the editor
      forced_disconnect: false,
      inactive_disconnect: false,
      jobId: 0,
    }

    this.$scope.tryReconnectNow = () => {
      // user manually requested reconnection via "Try now" button
      return this.tryReconnectWithRateLimit({ force: true })
    }

    this.lastUserAction = new Date()
    this.$scope.$on('cursor:editor:update', () => {
      this.lastUserAction = new Date() // time of last edit
      if (!this.connected) {
        // user is editing, try to reconnect
        return this.tryReconnectWithRateLimit()
      }
    })

    document.querySelector('body').addEventListener('click', e => {
      if (
        !this.shuttingDown &&
        !this.connected &&
        e.target.id !== 'try-reconnect-now-button'
      ) {
        // user is editing, try to reconnect
        return this.tryReconnectWithRateLimit()
      }
    })

    // initial connection attempt
    this.updateConnectionManagerState('connecting')
    this.ide.socket = new SocketIoShim()

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
      this.connected = false
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
        this.connected = true
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
      // state should be 'authenticating'...
      sl_console.log(
        '[socket.io connectionRejected] session not valid or other connection error'
      )
      // real time sends a 'retry' message if the process was shutting down
      if (err && err.message === 'retry') {
        return this.tryReconnectWithRateLimit()
      }
      // we have failed authentication, usually due to an invalid session cookie
      return this.reportConnectionError(err)
    })

    // We can get a "disconnect" event at any point after the
    // "connect" event.

    this.ide.socket.on('disconnect', () => {
      sl_console.log('[socket.io disconnect] Disconnected')
      this.connected = false
      this.ide.pushEvent('disconnected')

      if (!this.$scope.connection.state.match(/^waiting/)) {
        if (
          !this.userIsInactiveSince(DISCONNECT_AFTER_MS) &&
          !this.shuttingDown
        ) {
          this.startAutoReconnectCountdown()
        } else {
          this.updateConnectionManagerState('inactive')
        }
      }
    })

    // Site administrators can send the forceDisconnect event to all users

    this.ide.socket.on('forceDisconnect', (message, delay = 10) => {
      this.updateConnectionManagerState('inactive')
      this.shuttingDown = true // prevent reconnection attempts
      this.$scope.$apply(() => {
        this.$scope.permissions.write = false
        this.$scope.connection.forced_disconnect = true
      })
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
  }

  updateConnectionManagerState(state) {
    this.$scope.connection.jobId += 1
    const jobId = this.$scope.connection.jobId
    sl_console.log(
      `[updateConnectionManagerState ${jobId}] from ${this.$scope.connection.state} to ${state}`
    )
    this.$scope.connection.state = state

    this.$scope.connection.reconnecting = false
    this.$scope.connection.stillReconnecting = false
    this.$scope.connection.inactive_disconnect = false
    this.$scope.connection.reconnection_countdown = null

    if (state === 'connecting') {
      // initial connection
    } else if (state === 'reconnecting') {
      // reconnection after a connection has failed
      this.stopReconnectCountdownTimer()
      this.$scope.connection.reconnecting = true
      // if reconnecting takes more than 1s (it doesn't, usually) show the
      // 'reconnecting...' warning
      setTimeout(() => {
        if (
          this.$scope.connection.reconnecting &&
          this.$scope.connection.jobId === jobId
        ) {
          this.$scope.$applyAsync(() => {
            this.$scope.connection.stillReconnecting = true
          })
        }
      }, 1000)
      this.$scope.$applyAsync(() => {})
    } else if (state === 'reconnectFailed') {
      // reconnect attempt failed
    } else if (state === 'ready') {
      // project has been joined
    } else if (state === 'waitingCountdown') {
      // disconnected and waiting to reconnect via the countdown timer
      this.stopReconnectCountdownTimer()
    } else if (state === 'waitingGracefully') {
      // disconnected and waiting to reconnect gracefully
      this.stopReconnectCountdownTimer()
    } else if (state === 'inactive') {
      // disconnected and not trying to reconnect (inactive)
    } else if (state === 'error') {
      // something is wrong
    } else {
      sl_console.log(
        `[WARN] [updateConnectionManagerState ${jobId}] got unrecognised state ${state}`
      )
    }
  }

  expectConnectionManagerState(state, jobId) {
    if (
      this.$scope.connection.state === state &&
      (!jobId || jobId === this.$scope.connection.jobId)
    ) {
      return true
    }

    sl_console.log(
      `[WARN] [state mismatch] expected state ${state}${
        jobId ? '/' + jobId : ''
      } when in ${this.$scope.connection.state}/${this.$scope.connection.jobId}`
    )
    return false
  }

  // Error reporting, which can reload the page if appropriate

  reportConnectionError(err) {
    sl_console.log('[socket.io] reporting connection error')
    this.updateConnectionManagerState('error')
    if (
      (err != null ? err.message : undefined) === 'not authorized' ||
      (err != null ? err.message : undefined) === 'invalid session'
    ) {
      window.location.assign(
        `/login?redir=${encodeURI(window.location.pathname)}`
      )
    } else {
      this.ide.socket.disconnect()
      this.ide.showGenericMessageModal(
        'Something went wrong connecting',
        `\
Something went wrong connecting to your project. Please refresh if this continues to happen.\
`
      )
    }
  }

  reconnectImmediately() {
    this.disconnect()
    return this.tryReconnect()
  }

  disconnect(options) {
    if (options && options.permanent) {
      sl_console.log('[disconnect] shutting down ConnectionManager')
      this.updateConnectionManagerState('inactive')
      this.shuttingDown = true // prevent reconnection attempts
    }
    sl_console.log('[socket.io] disconnecting client')
    return this.ide.socket.disconnect()
  }

  startAutoReconnectCountdown() {
    this.updateConnectionManagerState('waitingCountdown')
    const connectionId = this.$scope.connection.jobId
    let countdown
    sl_console.log('[ConnectionManager] starting autoreconnect countdown')
    const twoMinutes = 2 * 60 * 1000
    if (
      this.lastUserAction != null &&
      new Date() - this.lastUserAction > twoMinutes
    ) {
      // between 1 minute and 3 minutes
      countdown = 60 + Math.floor(Math.random() * 120)
    } else {
      countdown = 3 + Math.floor(Math.random() * 7)
    }

    this.$scope.$apply(() => {
      this.$scope.connection.reconnecting = false
      this.$scope.connection.stillReconnecting = false
      this.$scope.connection.reconnection_countdown = countdown
    })

    setTimeout(() => {
      if (!this.connected && !this.countdownTimeoutId) {
        this.countdownTimeoutId = setTimeout(
          () => this.decreaseCountdown(connectionId),
          1000
        )
      }
    }, 200)
  }

  stopReconnectCountdownTimer() {
    // clear timeout and set to null so we know there is no countdown running
    if (this.countdownTimeoutId != null) {
      sl_console.log('[ConnectionManager] cancelling existing reconnect timer')
      clearTimeout(this.countdownTimeoutId)
      this.countdownTimeoutId = null
    }
  }

  decreaseCountdown(connectionId) {
    this.countdownTimeoutId = null
    if (this.$scope.connection.reconnection_countdown == null) {
      return
    }
    if (!this.expectConnectionManagerState('waitingCountdown', connectionId)) {
      sl_console.log(
        `[ConnectionManager] Aborting stale countdown ${connectionId}`
      )
      return
    }

    sl_console.log(
      '[ConnectionManager] decreasing countdown',
      this.$scope.connection.reconnection_countdown
    )
    this.$scope.$apply(() => {
      this.$scope.connection.reconnection_countdown--
    })

    if (this.$scope.connection.reconnection_countdown <= 0) {
      this.$scope.connection.reconnecting = false
      this.$scope.$apply(() => {
        this.tryReconnect()
      })
    } else {
      this.countdownTimeoutId = setTimeout(
        () => this.decreaseCountdown(connectionId),
        1000
      )
    }
  }

  tryReconnect() {
    sl_console.log('[ConnectionManager] tryReconnect')
    if (
      this.connected ||
      this.shuttingDown ||
      this.$scope.connection.reconnecting
    ) {
      return
    }
    this.updateConnectionManagerState('reconnecting')
    sl_console.log('[ConnectionManager] Starting new connection')

    const removeHandler = () => {
      this.ide.socket.removeListener('error', handleFailure)
      this.ide.socket.removeListener('bootstrap', handleSuccess)
    }
    const handleFailure = () => {
      sl_console.log('[ConnectionManager] tryReconnect: failed')
      removeHandler()
      this.updateConnectionManagerState('reconnectFailed')
      this.tryReconnectWithRateLimit({ force: true })
    }
    const handleSuccess = () => {
      sl_console.log('[ConnectionManager] tryReconnect: success')
      removeHandler()
    }
    this.ide.socket.on('error', handleFailure)
    this.ide.socket.on('bootstrap', handleSuccess)

    this.ide.socket.connect()
    // record the time of the last attempt to connect
    this.lastConnectionAttempt = new Date()
  }

  tryReconnectWithRateLimit(options) {
    // bail out if the reconnect is already in progress
    if (this.$scope.connection.reconnecting || this.connected) {
      return
    }
    // bail out if we are going to reconnect soon anyway
    const reconnectingSoon =
      this.$scope.connection.reconnection_countdown != null &&
      this.$scope.connection.reconnection_countdown <= 5
    const clickedTryNow = options != null ? options.force : undefined // user requested reconnection
    if (reconnectingSoon && !clickedTryNow) {
      return
    }
    // bail out if we tried reconnecting recently
    const allowedInterval = clickedTryNow
      ? MIN_RETRY_INTERVAL_MS
      : BACKGROUND_RETRY_INTERVAL_MS
    if (
      this.lastConnectionAttempt != null &&
      new Date() - this.lastConnectionAttempt < allowedInterval
    ) {
      if (this.$scope.connection.state !== 'waitingCountdown') {
        this.startAutoReconnectCountdown()
      }
      return
    }
    this.tryReconnect()
  }

  disconnectIfInactive() {
    if (this.userIsInactiveSince(DISCONNECT_AFTER_MS) && this.connected) {
      this.disconnect()
      this.$scope.$apply(() => {
        this.$scope.connection.inactive_disconnect = true
      })
    }
  }

  userIsInactiveSince(since) {
    return new Date() - this.lastUserAction > since
  }

  reconnectGracefully(force) {
    if (this.reconnectGracefullyStarted == null) {
      this.reconnectGracefullyStarted = new Date()
    } else {
      if (!force) {
        sl_console.log(
          '[reconnectGracefully] reconnection is already in process, so skipping'
        )
        return
      }
    }
    const maxIntervalReached =
      new Date() - this.reconnectGracefullyStarted >
      MAX_RECONNECT_GRACEFULLY_INTERVAL_MS
    if (
      this.userIsInactiveSince(RECONNECT_GRACEFULLY_RETRY_INTERVAL_MS) ||
      maxIntervalReached
    ) {
      sl_console.log(
        "[reconnectGracefully] User didn't do anything for last 5 seconds, reconnecting"
      )
      this._reconnectGracefullyNow()
    } else {
      sl_console.log(
        '[reconnectGracefully] User is working, will try again in 5 seconds'
      )
      this.updateConnectionManagerState('waitingGracefully')
      setTimeout(() => {
        this.reconnectGracefully(true)
      }, RECONNECT_GRACEFULLY_RETRY_INTERVAL_MS)
    }
  }

  _reconnectGracefullyNow() {
    this.reconnectGracefullyStarted = null
    return this.reconnectImmediately()
  }
}
