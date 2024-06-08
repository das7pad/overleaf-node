import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContentLockModal from '../../content-lock-modal/components/content-lock-modal'
import { useProjectContext } from '../../../shared/context/project-context'
import Tooltip from '../../../shared/components/tooltip'
import Icon from '../../../shared/components/icon'

export default function ContentLockedButton() {
  const [showModal, setShowModal] = useState(false)
  const { contentLockedAt } = useProjectContext()
  const { t } = useTranslation()

  useEffect(() => {
    if (!contentLockedAt) {
      setShowModal(false)
    }
  }, [contentLockedAt])

  if (!contentLockedAt) return null

  return (
    <>
      <Tooltip
        id="content-locked"
        description={t('project_content_is_locked')}
        overlayProps={{ placement: 'right' }}
      >
        <div className="toolbar-item">
          <button
            className="btn btn-full-height"
            onClick={() => setShowModal(true)}
          >
            <Icon
              type="lock"
              fw
              accessibilityLabel={t('project_content_is_locked')}
            />
          </button>
        </div>
      </Tooltip>
      <ContentLockModal
        show={showModal}
        handleHide={() => setShowModal(false)}
      />
    </>
  )
}
