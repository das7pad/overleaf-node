import App from '../../../base'
import { react2angular } from 'react2angular'

import ShareProjectModal from '../components/share-project-modal'
import { rootContext } from '../../../shared/context/root-context'
import { listProjectInvites, listProjectMembers } from '../utils/api'
import getMeta from '../../../utils/meta'
import { captureException } from '../../../infrastructure/error-reporter'

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
      $scope.$applyAsync(() => {
        $scope.show = false
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
          console.error('Error fetching members for project')
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
          console.error('Error fetching invites for project')
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
      eventTracking.sendMBOnce('ide-open-share-modal-once')
      Promise.all([
        updateProjectMembersOnce(),
        updateProjectInvitesOnce(),
      ]).finally(() => {
        $scope.$applyAsync(() => {
          $scope.show = true
        })
      })
    }

    /* tokens */

    ide.socket.on('project:tokens:changed', data => {
      if (data.tokens != null) {
        $scope.$applyAsync(() => {
          $scope.project.tokens = data.tokens
        })
      }
    })

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
  }
)
