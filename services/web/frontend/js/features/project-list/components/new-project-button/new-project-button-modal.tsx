import BlankProjectModal from './blank-project-modal'
import ExampleProjectModal from './example-project-modal'
import { Nullable } from '../../../../../../types/utils'
import { lazy, Suspense } from 'react'
import { FullSizeLoadingSpinner } from '../../../../shared/components/loading-spinner'

export type NewProjectButtonModalVariant =
  | 'blank_project'
  | 'example_project'
  | 'upload_project'

type NewProjectButtonModalProps = {
  modal: Nullable<NewProjectButtonModalVariant>
  onHide: () => void
}

const UploadProjectModal = lazy(() => import('./upload-project-modal'))

function NewProjectButtonModal({ modal, onHide }: NewProjectButtonModalProps) {
  switch (modal) {
    case 'blank_project':
      return <BlankProjectModal onHide={onHide} />
    case 'example_project':
      return <ExampleProjectModal onHide={onHide} />
    case 'upload_project':
      return (
        <Suspense fallback={<FullSizeLoadingSpinner delay={500} />}>
          <UploadProjectModal onHide={onHide} />
        </Suspense>
      )
    default:
      return null
  }
}

export default NewProjectButtonModal
