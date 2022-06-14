'use strict'

const http = require('http')
const https = require('https')
const dns = require('dns')

const warnings = require('./warnings')
const { kState, kOptions, kServerBindings } = require('./symbols')
const { FST_ERR_HTTP2_INVALID_VERSION, FST_ERR_REOPENED_CLOSE_SERVER, FST_ERR_REOPENED_SERVER } = require('./errors')

module.exports.createServer = createServer
module.exports.compileValidateHTTPVersion = compileValidateHTTPVersion

function createServer (options, httpHandler) {
  const server = getServerInstance(options, httpHandler)

  return { server, listen }

  // `this` is the Fastify object
  function listen (listenOptions, ...args) {
    let cb = args.slice(-1).pop()
    // When the variadic signature deprecation is complete, the function
    // declaration should become:
    //   function listen (listenOptions = { port: 0, host: 'localhost' }, cb = undefined)
    // Upon doing so, the `normalizeListenArgs` function is no longer needed,
    // and all of this preamble to feed it correctly also no longer needed.
    const firstArgType = Object.prototype.toString.call(arguments[0])
    if (arguments.length === 0) {
      listenOptions = normalizeListenArgs([])
    } else if (arguments.length > 0 && (firstArgType !== '[object Object]' && firstArgType !== '[object Function]')) {
      warnings.emit('FSTDEP011')
      listenOptions = normalizeListenArgs(Array.from(arguments))
      cb = listenOptions.cb
    } else if (args.length > 1) {
      // `.listen(obj, a, ..., n, callback )`
      warnings.emit('FSTDEP011')
      // Deal with `.listen(port, host, backlog, [cb])`
      const hostPath = listenOptions.path ? [listenOptions.path] : [listenOptions.port ?? 0, listenOptions.host ?? 'localhost']
      Object.assign(listenOptions, normalizeListenArgs([...hostPath, ...args]))
    } else {
      listenOptions.cb = cb
    }

    // If we have a path specified, don't default host to 'localhost' so we don't end up listening
    // on both path and host
    // See https://github.com/fastify/fastify/issues/4007
    let host
    if (listenOptions.path == null) {
      host = listenOptions.host ?? 'localhost'
    } else {
      host = listenOptions.host
    }
    if (Object.prototype.hasOwnProperty.call(listenOptions, 'host') === false) {
      listenOptions.host = host
    }

    if (host === 'localhost') {
      listenOptions.cb = (err, address) => {
        if (err) {
          // the server did not start
          cb(err, address)
          return
        }

        multipleBindings.call(this, server, httpHandler, options, listenOptions, () => {
          this[kState].listening = true
          cb(null, address)
        })
      }
    }

    // https://github.com/nodejs/node/issues/9390
    // If listening to 'localhost', listen to both 127.0.0.1 or ::1 if they are available.
    // If listening to 127.0.0.1, only listen to 127.0.0.1.
    // If listening to ::1, only listen to ::1.

    if (cb === undefined) {
      const listening = listenPromise.call(this, server, listenOptions)
      /* istanbul ignore else */
      if (host === 'localhost') {
        return listening.then(address => {
          return new Promise((resolve, reject) => {
            multipleBindings.call(this, server, httpHandler, options, listenOptions, () => {
              this[kState].listening = true
              resolve(address)
            })
          })
        })
      }
      return listening
    }

    this.ready(listenCallback.call(this, server, listenOptions))
  }
}

