export const olDebugging = window.location.search.match(/debug=true/)
export const olConsole = olDebugging
  ? console
  : { error() {}, log() {}, warn() {} }

/* eslint-disable camelcase */
window.sl_debugging = olDebugging // make a global flag for debugging code
window.sl_console = olConsole
