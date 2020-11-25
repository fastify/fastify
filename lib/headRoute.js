'use strict'
function headRouteOnSendHandler (req, reply, payload, done) {
  // If payload is undefined
  if (payload === undefined) {
    reply.header('content-length', '0')
    return done(null, null)
  }

  // If is a stream, we remove content-type header without appending
  // content-length one, and resume it right away
  if (typeof payload.resume === 'function') {
    reply.removeHeader('content-type')
    payload.resume()
    return done(null, null)
  }

  const size = '' + Buffer.byteLength(payload)

  reply.header('content-length', size)

  done(null, null)
}

function parseHeadOnSendHandlers (onSendHandlers) {
  if (onSendHandlers == null) return headRouteOnSendHandler
  return Array.isArray(onSendHandlers) ? [...onSendHandlers, headRouteOnSendHandler] : [onSendHandlers, headRouteOnSendHandler]
}

module.exports = {
  parseHeadOnSendHandlers
}
