'use strict'

const {
  appendStackTrace,
  AVVIO_ERRORS_MAP,
  ...errorCodes
} = require('../errors.js')

const {
  FST_ERR_REOPENED_CLOSE_SERVER
} = errorCodes

const { kState } = require('../symbols.js')

let lightMyRequest

/**
 * @see {@link https://github.com/fastify/light-my-request}
 *
 * Leverage light-my-request package to injects a fake HTTP request/response
 * into Fastify for simulating server logic, writing tests, or debugging.
 *
 * Warning: if the server is not yet "ready", this utility will force
 * the server into the ready state.
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

module.exports = setupInject
