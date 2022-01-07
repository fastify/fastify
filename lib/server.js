'use strict'

const http = require('http')
const https = require('https')
const dns = require('dns')

const { kState, kOptions } = require('./symbols')
const { FST_ERR_HTTP2_INVALID_VERSION, FST_ERR_REOPENED_CLOSE_SERVER, FST_ERR_REOPENED_SERVER } = require('./errors')

function createServer (options, httpHandler) {
  const server = getServerInstance(options, httpHandler)

  return { server, listen }

  // `this` is the Fastify object
  function listen () {
    const listenOptions = normalizeListenArgs(Array.from(arguments))
    const { cb, host } = listenOptions

    const onFailure = () => { this[kState].listening = false }
    const onListen = () => { this[kState].listening = true }

    if (host === 'localhost') {
      // TODO promise interface
      listenOptions.cb = (err, address) => {
        if (err) {
          // the server did not start
          // onFailure()
          cb(err, address)
          return
        }

        multipleBindings.call(this, server, httpHandler, options, listenOptions, () => {
          onListen()
          cb(null, address)
        })
      }
    }

    // https://github.com/nodejs/node/issues/9390
    // If listening to 'localhost', listen to both 127.0.0.1 or ::1 if they are available.
    // If listening to 127.0.0.1, only listen to 127.0.0.1.
    // If listening to ::1, only listen to ::1.

    if (cb === undefined) {
      return listenPromise.call(this, server, listenOptions, onListen, onFailure)
    }

    if (host === 'localhost') {
      this.ready(listenCallback.call(this, server, listenOptions))
    } else {
      this.ready(listenCallback.call(this, server, listenOptions, onListen, onFailure))
    }
  }
}

function multipleBindings (mainServer, httpHandler, serverOpts, listenOptions, onListen) {
  // let's check if we need to bind additional addresses
  dns.lookup(listenOptions.host, {
    family: 0,
    all: true
  }, (dnsErr, addresses) => {
    if (dnsErr) {
      // not blocking the main server listening
      // this.log.warn('dns.lookup error:', dnsErr)
      onListen()
      return
    }

    // in test files we are using unref 😱
    const originUnref = mainServer.unref
    mainServer.unref = function () {
      originUnref.call(mainServer)
      mainServer.emit('unref')
    }

    let binding = 0
    let binded = 0
    const alreadyBinded = mainServer.address().address
    for (const adr of addresses) {
      if (adr.address !== alreadyBinded) {
        // this.log.info('binding %s', adr.address)
        binding++
        const secondaryOpts = Object.assign({}, listenOptions, {
          isSecondary: true,
          host: adr.address,
          cb: (err) => {
            binded++

            if (err) {
              // this.log.warn(err, 'Fail listening to %s', secondaryOpts.host)
            }

            if (binded === binding) {
              // regardless of the error, we are done
              onListen()
            }
          }
        })

        const secondaryServer = getServerInstance(httpHandler, serverOpts)
        secondaryServer.isSecondary = true
        const closeSecondary = () => { secondaryServer.close(() => {}) }
        mainServer.on('unref', closeSecondary)
        mainServer.on('close', closeSecondary)
        mainServer.on('error', closeSecondary)
        listenCallback.call(this, secondaryServer, secondaryOpts)()
      }
    }

    // no extra bindings are necessary
    if (binding === 0) {
      onListen()
    }
  })
}

function listenCallback (server, listenOptions, onListen, onFailure) {
  const wrap = (err) => {
    server.removeListener('error', wrap)
    if (!err) {
      const address = logServerAddress.call(this, server)
      listenOptions.cb(null, address)
    } else {
      this[kState].listening = false
      listenOptions.cb(err, null)
    }
  }

  return (err) => {
    if (err != null) return listenOptions.cb(err)

    if (this[kState].listening && this[kState].closing) {
      return listenOptions.cb(new FST_ERR_REOPENED_CLOSE_SERVER(), null)
    } else if (this[kState].listening) {
      return listenOptions.cb(new FST_ERR_REOPENED_SERVER(), null)
    }

    server.once('error', wrap)
    server.listen(listenOptions, wrap)

    onListen && onListen()
  }
}

