'use strict'

const { FST_ERR_REP_RESPONSE_BODY_CONSUMED } = require('./errors')

function headRouteOnSendHandler (req, reply, payload, done) {
  // web Response: mirror the status and headers the GET would send, then keep
  // going with its body so that it is released without being written out.
  // `reply.js` unwraps the Response after the onSend hooks have run, which is
  // never reached here because this hook replaces the payload.
  if (payload != null && typeof payload === 'object' && Object.prototype.toString.call(payload) === '[object Response]') {
    if (typeof payload.status === 'number') {
      reply.code(payload.status)
    }

    if (typeof payload.headers?.forEach === 'function') {
      payload.headers.forEach((value, name) => {
        reply.header(name, value)
      })
    }

    // Mirror the `reply.js` checks: a body that was already read cannot be
    // sent, not even for a HEAD request.
    if (payload.body !== null && payload.bodyUsed) {
      throw new FST_ERR_REP_RESPONSE_BODY_CONSUMED()
    }

    payload = payload.body
  }

  // If payload is undefined
  if (payload === undefined) {
    reply.header('content-length', '0')
    done(null, null)
    return
  }

  // A web Response without a body: the GET response carries no payload either,
  // so mirror the content-length that `reply.js` would set for it.
  if (payload === null) {
    const statusCode = reply.statusCode
    if (!reply.hasHeader('content-length') && statusCode >= 200 && statusCode !== 204 && statusCode !== 304) {
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
