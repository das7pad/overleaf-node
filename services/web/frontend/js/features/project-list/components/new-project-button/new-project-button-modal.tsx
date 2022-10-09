import BlankProjectModal from './blank-project-modal'
import ExampleProjectModal from './example-project-modal'
import UploadProjectModal from './upload-project-modal'
import { Nullable } from '../../../../../../types/utils'

export type NewProjectButtonModalVariant =
  | 'blank_project'
  | 'example_project'
  | 'upload_project'

type NewProjectButtonModalProps = {
  modal: Nullable<NewProjectButtonModalVariant>
  onHide: () => void
}

function NewProjectButtonModal({ modal, onHide }: NewProjectButtonModalProps) {
  switch (modal) {
    case 'blank_project':
      return <BlankProjectModal onHide={onHide} />
    case 'example_project':
      return <ExampleProjectModal onHide={onHide} />
    case 'upload_project':
      return <UploadProjectModal onHide={onHide} />
    default:
      return null
  }
}

export default NewProjectButtonModal
