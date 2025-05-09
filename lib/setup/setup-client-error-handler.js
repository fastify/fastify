const http = require('node:http')

/**
 * Sets up a clientError handler on the server.
 *
 * @param {import('../../fastify').FastifyInstance} fastify
 * @param {object} opts
 * @param {import('http').Server} opts.server
 * @param {import('../../fastify.js').FastifyServerOptions} opts.options
 */
function setupClientErrorHandler (fastify, opts) {
  const {
    server,
    options
  } = opts

  options.clientErrorHandler = options.clientErrorHandler || defaultClientErrorHandler

  // Delay configuring clientError handler so that it can access fastify state.
  server.on('clientError', options.clientErrorHandler.bind(fastify))

  function defaultClientErrorHandler (err, socket) {
    // In case of a connection reset, the socket has been destroyed and there is nothing that needs to be done.
    // https://nodejs.org/api/http.html#http_event_clienterror
    if (err.code === 'ECONNRESET' || socket.destroyed) {
      return
    }

    let body, errorCode, errorStatus, errorLabel

    if (err.code === 'ERR_HTTP_REQUEST_TIMEOUT') {
      errorCode = '408'
      errorStatus = http.STATUS_CODES[errorCode]
      body = `{"error":"${errorStatus}","message":"Client Timeout","statusCode":408}`
      errorLabel = 'timeout'
    } else if (err.code === 'HPE_HEADER_OVERFLOW') {
      errorCode = '431'
      errorStatus = http.STATUS_CODES[errorCode]
      body = `{"error":"${errorStatus}","message":"Exceeded maximum allowed HTTP header size","statusCode":431}`
      errorLabel = 'header_overflow'
    } else {
      errorCode = '400'
      errorStatus = http.STATUS_CODES[errorCode]
      body = `{"error":"${errorStatus}","message":"Client Error","statusCode":400}`
      errorLabel = 'error'
    }

    // Most devs do not know what to do with this error.
    // In the vast majority of cases, it's a network error and/or some
    // config issue on the load balancer side.
    this.log.trace({ err }, `client ${errorLabel}`)
    // Copying standard node behavior
    // https://github.com/nodejs/node/blob/6ca23d7846cb47e84fd344543e394e50938540be/lib/_http_server.js#L666

    // If the socket is not writable, there is no reason to try to send data.
    if (socket.writable) {
      socket.write(`HTTP/1.1 ${errorCode} ${errorStatus}\r\nContent-Length: ${body.length}\r\nContent-Type: application/json\r\n\r\n${body}`)
    }
    socket.destroy(err)
  }
}

module.exports = setupClientErrorHandler
