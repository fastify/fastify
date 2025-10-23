'use strict'

const { FST_ERR_REOPENED_CLOSE_SERVER } = require('./errors')
const { kState } = require('./symbols')

let lightMyRequest

// HTTP injection handling
// If the server is not ready yet, this
// utility will automatically force it.
module.exports = function createInjectFunction (httpHandler) {
  return function inject (opts, cb) {
    // lightMyRequest is dynamically loaded as it seems very expensive
    // because of Ajv
    if (lightMyRequest === undefined) {
      lightMyRequest = require('light-my-request')
    }

    if (this[kState].started) {
      if (this[kState].closing) {
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
