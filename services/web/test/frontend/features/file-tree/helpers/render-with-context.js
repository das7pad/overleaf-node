import FileTreeContext from '../../../../../frontend/js/features/file-tree/components/file-tree-context'
import { renderWithEditorContext } from '../../../helpers/render-with-context'
import { olConsole } from '../../../../../frontend/js/infrastructure/ol-console'

export default (children, options = {}) => {
  let { contextProps = {}, ...renderOptions } = options
  contextProps = {
    projectId: '123abc',
    rootFolder: [
      {
        _id: 'root-folder-id',
        name: 'rootFolder',
        docs: [],
        fileRefs: [],
        folders: [],
      },
    ],
    refProviders: {},
    reindexReferences: () => {
      olConsole.log('reindex references')
    },
    setRefProviderEnabled: provider => {
      olConsole.log(`ref provider ${provider} enabled`)
    },
    setStartedFreeTrial: () => {
      olConsole.log('started free trial')
    },
    onSelect: () => {},
    ...contextProps,
  }
  const {
    refProviders,
    reindexReferences,
    setRefProviderEnabled,
    setStartedFreeTrial,
    onSelect,
    ...editorContextProps
  } = contextProps
  return renderWithEditorContext(
    <FileTreeContext
      refProviders={refProviders}
      reindexReferences={reindexReferences}
      setRefProviderEnabled={setRefProviderEnabled}
      setStartedFreeTrial={setStartedFreeTrial}
      onSelect={onSelect}
    >
      {children}
    </FileTreeContext>,
    editorContextProps,
    renderOptions
  )
}
