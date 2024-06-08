import { useCallback, useState } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Button, Modal } from 'react-bootstrap'
import { useProjectContext } from '../../../shared/context/project-context'
import {
  clearProjectJWT,
  getProjectJWT,
  projectJWTPutJSON,
} from '../../../infrastructure/jwt-fetch-json'
import { captureException } from '../../../infrastructure/error-reporter'

export default function ContentLockModalContent({ handleHide }) {
  const { t } = useTranslation()

  const { _id: projectId, contentLockedAt } = useProjectContext()

  const [pending, setPending] = useState(false)

  const toggle = useCallback(
    contentLocked => {
      setPending(true)
      const oldJWT = getProjectJWT()
      projectJWTPutJSON(`/project/${projectId}/settings/admin/contentLocked`, {
        body: { contentLocked },
      })
        .catch(err => {
          captureException(err)
        })
        .finally(() => {
          setPending(false)
          if (oldJWT === getProjectJWT()) {
            clearProjectJWT()
          }
        })
    },
    [projectId]
  )

  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title>{t('content_lock')}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {contentLockedAt
          ? t('project_content_is_locked')
          : t('project_content_is_editable')}
      </Modal.Body>

      <Modal.Footer>
        {contentLockedAt ? (
          <Button
            bsStyle="danger"
            disabled={pending}
            onClick={() => toggle(false)}
          >
            {pending ? <>{t('unlocking_content')}…</> : t('unlock_content')}
          </Button>
        ) : (
          <Button
            bsStyle="danger"
            disabled={pending}
            onClick={() => toggle(true)}
          >
            {pending ? <>{t('locking_content')}…</> : t('lock_content')}
          </Button>
        )}
        <Button onClick={handleHide}>{t('close')}</Button>
      </Modal.Footer>
    </>
  )
}

ContentLockModalContent.propTypes = {
  handleHide: PropTypes.func.isRequired,
}
