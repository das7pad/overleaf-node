import PdfPreview from './pdf-preview'
import { ContextRoot } from '../../../shared/context/root-context'
import useWaitForI18n from '../../../shared/hooks/use-wait-for-i18n'

export default function PdfPreviewDetachedRoot() {
  const { isReady } = useWaitForI18n()

  if (!isReady) {
    return null
  }

  return (
    <ContextRoot>
      <PdfPreview />
    </ContextRoot>
  )
}
