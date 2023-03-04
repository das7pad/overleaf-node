const { EventEmitter } = require('events')
const { serializeManifest } = require('./manifest')

const bus = new EventEmitter()
// Support up-to 1337 open browser tabs w/o triggering leak detection.
bus.setMaxListeners(1337)
const serverEpoch = Date.now()

async function handleEventSourceRequest(request, response) {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
  })
  response.flushHeaders()

  // Let client know about potential server restart.
  writeSSE(response, 'epoch', serverEpoch)
  emitManifest(request, response)

  function listener(blob) {
    writeSSE(response, 'rebuild', blob)
    emitManifest(request, response)
  }
  bus.on('rebuild', listener)
  request.on('aborted', () => {
    bus.off('rebuild', listener)
  })
}

function emitManifest(request, response) {
  if (!request.url.includes('manifest=true')) return
  writeSSE(response, 'manifest', serializeManifest(0))
}

function writeSSE(response, event, data) {
  response.write(`event: ${event}\n`)
  response.write(`data: ${data}\n`)
  response.write('\n\n')
}

function notifyFrontendAboutRebuild(name, result) {
  const { warnings, errors } = result
  const blob = JSON.stringify({
    name,
    errors,
    warnings,
  })
  bus.emit('rebuild', blob)
}

module.exports = {
  handleEventSourceRequest,
  notifyFrontendAboutRebuild,
}
