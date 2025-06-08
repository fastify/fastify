'use strict'

const http = require('node:http')
const Avvio = require('avvio')
const override = require('./pluginOverride.js')
const { kState, kAvvioBoot, kKeepAliveConnections } = require('./symbols.js')
const { hookRunnerApplication } = require('./hooks.js')
const {
  appendStackTrace,
  AVVIO_ERRORS_MAP,
  ...errorCodes
} = require('./errors.js')

const {
  FST_ERR_REOPENED_CLOSE_SERVER
} = errorCodes

/**
 * @see {@link https://github.com/fastify/avvio}
 *
 * Initializes and configures the Avvio package bootstrapping Fastify.
 * Avvio is responsible for loading plugins in the correct order and managing
 * plugin encapsulation.
 *
 * The following Fastify methods are overridden:
 * - register
 * - after
 * - ready
 * - onClose
 * - close
 *
 * @param {import('../fastify.js').FastifyInstance} fastify
 * @param {object} opts
 * @param {import('../fastify.js').FastifyServerOptions} opts.options
 * @param {object} opts.defaultInitOptions
 * @param {boolean|string} opts.forceCloseConnections
 * @param {boolean} opts.serverHasCloseAllConnections
 * @param {object} opts.router
 * @returns {object} The configured Avvio instance.
 */
function setupAvvio (fastify, opts) {
  const {
    options,
    defaultInitOptions,
    forceCloseConnections,
    serverHasCloseAllConnections,
    router
  } = opts

  const avvioPluginTimeout = Number(options.pluginTimeout)
  const avvio = Avvio(fastify, {
    autostart: false,
    timeout: isNaN(avvioPluginTimeout) === false ? avvioPluginTimeout : defaultInitOptions.pluginTimeout,
    expose: {
      use: 'register'
    }
  })

  /**
   * @see {@link https://github.com/fastify/avvio?tab=readme-ov-file#override}
   *
   * Allows overriding Fastify for each loading plugin.
   */
  avvio.override = override
  avvio.on('start', () => (fastify[kState].started = true))
  fastify[kAvvioBoot] = fastify.ready // the avvio ready function
  fastify.printPlugins = avvio.prettyPrint.bind(avvio)

  // cache the closing value, since we are checking it in an hot path
  avvio.once('preReady', () => {
    fastify.onClose((instance, done) => {
      fastify[kState].closing = true
      router.closeRoutes()

      hookRunnerApplication('preClose', fastify[kAvvioBoot], fastify, function () {
        if (fastify[kState].listening) {
          /* istanbul ignore next: Cannot test this without Node.js core support */
          if (forceCloseConnections === 'idle') {
            // Not needed in Node 19
            instance.server.closeIdleConnections()
            /* istanbul ignore next: Cannot test this without Node.js core support */
          } else if (serverHasCloseAllConnections && forceCloseConnections) {
            instance.server.closeAllConnections()
          } else if (forceCloseConnections === true) {
            for (const conn of fastify[kKeepAliveConnections]) {
              // We must invoke the destroy method instead of merely unreffing
              // the sockets. If we only unref, then the callback passed to
              // `fastify.close` will never be invoked; nor will any of the
              // registered `onClose` hooks.
              conn.destroy()
              fastify[kKeepAliveConnections].delete(conn)
            }
          }
        }

        // No new TCP connections are accepted.
        // We must call close on the server even if we are not listening
        // otherwise memory will be leaked.
        // https://github.com/nodejs/node/issues/48604
        if (!options.serverFactory || fastify[kState].listening) {
          instance.server.close(function (err) {
            /* c8 ignore next 6 */
            if (err && err.code !== 'ERR_SERVER_NOT_RUNNING') {
              done(null)
            } else {
              done()
            }
          })
        } else {
          process.nextTick(done, null)
        }
      })
    })
  })

  return avvio
}

