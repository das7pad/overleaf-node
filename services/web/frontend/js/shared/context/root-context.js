import PropTypes from 'prop-types'
import createSharedContext from 'react2angular-shared-context'

import { UserProvider } from './user-context'
import { IdeProvider } from './ide-context'
import { EditorProvider } from './editor-context'
import { LocalCompileProvider } from './local-compile-context'
import { DetachCompileProvider } from './detach-compile-context'
import { LayoutProvider } from './layout-context'
import { DetachProvider } from './detach-context'
import { ChatProvider } from '../../features/chat/context/chat-context'
import { ProjectProvider } from './project-context'
import { SplitTestProvider } from './split-test-context'
import { FileTreeDataProvider } from './file-tree-data-context'

export function ContextRoot({ children, ide }) {
  return (
    <SplitTestProvider>
      <IdeProvider ide={ide}>
        <UserProvider>
          <ProjectProvider>
            <FileTreeDataProvider>
              <DetachProvider>
                <EditorProvider>
                  <LayoutProvider>
                    <LocalCompileProvider>
                      <DetachCompileProvider>
                        <ChatProvider>{children}</ChatProvider>
                      </DetachCompileProvider>
                    </LocalCompileProvider>
                  </LayoutProvider>
                </EditorProvider>
              </DetachProvider>
            </FileTreeDataProvider>
          </ProjectProvider>
        </UserProvider>
      </IdeProvider>
    </SplitTestProvider>
  )
}

ContextRoot.propTypes = {
  children: PropTypes.any,
  ide: PropTypes.object,
}

export const rootContext = createSharedContext(ContextRoot)
