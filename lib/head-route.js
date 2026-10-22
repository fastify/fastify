'use strict'
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

  // web Response: mirror GET status/headers, drop the body
  if (typeof payload === 'object' && Object.prototype.toString.call(payload) === '[object Response]') {
    // No body, or a body GET could not send either (consumed/locked):
    // pass through so onSendEnd behaves exactly as for GET
    if (payload.body === null || payload.bodyUsed || payload.body.locked) {
      done(null, payload)
      return
    }
    payload.body.cancel('Stream cancelled by HEAD route').catch((err) => {
      reply.log.error({ err }, 'Error on Stream found for HEAD route')
    })
    done(null, new Response(null, { status: payload.status, headers: payload.headers }))
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
