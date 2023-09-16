const Path = require('path')
const esbuild = require('esbuild')
const valLoader = require('./plugins/valLoader')
const { MAIN_BUNDLES_CONFIG, inflateConfig } = require('./configs')

const ROOT = Path.dirname(__dirname)

async function buildTestBundle(entrypoint, platform, target) {
  const OUTPUT_PATH = Path.join('/tmp', 'web', 'testBundle', platform)
  const { define, jsx, tsconfig } = MAIN_BUNDLES_CONFIG
  const cfg = {
    entryNames: '[dir]/[name]',
    entryPoints: [entrypoint],
    plugins: [valLoader(Path.join(ROOT, 'test/frontend/allTests.js'))],
    outdir: OUTPUT_PATH,
    platform,
    target,
    define: Object.assign(
      {},
      define,
      process.env.FORCE_COLOR !== undefined
        ? { 'process.env.FORCE_COLOR': process.env.FORCE_COLOR }
        : {}
    ),
    jsx,
    tsconfig,
  }

  const instance = await esbuild.context(inflateConfig(cfg))
  try {
    await instance.rebuild()
  } catch (error) {
    console.error('esbuild error:', error)
    throw new Error(`esbuild failed: ${error.message}`)
  } finally {
    await instance.dispose()
  }
  return Path.join(OUTPUT_PATH, Path.basename(entrypoint))
}

async function buildTestBundleForNode(entrypoint) {
  // process.version is v prefixed -- e.g. v14.16.0
  const nodeVersion = process.version.slice(1)
  return buildTestBundle(entrypoint, 'node', `node${nodeVersion}`)
}

module.exports = {
  buildTestBundleForNode,
}
