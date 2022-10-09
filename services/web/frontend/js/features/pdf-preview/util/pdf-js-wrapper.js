/* global process */
import * as PDFJS from 'pdfjs-dist'
import * as PDFJSViewer from 'pdfjs-dist/web/pdf_viewer'
import { captureException } from '../../../infrastructure/error-reporter'
import { generatePdfCachingTransportFactory } from './pdf-caching-transport'
import staticPath from '../../../utils/staticPath'
import 'pdfjs-dist/web/pdf_viewer.css'

const params = new URLSearchParams(window.location.search)
const disableFontFace = params.get('disable-font-face') === 'true'
const disableStream = process.env.NODE_ENV !== 'test'

const DEFAULT_RANGE_CHUNK_SIZE = 128 * 1024 // 128K chunks

// Download worker from CDN
PDFJS.GlobalWorkerOptions.workerSrc = staticPath(
  '/vendor/pdfjs-dist/build/pdf.worker.min.js'
)

let worker
function getPDFJSWorker() {
  if (!worker && typeof window !== 'undefined' && 'Worker' in window) {
    worker = new PDFJS.PDFWorker()
  }
  return worker
}
// prefetch
setTimeout(getPDFJSWorker, 1)

export default class PDFJSWrapper {
  constructor(container) {
    this.container = container
  }

  async init() {
    this.genPdfCachingTransport = generatePdfCachingTransportFactory(PDFJS)
    this.PDFJS = PDFJS

    // create the event bus
    const eventBus = new PDFJSViewer.EventBus()

    // create the link service
    const linkService = new PDFJSViewer.PDFLinkService({
      eventBus,
      externalLinkTarget: 2,
      externalLinkRel: 'noopener',
    })

    // create the localization
    // const l10n = new PDFJSViewer.GenericL10n('en-GB') // TODO: locale mapping?

    // create the viewer
    const viewer = new PDFJSViewer.PDFViewer({
      container: this.container,
      eventBus,
      imageResourcesPath: staticPath('/vendor/pdfjs-dist/web/images/'),
      linkService,
      // l10n, // commented out since it currently breaks `aria-label` rendering in pdf pages
      enableScripting: false, // default is false, but set explicitly to be sure
      enableXfa: false, // default is false (2021-10-12), but set explicitly to be sure
      renderInteractiveForms: false,
      maxCanvasPixels: 8192 * 8192, // default is 4096 * 4096, increased for better resolution at high zoom levels
    })

    linkService.setViewer(viewer)

    this.eventBus = eventBus
    this.linkService = linkService
    this.viewer = viewer
  }

  // load a document from a URL
  loadDocument({ url, pdfFile, abortController, handleFetchError }) {
    // cancel any previous loading task
    if (this.loadDocumentTask) {
      this.loadDocumentTask.destroy()
      this.loadDocumentTask = undefined
    }

    return new Promise((resolve, reject) => {
      const rangeTransport = this.genPdfCachingTransport({
        url,
        pdfFile,
        abortController,
        handleFetchError,
      })
      let rangeChunkSize = DEFAULT_RANGE_CHUNK_SIZE
      if (rangeTransport && pdfFile.size < 2 * DEFAULT_RANGE_CHUNK_SIZE) {
        // pdf.js disables the "bulk" download optimization when providing a
        //  custom range transport. Restore it by bumping the chunk size.
        rangeChunkSize = pdfFile.size
      }
      this.loadDocumentTask = PDFJS.getDocument({
        url,
        cMapUrl: staticPath('/vendor/pdfjs-dist/cmaps/'),
        cMapPacked: true,
        standardFontDataUrl: staticPath('/vendor/pdfjs-dist/standard_fonts/'),
        disableFontFace,
        rangeChunkSize,
        disableAutoFetch: true,
        disableStream,
        textLayerMode: 2, // PDFJSViewer.TextLayerMode.ENABLE,
        range: rangeTransport,
        worker: getPDFJSWorker(),
      })

      this.loadDocumentTask.promise
        .then(doc => {
          if (!this.loadDocumentTask) {
            return // ignoring the response since loading task has been aborted
          }

          const previousDoc = this.viewer.pdfDocument

          this.viewer.setDocument(doc)
          this.linkService.setDocument(doc)
          resolve(doc)

          if (previousDoc) {
            previousDoc.cleanup().catch(console.error)
            previousDoc.destroy()
          }
        })
        .catch(error => {
          if (this.loadDocumentTask) {
            if (!error || error.name !== 'MissingPDFException') {
              captureException(error, {
                tags: { handler: 'pdf-preview' },
              })
            }

            reject(error)
          }
        })
        .finally(() => {
          this.loadDocumentTask = undefined
        })
    })
  }

  // update the current scale value if the container size changes
  updateOnResize() {
    if (!this.isVisible()) {
      return
    }

    const currentScaleValue = this.viewer.currentScaleValue

    if (
      currentScaleValue === 'auto' ||
      currentScaleValue === 'page-fit' ||
      currentScaleValue === 'page-width'
    ) {
      this.viewer.currentScaleValue = currentScaleValue
    }

    this.viewer.update()
  }

  // get the page and offset of a click event
  clickPosition(event, pageElement, textLayer) {
    const { viewport } = this.viewer.getPageView(textLayer.pageNumber - 1)

    const pageCanvas = pageElement.querySelector('canvas')

    if (!pageCanvas) {
      return
    }

    const pageRect = pageCanvas.getBoundingClientRect()

    const dx = event.clientX - pageRect.left
    const dy = event.clientY - pageRect.top

    const [left, top] = viewport.convertToPdfPoint(dx, dy)

    return {
      page: textLayer.pageNumber - 1,
      offset: {
        left,
        top: viewport.viewBox[3] - top,
      },
    }
  }

  // get the current page, offset and page size
  get currentPosition() {
    const pageIndex = this.viewer.currentPageNumber - 1
    const pageView = this.viewer.getPageView(pageIndex)
    const pageRect = pageView.div.getBoundingClientRect()

    const containerRect = this.container.getBoundingClientRect()
    const dy = containerRect.top - pageRect.top
    const dx = containerRect.left - pageRect.left
    const [left, top] = pageView.viewport.convertToPdfPoint(dx, dy)
    const [, , width, height] = pageView.viewport.viewBox

    return {
      page: pageIndex,
      offset: { top, left },
      pageSize: { height, width },
    }
  }

  scrollToPosition(position, scale = null) {
    const destArray = [
      null,
      {
        name: 'XYZ', // 'XYZ' = scroll to the given coordinates
      },
      position.offset.left,
      position.offset.top,
      scale,
    ]

    this.viewer.scrollPageIntoView({
      pageNumber: position.page + 1,
      destArray,
    })

    // scroll the page down by an extra few pixels to account for the pdf.js viewer page border
    this.viewer.container.scrollBy({
      top: -9,
    })
  }

  isVisible() {
    return this.viewer.container.offsetParent !== null
  }

  abortDocumentLoading() {
    this.loadDocumentTask = undefined
  }

  destroy() {
    if (this.loadDocumentTask) {
      this.loadDocumentTask.destroy()
      this.loadDocumentTask = undefined
    }
    if (this.viewer) {
      this.viewer.destroy()
    }
  }
}
