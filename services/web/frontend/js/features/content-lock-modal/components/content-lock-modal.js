import React from 'react'
import PropTypes from 'prop-types'
import ContentLockModalContent from './content-lock-modal-content'
import AccessibleModal from '../../../shared/components/accessible-modal'
import withErrorBoundary from '../../../infrastructure/error-boundary'

const ContentLockModal = React.memo(function ContentLockModal({
  show,
  handleHide,
}) {
  return (
    <AccessibleModal
      animation
      show={show}
      onHide={handleHide}
      id="content-lock-modal"
    >
      <ContentLockModalContent handleHide={handleHide} />
    </AccessibleModal>
  )
})

ContentLockModal.propTypes = {
  show: PropTypes.bool,
  handleHide: PropTypes.func.isRequired,
}

export default withErrorBoundary(ContentLockModal)
