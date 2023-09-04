'use strict'

const http = require('http')
const https = require('https')
const dns = require('dns')

const { kState, kOptions, kServerBindings } = require('./symbols')
const { onListenHookRunner } = require('./hooks')
const {
  FST_ERR_HTTP2_INVALID_VERSION,
  FST_ERR_REOPENED_CLOSE_SERVER,
  FST_ERR_REOPENED_SERVER,
  FST_ERR_LISTEN_OPTIONS_INVALID
} = require('./errors')

module.exports.createServer = createServer

function defaultResolveServerListeningText (address) {
  return `Server listening at ${address}`
}

function createServer (options, httpHandler) {
  const server = getServerInstance(options, httpHandler)

  // `this` is the Fastify object
  function listen (
    listenOptions = { port: 0, host: 'localhost' },
    cb = undefined
  ) {
    if (typeof cb === 'function') {
      listenOptions.cb = cb
    }
    if (listenOptions.signal) {
      if (typeof listenOptions.signal.on !== 'function' && typeof listenOptions.signal.addEventListener !== 'function') {
        throw new FST_ERR_LISTEN_OPTIONS_INVALID('Invalid options.signal')
      }

      if (listenOptions.signal.aborted) {
        this.close()
      } else {
        const onAborted = () => {
          this.close()
        }
        listenOptions.signal.addEventListener('abort', onAborted, { once: true })
      }
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
          onListenHookRunner(this)
        })
      }
    } else {
      listenOptions.cb = (err, address) => {
        // the server did not start
        if (err) {
          cb(err, address)
          return
        }
        this[kState].listening = true
        cb(null, address)
        onListenHookRunner(this)
      }
    }

    // https://github.com/nodejs/node/issues/9390
    // If listening to 'localhost', listen to both 127.0.0.1 or ::1 if they are available.
    // If listening to 127.0.0.1, only listen to 127.0.0.1.
    // If listening to ::1, only listen to ::1.

    if (cb === undefined) {
      const listening = listenPromise.call(this, server, listenOptions)
      /* istanbul ignore else */
      return listening.then(address => {
        return new Promise((resolve, reject) => {
          if (host === 'localhost') {
            multipleBindings.call(this, server, httpHandler, options, listenOptions, () => {
              this[kState].listening = true
              resolve(address)
              onListenHookRunner(this)
            })
          } else {
            resolve(address)
            onListenHookRunner(this)
          }
        })
      })
    }

    this.ready(listenCallback.call(this, server, listenOptions))
  }

  return { server, listen }
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

    const isMainServerListening = mainServer.listening && serverOpts.serverFactory

    let binding = 0
    let bound = 0
    if (!isMainServerListening) {
      const primaryAddress = mainServer.address()
      for (const adr of addresses) {
        if (adr.address !== primaryAddress.address) {
          binding++
          const secondaryOpts = Object.assign({}, listenOptions, {
            host: adr.address,
            port: primaryAddress.port,
            cb: (_ignoreErr) => {
              bound++

              /* istanbul ignore next: the else won't be taken unless listening fails */
              if (!_ignoreErr) {
                this[kServerBindings].push(secondaryServer)
                // Due to the nature of the feature is not possible to know
                // ahead of time the number of bindings that will be made.
                // For instance, each binding is hooked to be closed at their own
                // pace through the `onClose` hook.
                // It also allows them to handle possible connections already
                // attached to them if any.
                /* c8 ignore next 20 */
                this.onClose((instance, done) => {
                  if (instance[kState].listening) {
                    // No new TCP connections are accepted
                    // We swallow any error from the secondary
                    // server
                    secondaryServer.close(() => done())
                    if (serverOpts.forceCloseConnections === 'idle') {
                      // Not needed in Node 19
                      secondaryServer.closeIdleConnections()
                    } else if (typeof secondaryServer.closeAllConnections === 'function' && serverOpts.forceCloseConnections) {
                      secondaryServer.closeAllConnections()
                    }
                  } else {
                    done()
                  }
                })
              }

              if (bound === binding) {
                // regardless of the error, we are done
                onListen()
              }
            }
          })

          const secondaryServer = getServerInstance(serverOpts, httpHandler)
          const closeSecondary = () => { secondaryServer.close(() => { }) }
          secondaryServer.on('upgrade', mainServer.emit.bind(mainServer, 'upgrade'))
          mainServer.on('unref', closeSecondary)
          mainServer.on('close', closeSecondary)
          mainServer.on('error', closeSecondary)
          this[kState].listening = false
          listenCallback.call(this, secondaryServer, secondaryOpts)()
        }
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
    /* c8 ignore next 4 */
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
      const address = logServerAddress.call(this, server, listenOptions.listenTextResolver || defaultResolveServerListeningText)
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
    if (!this[kState].closing) {
      server.listen(listenOptions, wrap)
      this[kState].listening = true
    }
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
        resolve(logServerAddress.call(this, server, listenOptions.listenTextResolver || defaultResolveServerListeningText))
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

function getServerInstance (options, httpHandler) {
  let server = null
  // node@20 do not accepts options as boolean
  // we need to provide proper https option
  const httpsOptions = options.https === true ? {} : options.https
  if (options.serverFactory) {
    server = options.serverFactory(httpHandler, options)
  } else if (options.http2) {
    if (typeof httpsOptions === 'object') {
      server = http2().createSecureServer(httpsOptions, httpHandler)
    } else {
      server = http2().createServer(httpHandler)
    }
    server.on('session', sessionTimeout(options.http2SessionTimeout))
  } else {
    // this is http1
    if (httpsOptions) {
      server = https.createServer(httpsOptions, httpHandler)
    } else {
      server = http.createServer(options.http, httpHandler)
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

function logServerAddress (server, listenTextResolver) {
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

  const serverListeningText = listenTextResolver(address)
  this.log.info(serverListeningText)
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
