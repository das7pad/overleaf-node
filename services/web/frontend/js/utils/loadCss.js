import OError from '@overleaf/o-error'
import { captureException } from '../infrastructure/error-reporter'

export async function loadCss(href, msg) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('link')
    el.setAttribute('rel', 'stylesheet')
    el.setAttribute('href', href)
    el.onerror = (event, source, lineno, colno, error) => {
      const err = new OError(
        msg,
        { href },
        error || new Error('cannot load css')
      )
      captureException(err)
      reject(err)
    }
    el.onload = () => {
      resolve()
    }
    document.head.appendChild(el)
  })
}
