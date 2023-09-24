import App from '../../../base'
import { react2angular } from 'react2angular'
import EditorCloneProjectModalWrapper from '../components/editor-clone-project-modal-wrapper'
import { rootContext } from '../../../shared/context/root-context'
import { useDeepLink } from '../../../utils/deepLink'

export default App.controller(
  'LeftMenuCloneProjectModalController',
  function ($scope) {
    $scope.show = false
    const [initialShow, setShow] = useDeepLink('!open-clone-project-modal')

    $scope.handleHide = () => {
      setShow(false)
      $scope.$applyAsync(() => {
        $scope.show = false
      })
    }

    $scope.openCloneProjectModal = () => {
      setShow(true)
      $scope.$applyAsync(() => {
        $scope.show = true
      })
    }

    $scope.openProject = project => {
      window.location.assign(`/project/${project.project_id}`)
    }

    if (initialShow) $scope.openCloneProjectModal()
  }
)

App.component(
  'cloneProjectModal',
  react2angular(
    rootContext.use(EditorCloneProjectModalWrapper),
    Object.keys(EditorCloneProjectModalWrapper.propTypes)
  )
)
