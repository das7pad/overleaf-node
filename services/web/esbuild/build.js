const Path = require('path')
const esbuild = require('esbuild')
const { CONFIGS, inflateConfig } = require('./configs')
const handleBuildResult = require('./plugins/handleBuildResult')
const { trackDurationInMS } = require('./utils')
const { writeManifest } = require('./manifest')

const ROOT = Path.dirname(__dirname)

async function buildConfig({ isWatchMode, inMemory, autoReload }, cfg) {
  cfg = inflateConfig(cfg)
  const { DESCRIPTION } = cfg
  delete cfg.DESCRIPTION

  if (!cfg.plugins) cfg.plugins = []
  cfg.plugins.push(handleBuildResult(DESCRIPTION))
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
  const ctx = await esbuild.context(cfg)
  if (isWatchMode) {
    ctx.watch()
  } else {
    await ctx.rebuild()
  }
  const duration = done()

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
