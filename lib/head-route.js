'use strict'

const { FST_ERR_REP_RESPONSE_BODY_CONSUMED } = require('./errors')

const toString = Object.prototype.toString

function headRouteOnSendHandler (req, reply, payload, done) {
  // If payload is undefined
  if (payload === undefined) {
    reply.header('content-length', '0')
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

  // web Response (https://developer.mozilla.org/en-US/docs/Web/API/Response)
  // A GET handler may return a Response, whose status and headers are applied
  // to the reply in reply.js when its body is unwrapped. For a HEAD request we
  // must apply them here and strip the body, otherwise Buffer.byteLength below
  // would throw on the Response object.
  if (typeof payload === 'object' && toString.call(payload) === '[object Response]') {
    // https://developer.mozilla.org/en-US/docs/Web/API/Response/status
    if (typeof payload.status === 'number') {
      reply.code(payload.status)
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/Response/headers
    if (typeof payload.headers === 'object' && typeof payload.headers.forEach === 'function') {
      for (const [headerName, headerValue] of payload.headers) {
        reply.header(headerName, headerValue)
      }
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/Response/body
    // The body is either null or a ReadableStream. Reject an already-consumed
    // body exactly as reply.js does for a GET, so HEAD does not silently
    // succeed where GET would fail; otherwise cancel the stream to release the
    // underlying resource, then send an empty body.
    if (payload.body !== null) {
      if (payload.bodyUsed) {
        throw new FST_ERR_REP_RESPONSE_BODY_CONSUMED()
      }
      if (typeof payload.body.cancel === 'function') {
        payload.body.cancel('Stream cancelled by HEAD route').catch((err) => {
          reply.log.error({ err }, 'Error on Stream found for HEAD route')
        })
      }
    }

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
