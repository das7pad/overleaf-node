import '../../utils/meta'
import '../../infrastructure/error-reporter'
import ReactDOM from 'react-dom'
import PdfPreviewDetachedRoot from '../../features/pdf-preview/components/pdf-preview-detached-root'

const element = document.getElementById('pdf-preview-detached-root')
if (element) {
  ReactDOM.render(<PdfPreviewDetachedRoot />, element)
}
