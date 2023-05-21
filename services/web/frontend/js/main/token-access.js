import App from '../base'
import showFakeProgress from '../utils/loadingScreen'
import getMeta from '../utils/meta'
import { postJSON } from '../infrastructure/fetch-json'

App.controller(
  'TokenAccessPageController',
  ($scope, $location, $http, $element) => {
    $scope.mode = 'accessAttempt' // 'accessAttempt' | 'v1Import' | 'requireAccept'
    if (getMeta('ol-user_id')) {
      $scope.mode = 'requireAccept'
    }

    $scope.v1ImportData = null
    $scope.requireAccept = null

    $scope.accessInFlight = false
    $scope.accessSuccess = false
    $scope.accessError = false

    $scope.currentPath = () => {
      return $location.path()
    }

    $scope.buildZipDownloadPath = projectId => {
      return `/overleaf/project/${projectId}/download/zip`
    }

    $scope.getProjectName = () => {
      if ($scope.v1ImportData?.name) {
        return $scope.v1ImportData.name
      } else if ($scope.requireAccept?.projectName) {
        return $scope.requireAccept.projectName
      } else {
        return 'This project'
      }
    }

    $scope.postConfirmedByUser = () => {
      $scope.post(true)
    }

    $scope.post = (confirmedByUser = false) => {
      if (getMeta('ol-user_id') && !confirmedByUser) {
        $scope.mode = 'requireAccept'
        return
      }
      $scope.mode = 'accessAttempt'
      const postURL = getMeta('ol-postURL')
      $scope.accessInFlight = true

      showFakeProgress()

      postJSON(postURL)
        .then(data => {
          $scope.accessInFlight = false
          $scope.accessError = false
          if (data.redir || data.redirectTo) {
            window.location.replace(data.redir || data.redirectTo)
          } else {
            console.warn('invalid data from server in success response', data)
            $scope.accessError = 'error'
          }
        })
        .catch(function (err) {
          const data = err.data || {}
          if (data.redir || data.redirectTo) {
            return window.location.replace(data.redir || data.redirectTo)
          }
          console.warn('error response from server', err)
          $scope.accessInFlight = false
          switch (err.response?.status) {
            case 404:
              $scope.accessError = 'not_found'
              break
            case 429:
              $scope.accessError = 'rate_limited'
              $scope.retryBlocked = true
              setTimeout(() => {
                $scope.$applyAsync(() => {
                  $scope.retryBlocked = false
                })
              }, err.retryAfter)
              break
            default:
              $scope.accessError = 'error'
              break
          }
        })
        .finally(() => $scope.$applyAsync(() => {}))
    }
  }
)
