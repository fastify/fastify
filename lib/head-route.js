'use strict'
function headRouteOnSendHandler (req, reply, payload, done) {
  // An onSend hook may clear the payload by replacing it with null, so a null
  // arrives here as well as an undefined.
  if (payload === undefined || payload === null) {
    // A 204, 304 or 1xx response carries no content-length, and `onSendEnd` in `lib/reply.js` sends
    // none for the GET response either, so setting one here would make the HEAD
    // response report a length the GET response does not.
    const statusCode = reply.statusCode
    if (statusCode >= 200 && statusCode !== 204 && statusCode !== 304) {
      reply.header('content-length', '0')
    }
    done(null, null)
    return
  }

  // node:stream
  if (typeof payload.resume === 'function') {
    payload.on('error', (err) => {
      reply.log.error({ err }, 'Error on Stream found for HEAD route')
    })
    payload.resume()
    done(null, null)
    return
  }

  // node:stream/web
  if (typeof payload.getReader === 'function') {
    payload.cancel('Stream cancelled by HEAD route').catch((err) => {
      reply.log.error({ err }, 'Error on Stream found for HEAD route')
    })
    done(null, null)
    return
  }

  const size = '' + Buffer.byteLength(payload)

  reply.header('content-length', size)

  done(null, null)
}

function parseHeadOnSendHandlers (onSendHandlers) {
  if (onSendHandlers == null) return headRouteOnSendHandler
  return Array.isArray(onSendHandlers)
    ? [...onSendHandlers, headRouteOnSendHandler]
    : [onSendHandlers, headRouteOnSendHandler]
}

module.exports = {
  parseHeadOnSendHandlers
}
