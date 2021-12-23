'use strict'

const { kState, kOptions } = require('./symbols')
const { FST_ERR_CREATE_SERVER_MISSING_OPTIONS, FST_ERR_CREATE_SERVER_MISSING_HTTP_HANDLER } = require('./errors')
const { FST_ERR_HTTP2_INVALID_VERSION, FST_ERR_REOPENED_CLOSE_SERVER, FST_ERR_REOPENED_SERVER } = require('./errors')

function createServer (options, httpHandler) {
  if (options == null) {
    throw new FST_ERR_CREATE_SERVER_MISSING_OPTIONS(typeof options)
  }

  if (httpHandler == null) {
    throw new FST_ERR_CREATE_SERVER_MISSING_HTTP_HANDLER(typeof httpHandler)
  }

  const server = getServerInstance(httpHandler, options)

  return { server, listen }

  // `this` is the Fastify object
  function listen () {
    const normalizeListenArgs = (args) => {
      const defaultHost = '127.0.0.1'
      if (args.length === 0) {
        return { port: 0, host: defaultHost }
      }

      const cb = typeof args[args.length - 1] === 'function' ? args.pop() : undefined
      const options = { cb: cb }

      const firstArg = args[0]
      const argsLength = args.length
      // This will listen to what localhost is.
      // It can be 127.0.0.1 or ::1, depending on the operating system.
      // Fixes https://github.com/fastify/fastify/issues/1022.
      // IPv4 by default
      const host = argsLength >= 2 && args[1] ? args[1] : defaultHost
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
        options.host = host
        options.backlog = argsLength >= 3 ? args[2] : undefined
      }

      return options
    }

    const bindedListen = _listen.bind(this)
    const listenOptions = normalizeListenArgs(Array.from(arguments))

    let secondHost
    let clonedOptions
    // TODO: Remove once finished
    process._rawDebug('Binding second host:', listenOptions.host === '127.0.0.1' || listenOptions.host === '::1')
    if (listenOptions.host === '127.0.0.1' || listenOptions.host === '::1') {
      clonedOptions = Object.assign({}, listenOptions, { host: '::1' })
      secondHost = getServerInstance(httpHandler, options)
    }

    // Main host
    bindedListen(server, listenOptions)

    // Secundary host
    if (secondHost != null) {
      bindedListen(secondHost, clonedOptions, true)
    }
  }

  // `this` is the Fastify object
  function _listen (httpServer, listenOptions, isBindingServer) {
    const cb = listenOptions.cb

    // TODO: Remove when finished
    process._rawDebug('Binding server to', listenOptions.host, listenOptions.port)

    const wrap = err => {
      httpServer.removeListener('error', wrap)
      if (!err) {
        const address = logServerAddress()
        cb(null, address)
      } else {
        this[kState].listening = isBindingServer ? this[kState].listening : false
        this[kState].bindingListening = isBindingServer ? false : this[kState].bindingListening
        cb(err, null)
      }
    }

    const listenPromise = (listenOptions, isBinding) => {
      process._rawDebug('Listening server to', listenOptions.host, listenOptions.port)

      if (this[kState].listening && this[kState].bindingListening && this[kState].closing) {
        return Promise.reject(new FST_ERR_REOPENED_CLOSE_SERVER())
      } else if (this[kState].listening && this[kState].bindingListening) {
        return Promise.reject(new FST_ERR_REOPENED_SERVER())
      }

      return this.ready().then(() => {
        let errEventHandler
        const errEvent = new Promise((resolve, reject) => {
          errEventHandler = (err) => {
            this[kState].listening = isBinding ? this[kState].listening : false
            this[kState].bindingListening = isBinding ? false : this[kState].bindingListening
            reject(err)
          }
          httpServer.once('error', errEventHandler)
        })
        const listen = new Promise((resolve, reject) => {
          httpServer.listen(listenOptions, () => {
            httpServer.removeListener('error', errEventHandler)
            resolve(logServerAddress())
          })
          // we set it afterwards because listen can throw
          // TODO: use kState instead
          this[kState].listening = isBinding ? this[kState].listening : true
          this[kState].bindingListening = isBinding ? true : this[kState].bindingListening
        })

        return Promise.race([
          errEvent, // e.g invalid port range error is always emitted before the server listening
          listen
        ])
      })
    }

    const logServerAddress = () => {
      let address = httpServer.address()
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

    if (cb === undefined) return listenPromise(listenOptions, isBindingServer)

    this.ready(err => {
      if (err != null) return cb(err)

      if (this[kState].listening && this[kState].bindingListening && this[kState].closing) {
        return cb(new FST_ERR_REOPENED_CLOSE_SERVER(), null)
      } else if (this[kState].listening && this[kState].bindingListening) {
        return cb(new FST_ERR_REOPENED_SERVER(), null)
      }

      httpServer.once('error', wrap)

      httpServer.listen(listenOptions, wrap)

      this[kState].listening = isBindingServer ? this[kState].listening : true
      this[kState].bindingListening = isBindingServer ? true : this[kState].bindingListening
    })
  }
}

function getServerInstance (httpHandler, serverOptions) {
  let server = null
  if (serverOptions.serverFactory) {
    server = serverOptions.serverFactory(httpHandler, serverOptions)
  } else if (serverOptions.http2) {
    server = http2(httpHandler, serverOptions.https)
    server.on('session', sessionTimeout(serverOptions.http2SessionTimeout))
  } else {
    // this is http1
    server = http(httpHandler, serverOptions.https)
    server.keepAliveTimeout = serverOptions.keepAliveTimeout
    server.requestTimeout = serverOptions.requestTimeout
    // we treat zero as null
    // and null is the default setting from nodejs
    // so we do not pass the option to server
    if (serverOptions.maxRequestsPerSocket > 0) {
      server.maxRequestsPerSocket = serverOptions.maxRequestsPerSocket
    }
  }

  if (!serverOptions.serverFactory) {
    server.setTimeout(serverOptions.connectionTimeout)
  }

  return server
}

function http (httpHandler, httpsOpts) {
  if (httpsOpts) {
    return require('https').createServer(httpsOpts, httpHandler)
  } else {
    return require('http').createServer(httpHandler)
  }
}

function http2 (httpHandler, httpsOpts) {
  try {
    if (httpsOpts) {
      return require('http2').createSecureServer(httpsOpts, httpHandler)
    } else {
      return require('http2').createServer(httpHandler)
    }
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
