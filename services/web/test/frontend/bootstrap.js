// Load sinon-chai assertions so expect(stubFn).to.have.been.calledWith('abc')
// has a nicer failure messages
const chai = require('chai')
chai.use(require('sinon-chai'))
chai.use(require('chai-as-promised'))

// Mock global settings
function insertMeta(name, content) {
  const meta = document.createElement('meta')
  meta.name = name
  meta.content = content
  if (typeof content === 'boolean') {
    meta.setAttribute('data-type', 'boolean')
  }
  if (typeof content === 'object') {
    meta.setAttribute('data-type', 'json')
    meta.content = JSON.stringify(content)
  }
  if (typeof content === 'number') {
    meta.setAttribute('data-type', 'json')
  }
  document.head.appendChild(meta)
}
function _buildFakeJWT(payload = {}) {
  return (
    'header.' +
    window.btoa(
      JSON.stringify({
        exp: Date.now() / 1000 + 1337 * 42,
        ...payload,
      })
    ) +
    '.hmac'
  )
}

insertMeta('ol-disable-event-tracking', true)
insertMeta('ol-preventCompileOnBoot', true)
insertMeta('ol-jwtLoggedInUser', _buildFakeJWT())
insertMeta('ol-jwtCompile', _buildFakeJWT())
insertMeta('ol-appName', 'Overleaf')
insertMeta('ol-maxEntitiesPerProject', 10)
insertMeta('ol-maxUploadSize', 5 * 1024 * 1024)
insertMeta('ol-siteURL', 'https://www.dev-overleaf.com')
insertMeta('ol-textExtensions', [
  'tex',
  'latex',
  'sty',
  'cls',
  'bst',
  'bib',
  'bibtex',
  'txt',
  'tikz',
  'mtx',
  'rtex',
  'md',
  'asy',
  'latexmkrc',
  'lbx',
  'bbx',
  'cbx',
  'm',
  'lco',
  'dtx',
  'ins',
  'ist',
  'def',
  'clo',
  'ldf',
  'rmd',
  'lua',
  'gv',
  'mf',
])

const moment = require('moment')
moment.updateLocale('en', {
  calendar: {
    lastDay: '[Yesterday]',
    sameDay: '[Today]',
    nextDay: '[Tomorrow]',
    lastWeek: 'ddd, Do MMM YY',
    nextWeek: 'ddd, Do MMM YY',
    sameElse: 'ddd, Do MMM YY',
  },
})

// fallback
navigator.sendBeacon = () => {}

// workaround for missing keys in jsdom-global's keys.js
globalThis.AbortController = global.AbortController = window.AbortController
globalThis.MutationObserver = global.MutationObserver = window.MutationObserver
globalThis.StorageEvent = global.StorageEvent = window.StorageEvent
globalThis.SVGElement = global.SVGElement = window.SVGElement
globalThis.localStorage = global.localStorage = window.localStorage
globalThis.performance = global.performance = window.performance
globalThis.cancelAnimationFrame = global.cancelAnimationFrame =
  window.cancelAnimationFrame
globalThis.requestAnimationFrame = global.requestAnimationFrame =
  window.requestAnimationFrame
globalThis.sessionStorage = global.sessionStorage = window.sessionStorage

// add polyfill for ResizeObserver
globalThis.ResizeObserver =
  global.ResizeObserver =
  window.ResizeObserver =
    require('@juggle/resize-observer').ResizeObserver

// node-fetch doesn't accept relative URL's: https://github.com/node-fetch/node-fetch/blob/master/docs/v2-LIMITS.md#known-differences
const fetch = require('node-fetch')
globalThis.Headers = fetch.Headers
globalThis.fetch =
  global.fetch =
  window.fetch =
    (url, ...options) => fetch(new URL(url, 'http://localhost'), ...options)

// Work around bundler hack in react-dom
// esbuild does not populate the obfuscated require call when bundling.
// https://github.com/facebook/react/blob/f04bcb8139cfa341640ea875c2eae15523ae9cd9/packages/shared/enqueueTask.js#L14-L47
const { MessageChannel } = require('worker_threads')
global.MessageChannel = MessageChannel
