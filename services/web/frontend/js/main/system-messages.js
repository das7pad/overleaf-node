/* eslint-disable
    max-len,
    no-return-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import App from '../base'
import { localStorage } from '../modules/storage'
import getMeta from '../utils/meta'
import { jwtGetJSON } from '../infrastructure/jwt-fetch-json'

const MESSAGE_POLL_INTERVAL = 15 * 60 * 1000
// Controller for messages (array)
App.controller('SystemMessagesController', $scope => {
  $scope.messages = []
  const pollSystemMessages = function () {
    // Ignore polling if tab is hidden or browser is offline
    if (document.hidden || !navigator.onLine) {
      return
    }
    if (!getMeta('ol-jwtLoggedInUser')) {
      return
    }
    jwtGetJSON({
      name: 'ol-jwtLoggedInUser',
      url: '/system/messages',
      refreshEndpoint: '/api/user/jwt',
    })
      .then(messages => {
        $scope.$applyAsync(() => {
          $scope.messages = messages
        })
      })
      .catch(() => {
        // ignore errors
      })
  }
  const cached = getMeta('ol-systemMessages')
  if (cached) {
    $scope.messages = cached
  } else {
    setTimeout(pollSystemMessages, 100)
  }
  setInterval(pollSystemMessages, MESSAGE_POLL_INTERVAL)
})

export default App.controller(
  'SystemMessageController',
  function ($scope, $sce) {
    $scope.hidden = localStorage(`systemMessage.hide.${$scope.message._id}`)
    $scope.protected = $scope.message._id === 'protected'
    $scope.htmlContent = $scope.message.content

    return ($scope.hide = function () {
      if (!$scope.protected) {
        // do not allow protected messages to be hidden
        $scope.hidden = true
        return localStorage(`systemMessage.hide.${$scope.message._id}`, true)
      }
    })
  }
)
