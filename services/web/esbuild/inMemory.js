const fs = require('fs')
const Path = require('path')
const { PATTERNS } = require('../populatePublicVendor')
const { serializeManifest } = require('./manifest')

const PUBLIC_PATH = Path.join(Path.dirname(__dirname), 'public')

const CONTENT_TYPES = new Map([
  ['.js', 'application/javascript'],
  ['.css', 'text/css'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
])
const DEFAULT_CONTENT_TYPE = 'application/octet-stream'

const PUBLIC_CONTENT = new Map()
const VENDOR_CONTENT = new Map()
const CONTENT = new Map([
  ['public', [PUBLIC_CONTENT]],
  ['vendor', [VENDOR_CONTENT]],
])

function trackOutput(name, outputFiles) {
  if (!outputFiles) return
  const now = new Date().toUTCString()
  CONTENT.set(name, [
    new Map(outputFiles.map(({ path, contents }) => [path, [contents, now]])),
    // Keep the blobs of the last three builds around.
    ...(CONTENT.get(name) || []).slice(0, 3),
  ])
}

async function getContents(path) {
  if (path === PUBLIC_PATH + '/manifest.json') {
    return [serializeManifest(), new Date().toUTCString()]
  }
  for (const revisions of CONTENT.values()) {
    for (const outputFiles of revisions) {
      const contents = outputFiles.get(path)
      if (contents) return contents
    }
  }

  const pattern = PATTERNS.find(({ to }) => {
    return path.startsWith(to)
  })
  if (pattern) {
    const { from, to } = pattern
    const resolvedPath = Path.join(from, Path.relative(to, path))
    const buffer = await fs.promises.readFile(resolvedPath)
    const contents = [buffer, new Date().toUTCString()]
    VENDOR_CONTENT.set(path, contents)
    return contents
  }
  try {
    const buffer = await fs.promises.readFile(path)
    const contents = [buffer, new Date().toUTCString()]
    PUBLIC_CONTENT.set(path, contents)
    return contents
  } catch (e) {}
}

function getContentType(path) {
  return CONTENT_TYPES.get(Path.extname(path)) || DEFAULT_CONTENT_TYPE
}

function getPathFromURL(url) {
  // drop query flags
  const path = url.split('?')[0]
  // resolve /foo/../bar.js -> /bar.js and friends
  return Path.normalize(path)
}

async function handleRequest(request, response) {
  const path = getPathFromURL(request.url)
  if (path.includes('../')) {
    console.error('esbuild blocked parent folder access via %s', path)
    response.writeHead(403)
    response.end()
    return
  }
  let contents
  try {
    contents = await getContents(PUBLIC_PATH + path)
  } catch (error) {
    console.error('esbuild cannot serve static file at %s', path, error)
    response.writeHead(500)
    response.end()
    return
  }
  if (!contents) {
    console.error('esbuild cannot find static file for %s', path)
    response.writeHead(404)
    response.end()
    return
  }
  const [body, mTime] = contents
  if (request.headers['if-modified-since'] === mTime) {
    response.writeHead(304)
    response.end()
    return
  }
  response.writeHead(200, {
    'Content-Type': getContentType(path),
    Expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString(),
    'Last-Modified': mTime,
  })
  response.write(body)
  response.end()
}

module.exports = {
  handleRequest,
  trackOutput,
}