function multipleBindings (mainServer, httpHandler, serverOpts, listenOptions, onListen) {
  // the main server is started, we need to start the secondary servers
  this[kState].listening = false

  // let's check if we need to bind additional addresses
  dns.lookup(listenOptions.host, { all: true }, (dnsErr, addresses) => {
    if (dnsErr) {
      // not blocking the main server listening
      // this.log.warn('dns.lookup error:', dnsErr)
      onListen()
      return
    }

    let binding = 0
    let binded = 0
    const primaryAddress = mainServer.address()
    for (const adr of addresses) {
      if (adr.address !== primaryAddress.address) {
        binding++
        const secondaryOpts = Object.assign({}, listenOptions, {
          host: adr.address,
          port: primaryAddress.port,
          cb: (_ignoreErr) => {
            binded++

            if (!_ignoreErr) {
              this[kServerBindings].push(secondaryServer)
            }

            if (binded === binding) {
              // regardless of the error, we are done
              onListen()
            }
          }
        })

        const secondaryServer = getServerInstance(serverOpts, httpHandler)
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
      return
    }

    // in test files we are using unref so we need to propagate the unref event
    // to the secondary servers. It is valid only when the user is
    // listening on localhost
    const originUnref = mainServer.unref
    /* istanbul ignore next */
    mainServer.unref = function () {
      originUnref.call(mainServer)
      mainServer.emit('unref')
    }
  })
}

function listenCallback (server, listenOptions) {
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

    this[kState].listening = true
  }
}

function listenPromise (server, listenOptions) {
  if (this[kState].listening && this[kState].closing) {
    return Promise.reject(new FST_ERR_REOPENED_CLOSE_SERVER())
  } else if (this[kState].listening) {
    return Promise.reject(new FST_ERR_REOPENED_SERVER())
  }

  return this.ready().then(() => {
    let errEventHandler
    const errEvent = new Promise((resolve, reject) => {
      errEventHandler = (err) => {
        this[kState].listening = false
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
      this[kState].listening = true
    })

    return Promise.race([
      errEvent, // e.g invalid port range error is always emitted before the server listening
      listen
    ])
  })
}

/**
 * Creates a function that, based upon initial configuration, will
 * verify that every incoming request conforms to allowed
 * HTTP versions for the Fastify instance, e.g. a Fastify HTTP/1.1
 * server will not serve HTTP/2 requests upon the result of the
 * verification function.
 *
 * @param {object} options fastify option
 * @param {function} [options.serverFactory] If present, the
 * validator function will skip all checks.
 * @param {boolean} [options.http2 = false] If true, the validator
 * function will allow HTTP/2 requests.
 * @param {object} [options.https = null] https server options
 * @param {boolean} [options.https.allowHTTP1] If true and use
 * with options.http2 the validator function will allow HTTP/1
 * request to http2 server.
 *
 * @returns {function} HTTP version validator function.
 */
function compileValidateHTTPVersion (options) {
  let bypass = false
  // key-value map to store valid http version
  const map = new Map()
  if (options.serverFactory) {
    // When serverFactory is passed, we cannot identify how to check http version reliably
    // So, we should skip the http version check
    bypass = true
  }
  if (options.http2) {
    // HTTP2 must serve HTTP/2.0
    map.set('2.0', true)
    if (options.https && options.https.allowHTTP1 === true) {
      // HTTP2 with HTTPS.allowHTTP1 allow fallback to HTTP/1.1 and HTTP/1.0
      map.set('1.1', true)
      map.set('1.0', true)
    }
  } else {
    // HTTP must server HTTP/1.1 and HTTP/1.0
    map.set('1.1', true)
    map.set('1.0', true)
  }
  // The compiled function here placed in one of the hottest path inside fastify
  // the implementation here must be as performant as possible
  return function validateHTTPVersion (httpVersion) {
    // `bypass` skip the check when custom server factory provided
    // `httpVersion in obj` check for the valid http version we should support
    return bypass || map.has(httpVersion)
  }
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
  const options = { cb }

  const firstArg = args[0]
  const argsLength = args.length
  const lastArg = args[argsLength - 1]
  if (typeof firstArg === 'string' && isNaN(firstArg)) {
    /* Deal with listen (pipe[, backlog]) */
    options.path = firstArg
    options.backlog = argsLength > 1 ? lastArg : undefined
  } else {
    /* Deal with listen ([port[, host[, backlog]]]) */
    options.port = argsLength >= 1 && Number.isInteger(firstArg) ? firstArg : 0
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

  this.log.info('Server listening at ' + address)
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
