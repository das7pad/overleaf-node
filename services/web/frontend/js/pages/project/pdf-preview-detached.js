import '../../utils/meta'
import '../../infrastructure/error-reporter'
import ReactDOM from 'react-dom'
import PdfPreviewDetachedRoot from '../../features/pdf-preview/components/pdf-preview-detached-root'
import { waitForI18n } from 'react-i18next'

await waitForI18n

const element = document.getElementById('pdf-preview-detached-root')
if (element) {
  ReactDOM.render(<PdfPreviewDetachedRoot />, element)
}