/**
 * Sets up a clientError handler on the server.
 *
 * @param {import('../fastify').FastifyInstance} fastify
 * @param {object} opts
 * @param {import('http').Server} opts.server
 * @param {import('../fastify.js').FastifyServerOptions} opts.options
 * @returns {void}
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

let lightMyRequest
/**
 * @see {@link https://github.com/fastify/light-my-request}
 *
 * Leverage light-my-request package to injects a fake HTTP request/response
 * into Fastify for simulating server logic, writing tests, or debugging.
 *
 * Warning: if the server is not yet "ready", this utility will force
 * the server into the ready state.
 *
 * @param {import('../fastify').FastifyInstance} fastify
 * @param {import('../fastify.js').FastifyServerOptions} options
 * @returns {Function} The inject function
 */
function setupInject (fastify, options) {
  const {
    httpHandler
  } = options

  return function (opts, cb) {
    // lightMyRequest is dynamically loaded as it seems very expensive
    // because of Ajv
    if (lightMyRequest === undefined) {
      lightMyRequest = require('light-my-request')
    }

    if (fastify[kState].started) {
      if (fastify[kState].closing) {
        // Force to return an error
        const error = new FST_ERR_REOPENED_CLOSE_SERVER()
        if (cb) {
          cb(error)
          return
        } else {
          return Promise.reject(error)
        }
      }
      return lightMyRequest(httpHandler, opts, cb)
    }

    if (cb) {
      this.ready(err => {
        if (err) cb(err, null)
        else lightMyRequest(httpHandler, opts, cb)
      })
    } else {
      return lightMyRequest((req, res) => {
        this.ready(function (err) {
          if (err) {
            res.emit('error', err)
            return
          }
          httpHandler(req, res)
        })
      }, opts)
    }
  }
}

/**
 * Sets up the `.ready()` method that controls Fastify's boot lifecycle.
 * It ensures all onReady hooks are executed and returns a promise or accepts a callback.
 *
 * @param {import('../fastify.js').FastifyInstance} fastify
 * @returns {Function} The ready function
 */
function setupReady (fastify) {
  return function ready (cb) {
    if (this[kState].readyPromise !== null) {
      if (cb != null) {
        this[kState].readyPromise.then(() => cb(null, fastify), cb)
        return
      }

      return this[kState].readyPromise
    }

    let resolveReady
    let rejectReady

    // run the hooks after returning the promise
    process.nextTick(runHooks)

    // Create a promise no matter what
    // It will work as a barrier for all the .ready() calls (ensuring single hook execution)
    // as well as a flow control mechanism to chain cbs and further
    // promises
    this[kState].readyPromise = new Promise(function (resolve, reject) {
      resolveReady = resolve
      rejectReady = reject
    })

    if (!cb) {
      return this[kState].readyPromise
    } else {
      this[kState].readyPromise.then(() => cb(null, fastify), cb)
    }

    function runHooks () {
      // start loading
      fastify[kAvvioBoot]((err, done) => {
        if (err || fastify[kState].started || fastify[kState].ready || fastify[kState].booting) {
          handleReadyPromise(err)
        } else {
          fastify[kState].booting = true
          hookRunnerApplication('onReady', fastify[kAvvioBoot], fastify, handleReadyPromise)
        }
        done()
      })
    }

    function handleReadyPromise (err) {
      // If the error comes out of Avvio's Error codes
      // We create a make and preserve the previous error
      // as cause
      err = err != null && AVVIO_ERRORS_MAP[err.code] != null
        ? appendStackTrace(err, new AVVIO_ERRORS_MAP[err.code](err.message))
        : err

      if (err) {
        return rejectReady(err)
      }

      resolveReady(fastify)
      fastify[kState].booting = false
      fastify[kState].ready = true
      fastify[kState].readyPromise = null
    }
  }
}

module.exports = {
  setupAvvio,
  setupClientErrorHandler,
  setupInject,
  setupReady
}
