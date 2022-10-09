/* Accumulate manifest artifacts from all incremental builds */
const fs = require('fs')
const Path = require('path')
const glob = require('glob')

const ROOT = Path.dirname(__dirname)
const assets = new Map(
  glob
    .sync(Path.join(ROOT, 'public', 'img', '**/*.*'))
    .map(p => [
      Path.relative(ROOT, p),
      '/' + Path.relative(Path.join(ROOT, 'public'), p),
    ])
)
const entrypointChunks = new Map()
const manifest = { assets, entrypointChunks }
const MANIFEST_PATH = Path.join(ROOT, 'public', 'manifest.json')

module.exports = { manifest, extendManifest, serializeManifest, writeManifest }
function extendManifest(meta) {
  if (!meta) return // some builds do not emit a metafile

  function pathInPublic(path) {
    return path.slice('public'.length)
  }
  Object.entries(meta.outputs)
    .filter(([, details]) => details.entryPoint)
    .forEach(([path, details]) => {
      const src = details.entryPoint

      // Load entrypoint individually
      assets.set(src, pathInPublic(path))

      // Load entrypoint with chunks
      entrypointChunks.set(
        src,
        details.imports
          .filter(item => item.kind === 'import-statement')
          .map(item => pathInPublic(item.path))
          .concat([pathInPublic(path)])
      )

      // Optionally provide access to extracted css
      if (details.cssBundle) {
        assets.set(src + '.css', pathInPublic(details.cssBundle))
      }
    })

  const assetFileTypes = ['.woff', '.woff2', '.png', '.svg', '.gif']
  Object.entries(meta.outputs)
    .filter(([path]) => assetFileTypes.some(ext => path.endsWith(ext)))
    .forEach(([path, details]) => {
      const src = Object.keys(details.inputs).pop()
      assets.set(src, pathInPublic(path))
    })
}

function serializeReproducible(key, value) {
  if (value instanceof Map) {
    // Cast Map to Object.
    value = Object.fromEntries(value.entries())
  }
  if (Array.isArray(value)) {
    // Sort entries for reproducible builds.
    return value.sort()
  }
  if (typeof value === 'object') {
    // Sort entries for reproducible builds.
    return Object.fromEntries(Object.entries(value).sort())
  }
  return value
}

function serializeManifest(space = 0) {
  return JSON.stringify(manifest, serializeReproducible, space)
}

async function writeManifest() {
  const tmpPath = MANIFEST_PATH + '~'
  const blob = serializeManifest(2)
  await fs.promises.writeFile(tmpPath, blob)
  await fs.promises.rename(tmpPath, MANIFEST_PATH)
}
