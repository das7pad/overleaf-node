import App from '../../../base'
import { react2angular } from 'react2angular'
import ContentLockModal from '../components/content-lock-modal'
import { rootContext } from '../../../shared/context/root-context'
import { useDeepLink } from '../../../utils/deepLink'

export default App.controller('ContentLockModalController', function ($scope) {
  const [initialShow, setShow] = useDeepLink('!open-content-lock-modal')
  $scope.show = initialShow

  $scope.handleHide = () => {
    setShow(false)
    $scope.$applyAsync(() => {
      $scope.show = false
    })
  }

  $scope.openContentLockModal = () => {
    setShow(true)
    $scope.$applyAsync(() => {
      $scope.show = true
    })
  }
})

App.component(
  'contentLockModal',
  react2angular(
    rootContext.use(ContentLockModal),
    Object.keys(ContentLockModal.propTypes)
  )
)
