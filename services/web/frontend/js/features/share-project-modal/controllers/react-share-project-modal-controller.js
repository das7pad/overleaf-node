import App from '../../../base'
import { react2angular } from 'react2angular'

import ShareProjectModal from '../components/share-project-modal'
import { rootContext } from '../../../shared/context/root-context'
import {
  getAccessTokens,
  listProjectInvites,
  listProjectMembers,
} from '../utils/api'
import getMeta from '../../../utils/meta'
import { captureException } from '../../../infrastructure/error-reporter'
import { olConsole } from '../../../infrastructure/ol-console'
import {
  addDeepNavigation,
  removeDeepNavigation,
} from '../../../utils/deepLink'

App.component(
  'shareProjectModal',
  react2angular(
    rootContext.use(ShareProjectModal),
    Object.keys(ShareProjectModal.propTypes)
  )
)

export default App.controller(
  'ReactShareProjectModalController',
  function ($scope, eventTracking, ide) {
    $scope.show = false

    $scope.handleHide = () => {
      removeDeepNavigation('!open-share-modal')
      $scope.$applyAsync(() => {
        $scope.show = false
      })
    }

    $scope.$watch('project', () => {
      pendingGetAccessTokens = undefined
      pendingListProjectInvites = undefined
      pendingListProjectMembers = undefined
      if ($scope.show) {
        Promise.all([
          updateTokensOnce(),
          updateProjectMembersOnce(),
          updateProjectInvitesOnce(),
        ]).finally(() => {
          $scope.$applyAsync(() => {})
        })
      }
    })

    let pendingGetAccessTokens
    function updateTokensOnce() {
      if ($scope.project.publicAccessLevel !== 'tokenBased') return
      if ($scope.project.tokens.readOnly) return
      if ($scope.project.owner._id !== getMeta('ol-user_id')) {
        const readOnly = getMeta('ol-anonymousAccessToken')
        if (readOnly || !getMeta('ol-isRestrictedTokenMember')) {
          $scope.$apply(() => {
            $scope.project.tokens = { readOnly }
          })
          return
        }
      }
      if (pendingGetAccessTokens) return pendingGetAccessTokens
      pendingGetAccessTokens = getAccessTokens(getMeta('ol-project_id'))
        .catch(err => {
          captureException(err)
          pendingGetAccessTokens = undefined
          return { tokens: {} }
        })
        .then(({ tokens }) => {
          $scope.$apply(() => {
            $scope.project.tokens = tokens
          })
        })
    }

    let pendingListProjectMembers
    function updateProjectMembersOnce() {
      if (getMeta('ol-isRestrictedTokenMember')) {
        $scope.project.members = []
        return
      }
      if (pendingListProjectMembers) return pendingListProjectMembers
      pendingListProjectMembers = listProjectMembers(getMeta('ol-project_id'))
        .catch(err => {
          olConsole.error('Error fetching members for project')
          captureException(err)
          pendingListProjectMembers = undefined
          return { members: [] }
        })
        .then(({ members }) => {
          $scope.project.members = members
        })
      return pendingListProjectMembers
    }
    let pendingListProjectInvites
    function updateProjectInvitesOnce() {
      if (ide.$scope.project?.owner?._id !== getMeta('ol-user_id')) {
        $scope.project.invites = []
        return
      }
      if (pendingListProjectInvites) return pendingListProjectInvites

      pendingListProjectInvites = listProjectInvites(getMeta('ol-project_id'))
        .catch(err => {
          olConsole.error('Error fetching invites for project')
          captureException(err)
          pendingListProjectInvites = undefined
          return { invites: [] }
        })
        .then(({ invites }) => {
          $scope.project.invites = invites
        })

      return pendingListProjectInvites
    }

    $scope.openShareProjectModal = () => {
      addDeepNavigation('!open-share-modal')
      eventTracking.sendMBOnce('ide-open-share-modal-once')
      Promise.all([
        updateTokensOnce(),
        updateProjectMembersOnce(),
        updateProjectInvitesOnce(),
      ]).finally(() => {
        $scope.$applyAsync(() => {
          $scope.show = true
        })
      })
    }

    ide.socket.on('project:membership:changed', data => {
      if (data.members) {
        pendingListProjectMembers = undefined
        if ($scope.show) {
          updateProjectMembersOnce().then(() => {
            $scope.$applyAsync(() => {})
          })
        }
      }

      if (data.invites) {
        pendingListProjectInvites = undefined
        if ($scope.show) {
          updateProjectInvitesOnce().then(() => {
            $scope.$applyAsync(() => {})
          })
        }
      }

      if (data.owner) {
        ide.connectionManager.reconnectGracefully()
      }
    })

    if (window.location.hash.includes('!open-share-modal')) {
      $scope.openShareProjectModal()
    }
  }
)