function listenPromise (server, listenOptions, onListen, onFailure) {
  if (this[kState].listening && this[kState].closing) {
    return Promise.reject(new FST_ERR_REOPENED_CLOSE_SERVER())
  } else if (this[kState].listening) {
    return Promise.reject(new FST_ERR_REOPENED_SERVER())
  }

  return this.ready().then(() => {
    let errEventHandler
    const errEvent = new Promise((resolve, reject) => {
      errEventHandler = (err) => {
        onFailure && onFailure()
        reject(err)
      }
      server.once('error', errEventHandler)
    })
    const listen = new Promise((resolve, reject) => {
      server.listen(listenOptions, () => {
        server.removeListener('error', errEventHandler)
        resolve(logServerAddress.call(this, server))
      })
      // we set it afterwards because listen can throw
      onListen && onListen()
    })

    return Promise.race([
      errEvent, // e.g invalid port range error is always emitted before the server listening
      listen
    ])
  })
}

function getServerInstance (options, httpHandler) {
  let server = null
  if (options.serverFactory) {
    server = options.serverFactory(httpHandler, options)
  } else if (options.http2) {
    if (options.https) {
      server = http2().createSecureServer(options.https, httpHandler)
    } else {
      server = http2().createServer(httpHandler)
    }
    server.on('session', sessionTimeout(options.http2SessionTimeout))
  } else {
    // this is http1
    if (options.https) {
      server = https.createServer(options.https, httpHandler)
    } else {
      server = http.createServer(httpHandler)
    }
    server.keepAliveTimeout = options.keepAliveTimeout
    server.requestTimeout = options.requestTimeout
    // we treat zero as null
    // and null is the default setting from nodejs
    // so we do not pass the option to server
    if (options.maxRequestsPerSocket > 0) {
      server.maxRequestsPerSocket = options.maxRequestsPerSocket
    }
  }

  if (!options.serverFactory) {
    server.setTimeout(options.connectionTimeout)
  }
  return server
}

function normalizeListenArgs (args) {
  if (args.length === 0) {
    return { port: 0, host: 'localhost' }
  }

  const cb = typeof args[args.length - 1] === 'function' ? args.pop() : undefined
  const options = { cb: cb }

  const firstArg = args[0]
  const argsLength = args.length
  const lastArg = args[argsLength - 1]
  /* Deal with listen (options) || (handle[, backlog]) */
  if (typeof firstArg === 'object' && firstArg !== null) {
    options.backlog = argsLength > 1 ? lastArg : undefined
    Object.assign(options, firstArg)
  } else if (typeof firstArg === 'string' && isNaN(firstArg)) {
    /* Deal with listen (pipe[, backlog]) */
    options.path = firstArg
    options.backlog = argsLength > 1 ? lastArg : undefined
  } else {
    /* Deal with listen ([port[, host[, backlog]]]) */
    options.port = argsLength >= 1 && firstArg ? firstArg : 0
    // This will listen to what localhost is.
    // It can be 127.0.0.1 or ::1, depending on the operating system.
    // Fixes https://github.com/fastify/fastify/issues/1022.
    options.host = argsLength >= 2 && args[1] ? args[1] : 'localhost'
    options.backlog = argsLength >= 3 ? args[2] : undefined
  }

  return options
}

function logServerAddress (server) {
  let address = server.address()
  const isUnixSocket = typeof address === 'string'
  /* istanbul ignore next */
  if (!isUnixSocket) {
    if (address.address.indexOf(':') === -1) {
      address = address.address + ':' + address.port
    } else {
      address = '[' + address.address + ']:' + address.port
    }
  }
  /* istanbul ignore next */
  address = (isUnixSocket ? '' : ('http' + (this[kOptions].https ? 's' : '') + '://')) + address

  if (server.isSecondary !== true) {
    this.log.info('Server listening at ' + address)
  }
  return address
}

function http2 () {
  try {
    return require('http2')
  } catch (err) {
    throw new FST_ERR_HTTP2_INVALID_VERSION()
  }
}

function sessionTimeout (timeout) {
  return function (session) {
    session.setTimeout(timeout, close)
  }
}

function close () {
  this.close()
}

module.exports = { createServer }
