const Path = require('path')
const esbuild = require('esbuild')
const { notifyFrontendAboutRebuild } = require('./autoReload')
const { CONFIGS, inflateConfig } = require('./configs')
const { trackOutput } = require('./inMemory')
const { logWithTimestamp, trackDurationInMS } = require('./utils')
const { extendManifest, writeManifest } = require('./manifest')

const ROOT = Path.dirname(__dirname)

async function onRebuild(name, error, result) {
  if (error) {
    logWithTimestamp('watch build failed.')
    notifyFrontendAboutRebuild(name, error, result)
    return
  }
  logWithTimestamp('watch build succeeded.')

  trackOutput(name, result.outputFiles)
  try {
    extendManifest(result.metafile)
  } catch (error) {
    logWithTimestamp('writing manifest failed in watch mode:', error)
  }
  notifyFrontendAboutRebuild(name, error, result)
}

async function buildConfig({ isWatchMode, inMemory, autoReload }, cfg) {
  cfg = inflateConfig(cfg)
  const { DESCRIPTION } = cfg
  delete cfg.DESCRIPTION

  if (isWatchMode) {
    cfg.watch = {
      async onRebuild(error, result) {
        await onRebuild(DESCRIPTION, error, result)
      },
    }
  }
  if (inMemory) {
    cfg.write = false
  }
  if (
    autoReload &&
    (DESCRIPTION === 'main bundles' || DESCRIPTION === 'marketing bundles')
  ) {
    cfg.inject.push(Path.join(ROOT, 'esbuild/inject/listenForRebuild.js'))
  }

  const done = trackDurationInMS()
  const { metafile, outputFiles } = await esbuild.build(cfg)
  const duration = done()

  trackOutput(DESCRIPTION, outputFiles)
  extendManifest(metafile)
  return { DESCRIPTION, duration }
}

async function buildAllConfigs(options) {
  const done = trackDurationInMS()
  const timings = await Promise.all(
    CONFIGS.map(cfg => buildConfig(options, cfg))
  )
  if (!options.inMemory) await writeManifest()
  const duration = done()
  timings.push({ DESCRIPTION: 'total', duration })
  return timings
}

module.exports = {
  buildAllConfigs,
}
