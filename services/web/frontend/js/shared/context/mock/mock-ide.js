import getMeta from '../../../utils/meta'

// When rendered without Angular, ide isn't defined. In that case we use
// a mock object that only has the required properties to pass proptypes
// checks and the values needed for the app. In the longer term, the mock
// object will replace ide completely.
export const getMockIde = () => {
  return {
    _id: getMeta('ol-project_id'),
    $scope: {
      $on: () => {},
      $watch: () => {},
      $applyAsync: () => {},
      user: getMeta('ol-user', {}),
      project: {
        _id: getMeta('ol-project_id', ''),
        name: getMeta('ol-projectName', ''),
        rootDoc_id: getMeta('ol-projectRootDoc_id', ''),
        compiler: getMeta('ol-projectCompiler', ''),
        imageName: getMeta('ol-projectImageName', ''),
        version: getMeta('ol-projectTreeVersion', 0),
        members: [],
        invites: [],
        features: {
          collaborators: 0,
          compileGroup: 'standard',
          trackChangesVisible: false,
          references: false,
          mendeley: false,
          zotero: false,
        },
        publicAccessLevel: '',
        tokens: {
          readOnly: '',
          readAndWrite: '',
        },
        owner: {
          _id: '',
          email: '',
        },
      },
      state: { loading: false },
      permissionsLevel: 'readOnly',
      editor: {
        sharejs_doc: null,
        showSymbolPalette: false,
        toggleSymbolPalette: () => {},
      },
      ui: {
        view: 'pdf',
        chatOpen: false,
        reviewPanelOpen: false,
        leftMenuShown: false,
        pdfLayout: 'flat',
      },
      pdf: {
        uncompiled: true,
        logEntryAnnotations: {},
      },
      anonymous: getMeta('ol-anonymous', false),
      isRestrictedTokenMember: getMeta('ol-isRestrictedTokenMember', false),
      settings: getMeta('ol-userSettings', {
        syntaxValidation: false,
        pdfViewer: 'pdfjs',
      }),
      hasLintingError: false,
    },
    editorManager: {
      openDoc: () => {},
      getCurrentDocId: () => {},
    },
    fileTreeManager: {
      getEntityPathById: () => null,
    },
    loadingManager: {
      ready: async () => {},
    },
  }
}
