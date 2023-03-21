/* eslint-disable
    camelcase,
    max-len,
    no-cond-assign,
    no-return-assign,
    no-useless-escape,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import App from './base'
import FileTreeManager from './ide/file-tree/FileTreeManager'
import LoadingManager from './ide/LoadingManager'
import ConnectionManager from './ide/connection/ConnectionManager'
import EditorManager from './ide/editor/EditorManager'
import OnlineUsersManager from './ide/online-users/OnlineUsersManager'
import HistoryManager from './ide/history/HistoryManager'
import PermissionsManager from './ide/permissions/PermissionsManager'
import BinaryFilesManager from './ide/binary-files/BinaryFilesManager'
import MetadataManager from './ide/metadata/MetadataManager'
import OutlineManager from './features/outline/outline-manager'
import './ide/cobranding/CobrandingDataService'
import './ide/settings/index'
import './ide/chat/index'
import './ide/clone/index'
import './ide/file-view/index'
import './ide/hotkeys/index'
import './ide/wordcount/index'
import './ide/directives/layout'
import './ide/directives/validFile'
import './ide/directives/verticalResizablePanes'
import './ide/services/ide'
import './directives/focus'
import './directives/scroll'
import './directives/onEnter'
import './directives/stopPropagation'
import './directives/rightClick'
import './directives/expandableTextArea'
import './services/wait-for'
import './filters/formatDate'
import './main/event'
import './main/system-messages'
import './shared/context/controllers/root-context-controller'
import './features/editor-navigation-toolbar/controllers/editor-navigation-toolbar-controller'
import './features/pdf-preview/controllers/pdf-preview-controller'
import './features/share-project-modal/controllers/react-share-project-modal-controller'
import { localStorage } from './modules/storage'
import getMeta from './utils/meta'

App.controller(
  'IdeController',
  function ($scope, $timeout, ide, eventTracking, metadata) {
    // Don't freak out if we're already in an apply callback
    let pdfLayout
    $scope.$originalApply = $scope.$apply
    $scope.$apply = function (fn) {
      if (fn == null) {
        fn = function () {}
      }
      const phase = this.$root.$$phase
      if (phase === '$apply' || phase === '$digest') {
        return fn()
      } else {
        return this.$originalApply(fn)
      }
    }

    $scope.state = {
      loading: true,
      load_progress: 40,
      error: null,
    }
    $scope.ui = {
      leftMenuShown: false,
      view: 'editor',
      chatOpen: false,
      pdfLayout: 'sideBySide',
      pdfHidden: false,
      pdfWidth: 0,
      chatResizerSizeOpen: 7,
      chatResizerSizeClosed: 0,
    }
    $scope.user = window.user

    $scope.settings = window.userSettings
    $scope.anonymous = window.anonymous
    $scope.isTokenMember = window.isTokenMember
    $scope.isRestrictedTokenMember = window.isRestrictedTokenMember

    $scope.cobranding = {
      isProjectCobranded: false,
      logoImgUrl: undefined,
      submitBtnHtml: undefined,
      brandVariationName: undefined,
      brandVariationHomeUrl: undefined,
    }

    $scope.chat = {}

    $scope.$on('layout:pdf:resize', function (_, layoutState) {
      $scope.ui.pdfHidden = layoutState.east.initClosed
      return ($scope.ui.pdfWidth = layoutState.east.size)
    })

    $scope.$watch('ui.view', function (newView, oldView) {
      if (newView !== oldView) {
        $scope.$broadcast('layout:flat-screen:toggle')
      }
      if (newView != null && newView !== 'editor' && newView !== 'pdf') {
        eventTracking.sendMBOnce(`ide-open-view-${newView}-once`)
      }
    })

    $scope.$watch('ui.chatOpen', function (isOpen) {
      if (isOpen) {
        eventTracking.sendMBOnce('ide-open-chat-once')
      }
    })

    $scope.$watch('ui.leftMenuShown', function (isOpen) {
      if (isOpen) {
        eventTracking.sendMBOnce('ide-open-left-menu-once')
      }
    })

    $scope.trackHover = feature => {
      eventTracking.sendMBOnce(`ide-hover-${feature}-once`)
    }
    // End of tracking code.

    window._ide = ide

    ide.validFileRegex = '^[^*/]*$' // Don't allow * and /

    ide.project_id = $scope.project_id = window.project_id
    ide.$scope = $scope
    $scope.project = {
      _id: getMeta('ol-project_id'),
      rootDoc_id: getMeta('ol-projectRootDoc_id'),
      compiler: getMeta('ol-projectCompiler'),
      imageName: getMeta('ol-projectImageName'),
      version: getMeta('ol-projectTreeVersion'),
      features: {
        trackChangesVisible: false,
      },
      name: '',
    }

    ide.loadingManager = new LoadingManager($scope)
    ide.connectionManager = new ConnectionManager(ide, $scope)
    ide.fileTreeManager = new FileTreeManager(ide, $scope)
    ide.editorManager = new EditorManager(
      ide,
      $scope,
      localStorage,
      eventTracking
    )
    if (!$scope.isRestrictedTokenMember) {
      ide.onlineUsersManager = new OnlineUsersManager(ide, $scope)
    } else {
      $scope.onlineUsersArray = []
    }
    ide.historyManager = new HistoryManager(ide, $scope)
    ide.permissionsManager = new PermissionsManager(ide, $scope)
    ide.binaryFilesManager = new BinaryFilesManager(ide, $scope)
    ide.metadataManager = new MetadataManager(ide, $scope, metadata)
    ide.outlineManager = new OutlineManager(ide, $scope)

    let inited = false
    $scope.$on('project:joined', function (_project, permissionsLevel) {
      if (inited) {
        return
      }
      inited = true
      if (
        __guard__(
          $scope != null ? $scope.project : undefined,
          x => x.deletedByExternalDataSource
        )
      ) {
        ide.showGenericMessageModal(
          'Project Renamed or Deleted',
          `\
This project has either been renamed or deleted by an external data source such as Dropbox.
We don't want to delete your data on Overleaf, so this project still contains your history and collaborators.
If the project has been renamed please look in your project list for a new project under the new name.\
`
        )
      }
      if (permissionsLevel === 'readOnly') return
      ide.metadataManager.loadProjectMetaFromServer()
    })

    // Count the first 'doc:opened' as a sign that the ide is loaded
    // and broadcast a message. This is a good event to listen for
    // if you want to wait until the ide is fully loaded and initialized
    let _loaded = false
    $scope.$on('doc:opened', function () {
      if (_loaded) {
        return
      }
      $scope.$broadcast('ide:loaded')
      return (_loaded = true)
    })

    ide.localStorage = localStorage

    $scope.switchToFlatLayout = function (view) {
      $scope.ui.pdfLayout = 'flat'
      $scope.ui.view = view
      return ide.localStorage('pdf.layout', 'flat')
    }

    $scope.switchToSideBySideLayout = function (view) {
      $scope.ui.pdfLayout = 'sideBySide'
      $scope.ui.view = view
      return localStorage('pdf.layout', 'split')
    }

    if ((pdfLayout = localStorage('pdf.layout'))) {
      if (pdfLayout === 'split') {
        $scope.switchToSideBySideLayout()
      }
      if (pdfLayout === 'flat') {
        $scope.switchToFlatLayout()
      }
    } else {
      $scope.switchToSideBySideLayout()
    }

    // Update ui.pdfOpen when the layout changes.
    // The east pane should open when the layout changes from "Editor only" or "PDF only" to "Editor & PDF".
    $scope.$watch('ui.pdfLayout', value => {
      $scope.ui.pdfOpen = value === 'sideBySide'
    })

    // Update ui.pdfLayout when the east pane is toggled.
    // The layout should be set to "Editor & PDF" (sideBySide) when the east pane is opened, and "Editor only" (flat) when the east pane is closed.
    $scope.$watch('ui.pdfOpen', value => {
      $scope.ui.pdfLayout = value ? 'sideBySide' : 'flat'
      if (value) {
        window.dispatchEvent(new CustomEvent('ui:pdf-open'))
      }
    })

    $scope.recompileViaKey = () => {
      if ($scope.recompile) {
        $scope.recompile()
      } else {
        window.dispatchEvent(new CustomEvent('pdf:recompile'))
      }
    }

    $scope.handleKeyDown = event => {
      if (event.shiftKey || event.altKey) {
        return
      }

      // Ctrl+s or Cmd+s => recompile
      if (event.key === 's' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        $scope.recompileViaKey()
      }
    }

    // Listen for editor:lint event from CM6 linter
    window.addEventListener('editor:lint', event => {
      $scope.hasLintingError = event.detail.hasLintingError
    })

    return ide.socket.on('project:publicAccessLevel:changed', data => {
      if (data.newAccessLevel != null) {
        ide.$scope.project.publicAccesLevel = data.newAccessLevel
        return $scope.$digest()
      }
    })
  }
)

angular.module('SharelatexApp').config(function ($provide) {
  $provide.decorator('$browser', [
    '$delegate',
    function ($delegate) {
      $delegate.onUrlChange = function () {}
      $delegate.url = function () {
        return ''
      }
      return $delegate
    },
  ])
})

export default angular.bootstrap(document.body, ['SharelatexApp'])

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined
}
