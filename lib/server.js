'use strict'

const assert = require('assert')
const http = require('http')
const https = require('https')

const { kState, kOptions } = require('./symbols')
const {
  codes: { FST_ERR_HTTP2_INVALID_VERSION }
} = require('./errors')

function createServer (options, httpHandler) {
  assert(options, 'Missing options')
  assert(httpHandler, 'Missing http handler')

  var server = null
  if (options.serverFactory) {
    server = options.serverFactory(httpHandler, options)
  } else if (options.https) {
    if (options.http2) {
      server = http2().createSecureServer(options.https, httpHandler)
    } else {
      server = https.createServer(options.https, httpHandler)
    }
  } else if (options.http2) {
    server = http2().createServer(httpHandler)
  } else {
    server = http.createServer(httpHandler)
  }

  return { server, listen }

  // `this` is the Fastify object
  function listen (port, address, backlog, cb) {
    const wrap = err => {
      server.removeListener('error', wrap)
      if (!err) {
        address = logServerAddress()
        cb(null, address)
      } else {
        this[kState].listening = false
        cb(err, null)
      }
    }

    const listenPromise = (port, address, backlog) => {
      if (this[kState].listening) {
        return Promise.reject(new Error('Fastify is already listening'))
      }

      return this.ready().then(() => {
        var errEventHandler
        var errEvent = new Promise((resolve, reject) => {
          errEventHandler = (err) => {
            this[kState].listening = false
            reject(err)
          }
          server.once('error', errEventHandler)
        })
        var listen = new Promise((resolve, reject) => {
          server.listen(port, address, backlog, () => {
            server.removeListener('error', errEventHandler)
            resolve(logServerAddress())
          })
          // we set it afterwards because listen can throw
          this[kState].listening = true
        })

        return Promise.race([
          errEvent, // e.g invalid port range error is always emitted before the server listening
          listen
        ])
      })
    }

    const logServerAddress = () => {
      var address = server.address()
      const isUnixSocket = typeof address === 'string'
      if (!isUnixSocket) {
        if (address.address.indexOf(':') === -1) {
          address = address.address + ':' + address.port
        } else {
          address = '[' + address.address + ']:' + address.port
        }
      }
      address = (isUnixSocket ? '' : ('http' + (this[kOptions].https ? 's' : '') + '://')) + address
      this.log.info('Server listening at ' + address)
      return address
    }

    /* Deal with listen (cb) */
    if (typeof port === 'function') {
      cb = port
      port = 0
    }

    /* Deal with listen (port, cb) */
    if (typeof address === 'function') {
      cb = address
      address = undefined
    }

    // This will listen to what localhost is.
    // It can be 127.0.0.1 or ::1, depending on the operating system.
    // Fixes https://github.com/fastify/fastify/issues/1022.
    address = address || 'localhost'

    /* Deal with listen (port, address, cb) */
    if (typeof backlog === 'function') {
      cb = backlog
      backlog = undefined
    }

    if (cb === undefined) return listenPromise.call(this, port, address, backlog)

    this.ready(err => {
      if (err != null) return cb(err)

      if (this[kState].listening) {
        return cb(new Error('Fastify is already listening'), null)
      }

      server.once('error', wrap)
      if (backlog) {
        server.listen(port, address, backlog, wrap)
      } else {
        server.listen(port, address, wrap)
      }

      this[kState].listening = true
    })
  }
}

function http2 () {
  try {
    return require('http2')
  } catch (err) {
    throw new FST_ERR_HTTP2_INVALID_VERSION()
  }
}

module.exports = { createServer }
