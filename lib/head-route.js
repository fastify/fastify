'use strict'

const toString = Object.prototype.toString
const {
  FST_ERR_REP_RESPONSE_BODY_CONSUMED
} = require('./errors')

function headRouteOnSendHandler (req, reply, payload, done) {
  // If payload is undefined
  if (payload === undefined) {
    reply.header('content-length', '0')
    done(null, null)
    return
  }

  // web Response: the reply unwraps it after the onSend hooks have run, so
  // mirror the status and headers the GET route would send and continue with
  // its body
  if (payload !== null && typeof payload === 'object' && toString.call(payload) === '[object Response]') {
    if (typeof payload.status === 'number') {
      reply.code(payload.status)
    }

    if (payload.headers !== null && typeof payload.headers.forEach === 'function') {
      for (const [headerName, headerValue] of payload.headers) {
        reply.header(headerName, headerValue)
      }
    }

    if (payload.body !== null && payload.bodyUsed) {
      throw new FST_ERR_REP_RESPONSE_BODY_CONSUMED()
    }

    payload = payload.body
  }

  // a Response without a body is sent as an empty body, like the GET route
  if (payload === null || payload === undefined) {
    const statusCode = reply.raw.statusCode
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
