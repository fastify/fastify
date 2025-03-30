'use strict'

const http = require('node:http')
const https = require('node:https')
const dns = require('node:dns')
const os = require('node:os')

const { kState, kOptions, kServerBindings } = require('./symbols')
const { FSTWRN003 } = require('./warnings')
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
      if (cb.constructor.name === 'AsyncFunction') {
        FSTWRN003('listen method')
      }

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
    if (!Object.hasOwn(listenOptions, 'host') ||
      listenOptions.host == null) {
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

              if (!_ignoreErr) {
                this[kServerBindings].push(secondaryServer)
              }

              if (bound === binding) {
                // regardless of the error, we are done
                onListen()
              }
            }
          })

          const secondaryServer = getServerInstance(serverOpts, httpHandler)
          const closeSecondary = () => {
            // To avoid falling into situations where the close of the
            // secondary server is triggered before the preClose hook
            // is done running, we better wait until the main server is closed.
            // No new TCP connections are accepted
            // We swallow any error from the secondary server
            secondaryServer.close(() => {})
            if (typeof secondaryServer.closeAllConnections === 'function' && serverOpts.forceCloseConnections === true) {
              secondaryServer.closeAllConnections()
            }
          }

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
    server.removeListener('listening', wrap)
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
      server.once('listening', wrap)
      server.listen(listenOptions)
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
    let listeningEventHandler
    function cleanup () {
      server.removeListener('error', errEventHandler)
      server.removeListener('listening', listeningEventHandler)
    }
    const errEvent = new Promise((resolve, reject) => {
      errEventHandler = (err) => {
        cleanup()
        this[kState].listening = false
        reject(err)
      }
      server.once('error', errEventHandler)
    })
    const listeningEvent = new Promise((resolve, reject) => {
      listeningEventHandler = () => {
        cleanup()
        this[kState].listening = true
        resolve(logServerAddress.call(this, server, listenOptions.listenTextResolver || defaultResolveServerListeningText))
      }
      server.once('listening', listeningEventHandler)
    })

    server.listen(listenOptions)

    return Promise.race([
      errEvent, // e.g invalid port range error is always emitted before the server listening
      listeningEvent
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
/**
 * Inspects the provided `server.address` object and returns a
 * normalized list of IP address strings. Normalization in this
 * case refers to mapping wildcard `0.0.0.0` to the list of IP
 * addresses the wildcard refers to.
 *
 * @see https://nodejs.org/docs/latest/api/net.html#serveraddress
 *
 * @param {object} A server address object as described in the
 * linked docs.
 *
 * @returns {string[]}
 */
function getAddresses (address) {
  if (address.address === '0.0.0.0') {
    return Object.values(os.networkInterfaces()).flatMap((iface) => {
      return iface.filter((iface) => iface.family === 'IPv4')
    }).sort((iface) => {
      /* c8 ignore next 2 */
      // Order the interfaces so that internal ones come first
      return iface.internal ? -1 : 1
    }).map((iface) => { return iface.address })
  }
  return [address.address]
}

function logServerAddress (server, listenTextResolver) {
  let addresses
  const isUnixSocket = typeof server.address() === 'string'
  if (!isUnixSocket) {
    if (server.address().address.indexOf(':') === -1) {
      // IPv4
      addresses = getAddresses(server.address()).map((address) => address + ':' + server.address().port)
    } else {
      // IPv6
      addresses = ['[' + server.address().address + ']:' + server.address().port]
    }

    addresses = addresses.map((address) => ('http' + (this[kOptions].https ? 's' : '') + '://') + address)
  } else {
    addresses = [server.address()]
  }

  for (const address of addresses) {
    this.log.info(listenTextResolver(address))
  }
  return addresses[0]
}

function http2 () {
  try {
    return require('node:http2')
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
