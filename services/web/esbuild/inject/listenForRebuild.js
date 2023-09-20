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
  return getMetaElement('ol-staticPath').getAttribute('content') + p
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

const clientEpoch = Date.now()

function onEpoch({ data }) {
  const serverEpoch = parseInt(data, 10)
  if (clientEpoch < serverEpoch) {
    window.location.reload()
  }
}

function onRebuild({ data }) {
  const { name, errors, warnings, manifest } = JSON.parse(data)
  if (!name) return // initial manifest

  if (errors.length > 0) {
    console.group('esbuild rebuild failed:', name)
    for (const message of errors) {
      formatMessage('error', message)
    }
    for (const message of warnings) {
      formatMessage('warning', message)
    }
    console.groupEnd()
  } else {
    if (warnings.length > 0) {
      console.group('esbuild rebuild produced warnings:', name)
      for (const message of warnings) {
        formatMessage('warning', message)
      }
      console.groupEnd()
    }
    if (name === 'stylesheet bundles' && manifest) {
      replaceStylesheet(manifest)
    } else {
      window.location.reload()
    }
  }
}

function openNewBus() {
  const bus = new EventSource(import.meta.url + '/event-source')
  bus.addEventListener('epoch', onEpoch)
  bus.addEventListener('rebuild', onRebuild)
  bus.addEventListener('error', () => {
    bus.close()
    setTimeout(openNewBus, 1000)
  })
}
setTimeout(openNewBus, 1)

// Use a dummy export map for marking this file as ES6.
export {}
