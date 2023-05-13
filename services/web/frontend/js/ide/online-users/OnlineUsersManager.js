/* eslint-disable
    camelcase,
    max-len,
    no-return-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import ColorManager from '../colors/ColorManager'
import 'crypto-js/md5'

let OnlineUsersManager

export default OnlineUsersManager = (function () {
  OnlineUsersManager = class OnlineUsersManager {
    static initClass() {
      this.prototype.cursorUpdateInterval = 500
    }

    constructor(ide, $scope) {
      this.ide = ide
      this.$scope = $scope
      this.$scope.onlineUsers = {}
      this.$scope.onlineUserCursorHighlights = {}
      this.$scope.onlineUsersArray = []
      this.$scope.onlineUsersCount = 0

      this.$scope.$on('cursor:editor:update', (event, position) => {
        return this.sendCursorPositionUpdate(position)
      })

      this.storeConnectedUsers = connectedUsers => {
        this.$scope.onlineUsers = {}
        this.addConnectedUsers(connectedUsers)
      }

      this.addConnectedUsers = connectedUsers => {
        for (const user of connectedUsers) {
          if (user.client_id === this.ide.socket.publicId) {
            // Don't store myself
            continue
          }

          // Store data in the same format returned by clientTracking.clientUpdated
          this.$scope.onlineUsers[user.client_id] = {
            id: user.client_id,
            user_id: user.user_id,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            doc_id:
              user.cursorData != null ? user.cursorData.doc_id : undefined,
            row: user.cursorData != null ? user.cursorData.row : undefined,
            column:
              user.cursorData != null ? user.cursorData.column : undefined,
          }
        }
        this.refreshOnlineUsers()
      }

      this.getConnectedUsers = () => {
        this.ide.socket
          .rpc({
            action: 'clientTracking.getConnectedUsers',
          })
          .then(
            ({ connectedClients }) => {
              this.storeConnectedUsers(connectedClients || [])
            },
            () => {
              // ignore errors
            }
          )
      }
      this.$scope.$on('project:joined', () => {
        const connectedUsers = this.$scope.connectedUsers
        this.$scope.connectedUsers = null

        const removeHandler = this.$scope.$on('file-tree:initialized', () => {
          removeHandler()
          if (connectedUsers) {
            this.storeConnectedUsers(connectedUsers)
          } else {
            this.getConnectedUsers()
          }
        })
      })

      this.ide.socket.on('clientTracking.clientConnected', client => {
        if (!this.$scope.onlineUsers[client.client_id]) {
          this.addConnectedUsers([client])
        }
      })

      this.ide.socket.on('clientTracking.clientUpdated', client => {
        if (client.id !== this.ide.socket.publicId) {
          // Check it's not me!
          return this.$scope.$apply(() => {
            if (!this.$scope.onlineUsers[client.id]) {
              // cache miss, load full details
              return this.getConnectedUsers()
            }
            // incremental update
            Object.assign(this.$scope.onlineUsers[client.id], client)
            return this.refreshOnlineUsers()
          })
        }
      })

      this.ide.socket.on('clientTracking.clientDisconnected', client_id => {
        return this.$scope.$apply(() => {
          delete this.$scope.onlineUsers[client_id]
          return this.refreshOnlineUsers()
        })
      })

      this.$scope.getHueForUserId = user_id => {
        return ColorManager.getHueForUserId(user_id)
      }
    }

    refreshOnlineUsers() {
      this.$scope.onlineUsersArray = []

      for (const client_id in this.$scope.onlineUsers) {
        const user = this.$scope.onlineUsers[client_id]
        if (user.doc_id != null) {
          user.doc = this.ide.fileTreeManager.findEntityById(user.doc_id)
        }

        // If the user's name is empty use their email as display name
        // Otherwise they're probably an anonymous user
        if (user.name === null || user.name.trim().length === 0) {
          if (user.email) {
            user.name = user.email.trim()
          } else if (
            user.user_id === 'anonymous-user' ||
            user.user_id === '00000000-0000-0000-0000-000000000000'
          ) {
            user.name = 'Anonymous'
          }
        }

        user.initial = user.name != null ? user.name[0] : undefined
        if (!user.initial || user.initial === ' ') {
          user.initial = '?'
        }

        this.$scope.onlineUsersArray.push(user)
      }

      // keep a count of the other online users
      this.$scope.onlineUsersCount = this.$scope.onlineUsersArray.length

      this.$scope.onlineUserCursorHighlights = {}
      for (const client_id in this.$scope.onlineUsers) {
        const client = this.$scope.onlineUsers[client_id]
        const { doc_id } = client
        if (doc_id == null || client.row == null || client.column == null) {
          continue
        }
        if (!this.$scope.onlineUserCursorHighlights[doc_id]) {
          this.$scope.onlineUserCursorHighlights[doc_id] = []
        }
        this.$scope.onlineUserCursorHighlights[doc_id].push({
          label: client.name,
          cursor: {
            row: client.row,
            column: client.column,
          },
          hue: ColorManager.getHueForUserId(client.user_id),
        })
      }

      if (this.$scope.onlineUsersArray.length > 0) {
        delete this.cursorUpdateTimeout
        return (this.cursorUpdateInterval = 500)
      } else {
        delete this.cursorUpdateTimeout
        return (this.cursorUpdateInterval = 60 * 1000 * 5)
      }
    }

    isAlreadySubmittedCursorData(cursorData) {
      return (
        this.submittedCursorData &&
        cursorData.row === this.submittedCursorData.row &&
        cursorData.column === this.submittedCursorData.column &&
        cursorData.doc_id === this.submittedCursorData.doc_id
      )
    }

    sendCursorPositionUpdate(position) {
      let cursorData = {
        row: position && position.row,
        column: position && position.column,
        doc_id: this.$scope.editor.open_doc_id,
      }
      if (this.isAlreadySubmittedCursorData(cursorData)) {
        // No update to the position in the doc.
        return
      }

      // Keep track of the latest position.
      this.currentCursorData = cursorData

      if (this.cursorUpdateTimeout) {
        // Sending is in progress, it will pick up ^.
        return
      }
      this.cursorUpdateTimeout = setTimeout(() => {
        delete this.cursorUpdateTimeout

        // Always send the latest position to other clients.
        cursorData = this.currentCursorData

        if (this.isAlreadySubmittedCursorData(cursorData)) {
          // They changed back to the old position.
          return
        }
        this.submittedCursorData = cursorData
        const docId = cursorData.doc_id
        delete cursorData.doc_id
        this.ide.socket
          .rpc({
            action: 'clientTracking.updatePosition',
            docId,
            body: cursorData,
            async: true,
          })
          .catch(() => {
            // cursor updates are optional
          })
      }, this.cursorUpdateInterval)
    }
  }
  OnlineUsersManager.initClass()
  return OnlineUsersManager
})()
