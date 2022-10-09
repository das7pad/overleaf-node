import { JSXElementConstructor, useCallback, useState } from 'react'

const contactUsModalModules = [] as Array<
  JSXElementConstructor<{
    show: boolean
    handleHide: () => void
  }>
>
const ContactUsModal = contactUsModalModules.pop()

export const useContactUsModal = () => {
  const [show, setShow] = useState(false)

  const hideModal = useCallback((event?: Event) => {
    event?.preventDefault()
    setShow(false)
  }, [])

  const showModal = useCallback((event?: Event) => {
    event?.preventDefault()
    setShow(true)
  }, [])

  const modal = ContactUsModal && (
    <ContactUsModal show={show} handleHide={hideModal} />
  )

  return { modal, hideModal, showModal }
}
