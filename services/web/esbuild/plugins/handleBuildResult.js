const { trackOutput } = require('../inMemory')
const { extendManifest } = require('../manifest')
const { notifyFrontendAboutRebuild } = require('../autoReload')
const { logWithTimestamp } = require('../utils')
module.exports = function handleBuildResult(name) {
  return {
    name: 'handleBuildResult',
    setup(build) {
      build.onEnd(result => {
        trackOutput(name, result.outputFiles)
        extendManifest(result.metafile)
        if (result.errors.length > 0) {
          logWithTimestamp(`esbuild: build ${name} failed.`)
        } else {
          logWithTimestamp(`esbuild: build ${name} succeeded.`)
        }
        notifyFrontendAboutRebuild(name, result)
      })
    },
  }
}
