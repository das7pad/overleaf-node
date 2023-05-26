const fs = require('fs')
const Path = require('path')
const pnpapi = require('pnpapi')

const FRONTEND_PATH = Path.join(__dirname, 'frontend')
const VENDOR_PATH = Path.join(__dirname, 'public', 'vendor')

const PATTERNS = []
  .concat(
    [
      // pdfjs worker
      'pdfjs-dist/build/pdf.worker.min.js',
      // Copy CMap files from pdfjs-dist package to build output.
      // These are used to provide support for non-Latin characters
      'pdfjs-dist/cmaps/',

      // lazy loaded ace files -- minified: keymaps, modes, themes, worker
      'ace-builds/src-min-noconflict/',
    ].map(path => {
      return { from: path, to: `${VENDOR_PATH}/${path}` }
    })
  )
  .concat(
    // Copy the required files for loading MathJax from MathJax NPM package
    [
      'extensions/a11y/',
      'extensions/HelpDialog.js',
      'fonts/HTML-CSS/TeX/woff/',
      'jax/output/HTML-CSS/autoload/',
      'jax/output/HTML-CSS/fonts/TeX/',
    ].map(path => {
      return {
        from: `mathjax/${path}`,
        to: `${VENDOR_PATH}/mathjax-2-7-9/${path}`,
      }
    })
  )
  .concat(
    [
      // open-in-overleaf
      'highlight.pack.js',
    ].map(path => {
      return {
        from: `${FRONTEND_PATH}/js/vendor/libs/${path}`,
        to: `${VENDOR_PATH}/${path}`,
      }
    })
  )
  .concat(
    [
      // open-in-overleaf
      'highlight-github.css',
    ].map(path => {
      return {
        from: `${FRONTEND_PATH}/stylesheets/vendor/${path}`,
        to: `${VENDOR_PATH}/stylesheets/${path}`,
      }
    })
  )
  .map(({ from, to }) => {
    if (!from.startsWith('/')) {
      const pkg = Path.dirname(from)
      from = Path.join(
        pnpapi.resolveToUnqualified(pkg, '.'),
        Path.relative(pkg, from)
      )
    }
    return { from, to }
  })

module.exports = { PATTERNS }

if (require.main === module) {
  for (const { from, to } of PATTERNS) {
    fs.cpSync(from, to, { recursive: true })
  }
}
