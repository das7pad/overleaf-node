import { lazy, memo } from 'react'
import { useDetachCompileContext as useCompileContext } from '../../../shared/context/detach-compile-context'
import { loadCss } from '../../../utils/loadCss'
import getMeta from '../../../utils/meta'

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
