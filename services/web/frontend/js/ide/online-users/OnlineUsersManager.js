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
import t from 'react-i18next/t'

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
        this.sendCursorPositionUpdate(position, $scope.editor.open_doc_id)
      })

      this.storeConnectedUsers = connectedUsers => {
        this.$scope.onlineUsers = {}
        this.updateConnectedUsers(connectedUsers)
      }

      this.updateConnectedUsers = connectedUsers => {
        for (const user of connectedUsers) {
          $scope.onlineUsers[user.i] = {
            id: user.i,
            name: user.n || $scope.onlineUsers[user.i]?.name,
            entityId: user.e,
            row: user.r || 0,
            column: user.c || 0,
          }
        }
        this.refreshOnlineUsers()
      }

      this.getConnectedUsers = () => {
        this.ide.socket
          .rpc({ action: 'clientTracking.getConnectedUsers' })
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
        if (!this.$scope.onlineUsers[client.i]) {
          this.updateConnectedUsers([client])
        }
      })

      this.ide.socket.on('clientTracking.clientUpdated', client => {
        this.$scope.$apply(() => {
          if (!this.$scope.onlineUsers[client.i]) {
            // cache miss, load full details
            return this.getConnectedUsers()
          }
          this.updateConnectedUsers([client])
        })
      })

      this.ide.socket.on('clientTracking.clientDisconnected', clientId => {
        this.$scope.$apply(() => {
          delete this.$scope.onlineUsers[clientId]
          this.refreshOnlineUsers()
        })
      })

      this.$scope.getHueForUserId = user_id => {
        return ColorManager.getHueForUserId(user_id)
      }
    }

    refreshOnlineUsers() {
      this.$scope.onlineUsersArray = []

      for (const clientId in this.$scope.onlineUsers) {
        const user = this.$scope.onlineUsers[clientId]
        if (user.entityId === '00000000-0000-0000-0000-000000000000') {
          // no doc open
          user.doc = undefined
        } else if (user.doc?.id === user.entityId) {
          // already up-to-date
        } else {
          try {
            user.doc = this.ide.fileTreeManager.findEntityById(user.entityId)
          } catch (e) {
            // stale position referencing deleted doc
            user.doc = undefined
          }
        }

        if (!user.name) {
          user.name = t('anonymous')
        }
        user.initial = user.name[0]

        this.$scope.onlineUsersArray.push(user)
      }

      // keep a count of the other online users
      this.$scope.onlineUsersCount = this.$scope.onlineUsersArray.length

      this.$scope.onlineUserCursorHighlights = {}
      for (const clientId in this.$scope.onlineUsers) {
        const client = this.$scope.onlineUsers[clientId]
        if (client.doc?.type !== 'doc') {
          continue
        }
        const { entityId } = client
        if (!this.$scope.onlineUserCursorHighlights[entityId]) {
          this.$scope.onlineUserCursorHighlights[entityId] = []
        }
        this.$scope.onlineUserCursorHighlights[entityId].push({
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
        this.cursorUpdateInterval = 500
      } else {
        delete this.cursorUpdateTimeout
        this.cursorUpdateInterval = 60 * 1000 * 5
      }
    }

    isAlreadySubmittedCursorData(cursorData) {
      return (
        this.submittedCursorData &&
        cursorData.r === this.submittedCursorData.r &&
        cursorData.c === this.submittedCursorData.c &&
        cursorData.e === this.submittedCursorData.e
      )
    }

    sendCursorPositionUpdate(position, entityId) {
      let cursorData = {
        r: position && position.row,
        c: position && position.column,
        e: entityId,
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
        this.ide.socket
          .rpc({
            action: 'clientTracking.updatePosition',
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
