const Path = require('path')
const esbuild = require('esbuild')
const valLoader = require('./plugins/valLoader')

const ROOT = Path.dirname(__dirname)

async function buildTestBundle(entrypoint, platform, target) {
  const OUTPUT_PATH = Path.join('/tmp', 'web', 'testBundle', platform)
  const cfg = {
    bundle: true,
    define: Object.assign(
      {
        'process.env.NODE_ENV': '"production"',
        // silence ad
        __REACT_DEVTOOLS_GLOBAL_HOOK__: '{ "isDisabled": true }',
      },
      // disable colors for xunit reporting in CI
      process.env.FORCE_COLOR !== undefined
        ? { 'process.env.FORCE_COLOR': process.env.FORCE_COLOR }
        : {},
      process.env.COLORS !== undefined
        ? { 'process.env.COLORS': process.env.COLORS }
        : {}
    ),
    entryNames: '[dir]/[name]',
    entryPoints: [entrypoint],
    jsx: 'automatic',
    loader: { '.js': 'jsx' },
    minifySyntax: true,
    minifyWhitespace: true,
    outdir: OUTPUT_PATH,
    platform,
    plugins: [valLoader(Path.join(ROOT, 'test/frontend/allTests.js'))],
    sourcemap: true,
    target,
    tsconfig: Path.join(ROOT, 'tsconfig.json'),
  }

  const instance = await esbuild.context(cfg)
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
