function formatMessage(prefix, message) {
  console.group(prefix, message.text)
  const { location } = message
  console.log('> %s:%d:%d', location.file, location.line, location.column)
  console.log('   %s | %s', location.line, location.lineText)
  const marker = location.length < 2 ? '^' : '~'.repeat(location.length)
  const bar = location.suggestion ? '|' : '╵'
  console.log(
    '   %s %s %s%s',
    ' '.repeat(location.line.toString().length),
    bar,
    ' '.repeat(location.column),
    marker
  )
  if (location.suggestion) {
    console.log(
      '   %s ╵ %s%s',
      ' '.repeat(location.line.toString().length),
      ' '.repeat(location.column),
      location.suggestion
    )
  }
  console.groupEnd()
}

function getMetaElement(name) {
  return document.querySelector(`meta[name="${name}"]`)
}

function staticPath(p = '') {
  const s = getMetaElement('ol-staticPath').getAttribute('content')
  return s.slice(0, -1) + p
}

function replaceStylesheet(manifest) {
  const oldLink = document.getElementById('main-stylesheet')
  const oldHref = oldLink.getAttribute('href')
  const isLightTheme = document.body.dataset.olThemeModifier === 'light-'
  const styleHref = staticPath(
    manifest.assets['frontend/stylesheets/style.less']
  )
  const lightStyleHref = staticPath(
    manifest.assets['frontend/stylesheets/light-style.less']
  )

  // update references for editor menu
  getMetaElement('ol-theme-default')?.setAttribute('content', styleHref)
  getMetaElement('ol-theme-light')?.setAttribute('content', lightStyleHref)

  const newHref = isLightTheme ? lightStyleHref : styleHref
  if (oldHref === newHref) return
  const newLink = oldLink.cloneNode()
  newLink.setAttribute('href', newHref)
  newLink.addEventListener('load', () => document.head.removeChild(oldLink))
  newLink.addEventListener('error', () => document.head.removeChild(newLink))
  document.head.appendChild(newLink)
}

function reloadOnChangeOfLoadedFiles(manifest) {
  const basePrefix = staticPath().length
  const wanted = []
    .concat(
      // javascript entrypoints
      Array.from(document.querySelectorAll('script[type="module"]')).map(el =>
        el.getAttribute('src')
      )
    )
    .concat(
      // secondary stylesheets
      Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .filter(el => el.getAttribute('id') !== 'main-stylesheet')
        .map(el => el.getAttribute('href'))
    )
    .map(p => p.slice(basePrefix))
  const filesInManifest = []
    .concat(Object.values(manifest.assets))
    .concat(Object.values(manifest.entrypointChunks).flat())
  for (const src of wanted) {
    // Vendored assets are not part of the manifest
    if (src.startsWith('/vendor/')) continue

    if (filesInManifest.includes(src)) continue

    console.debug(
      'Output file is not present in manifest anymore aka its input changed, reloading:',
      src
    )
    window.location.reload()
    break
  }
}

function onRebuild({ data }) {
  const { name, errors, warnings, manifest } = JSON.parse(data)

  if (errors.length > 0) {
    console.group('esbuild rebuild failed:', name)
    for (const message of errors) {
      formatMessage('error', message)
    }
    for (const message of warnings) {
      formatMessage('warning', message)
    }
    console.groupEnd()
  }
  if (warnings.length > 0) {
    console.group('esbuild rebuild produced warnings:', name)
    for (const message of warnings) {
      formatMessage('warning', message)
    }
    console.groupEnd()
  }

  replaceStylesheet(manifest)
  reloadOnChangeOfLoadedFiles(manifest)
}

function openNewBus() {
  const bus = new EventSource(staticPath('/event-source'))
  bus.addEventListener('rebuild', onRebuild)
  bus.addEventListener('error', () => {
    bus.close()
    setTimeout(openNewBus, 1000)
  })
}
setTimeout(openNewBus, 1)

// Use a dummy export map for marking this file as ES6.
export {}
