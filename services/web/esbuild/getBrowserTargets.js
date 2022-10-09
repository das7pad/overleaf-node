const browserslist = require('browserslist')

const supportedBrowserNames = ['chrome', 'firefox', 'safari', 'edge']

function isBrowserSupported(browserIdentifier) {
  return supportedBrowserNames.some(browserName => {
    return browserIdentifier.startsWith(browserName)
  })
}

const targets = []
for (const item of browserslist(['last 1 year'])) {
  if (!isBrowserSupported(item)) continue

  const [name, version] = item.split(' ')
  if (version.includes('-')) {
    const [a, b] = version.split('-')
    targets.push(`${name}${a}`)
    targets.push(`${name}${b}`)
  } else {
    targets.push(`${name}${version}`)
  }
}

module.exports = targets
