'use strict'

const { kOnAbort } = require('./symbols')

function setupRequestSignal (request, response, ac, onCleanup) {
  const raw = request.raw

  const onRequestClose = () => {
    if (raw.aborted) cleanup(true)
  }

  const onResponseClose = () => {
    cleanup(response.writableFinished === false)
  }

  function cleanup (abort = false) {
    raw.removeListener('close', onRequestClose)
    response.removeListener('close', onResponseClose)
    request[kOnAbort] = null
    if (onCleanup) onCleanup()
    if (abort && !ac.signal.aborted) ac.abort()
  }

  raw.on('close', onRequestClose)
  response.on('close', onResponseClose)
  request[kOnAbort] = cleanup

  if (raw.aborted || (response.destroyed && !response.writableFinished)) {
    cleanup(true)
  } else if (response.writableFinished) {
    cleanup()
  }
}

module.exports = { setupRequestSignal }
