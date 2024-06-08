import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import LeftMenuButton from './left-menu-button'
import ContentLockModal from '../../content-lock-modal/components/content-lock-modal'

export default function ActionsContentLock() {
  const [showModal, setShowModal] = useState(false)
  const { t } = useTranslation()

  return (
    <>
      <LeftMenuButton
        onClick={() => setShowModal(true)}
        icon={{
          type: 'lock',
          fw: true,
        }}
      >
        {t('content_lock')}
      </LeftMenuButton>
      <ContentLockModal
        show={showModal}
        handleHide={() => setShowModal(false)}
      />
    </>
  )
}
