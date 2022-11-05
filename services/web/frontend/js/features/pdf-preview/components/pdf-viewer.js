import { lazy, memo } from 'react'
import { useDetachCompileContext as useCompileContext } from '../../../shared/context/detach-compile-context'
import { loadCss, loadImage } from '../../../utils/loadAssets'
import getMeta from '../../../utils/meta'
import staticPath from '../../../utils/staticPath'
import shadowURL from 'pdfjs-dist/web/images/shadow.png'
import spinnerURL from 'pdfjs-dist/web/images/loading-icon.gif'

const PdfJsViewer = lazy(() =>
  import(/* webpackChunkName: "pdf-js-viewer" */ './pdf-js-viewer')
)

setTimeout(() => import('./pdf-js-viewer').catch(() => {}), 50)
setTimeout(
  () =>
    loadCss(
      getMeta('ol-pdf-js-viewer-css'),
      'cannot load pdf-js viewer style'
    ).catch(() => {}),
  1
)
setTimeout(() => {
  loadImage(staticPath(shadowURL), 'pdf-js shadow.png').catch(() => {})
  loadImage(staticPath(spinnerURL), 'pdf-js spinner').catch(() => {})
}, 100)

function PdfViewer() {
  const { pdfUrl, pdfFile, pdfViewer } = useCompileContext()

  if (!pdfUrl) {
    return null
  }

  switch (pdfViewer) {
    case 'native':
      return <iframe title="PDF Preview" src={pdfUrl} />

    case 'pdfjs':
    default:
      return <PdfJsViewer url={pdfUrl} pdfFile={pdfFile} />
  }
}

export default memo(PdfViewer)
