import { useCallback } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Tag } from '../../../../../../app/src/Features/Tags/types'
import AccessibleModal from '../../../../shared/components/accessible-modal'
import useAsync from '../../../../shared/hooks/use-async'
import { deleteTag } from '../../util/api'
import { olConsole } from '../../../../infrastructure/ol-console'

type DeleteTagModalProps = {
  id: string
  tag?: Tag
  onDelete: (tagId: string) => void
  onClose: () => void
}

export default function DeleteTagModal({
  id,
  tag,
  onDelete,
  onClose,
}: DeleteTagModalProps) {
  const { t } = useTranslation()
  const { isLoading, isError, runAsync } = useAsync()

  const runDeleteTag = useCallback(
    (tagId: string) => {
      runAsync(deleteTag(tagId))
        .then(() => {
          onDelete(tagId)
        })
        .catch(olConsole.error)
    },
    [runAsync, onDelete]
  )

  if (!tag) {
    return null
  }

  return (
    <AccessibleModal show animation onHide={onClose} id={id} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{t('delete_folder')}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {t('about_to_delete_folder')}
        <ul>
          <li>{tag.name}</li>
        </ul>
      </Modal.Body>

      <Modal.Footer>
        {isError && (
          <div className="modal-footer-left">
            <span className="text-danger error">
              {t('generic_something_went_wrong')}
            </span>
          </div>
        )}
        <Button onClick={onClose} disabled={isLoading}>
          {t('cancel')}
        </Button>
        <Button
          onClick={() => runDeleteTag(tag._id)}
          bsStyle="primary"
          disabled={isLoading}
        >
          {isLoading ? <>{t('deleting')} &hellip;</> : t('delete')}
        </Button>
      </Modal.Footer>
    </AccessibleModal>
  )
}
