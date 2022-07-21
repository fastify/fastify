'use strict'

const VERSION = '4.3.0'

const Avvio = require('avvio')
const http = require('http')
let lightMyRequest

const {
  kAvvioBoot,
  kChildren,
  kServerBindings,
  kBodyLimit,
  kRoutePrefix,
  kLogLevel,
  kLogSerializers,
  kHooks,
  kSchemaController,
  kRequestAcceptVersion,
  kReplySerializerDefault,
  kContentTypeParser,
  kReply,
  kRequest,
  kFourOhFour,
  kState,
  kOptions,
  kPluginNameChain,
  kSchemaErrorFormatter,
  kErrorHandler,
  kKeepAliveConnections,
  kFourOhFourContext
} = require('./lib/symbols.js')

const { createServer, compileValidateHTTPVersion } = require('./lib/server')
const Reply = require('./lib/reply')
const Request = require('./lib/request')
const supportedMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS']
const decorator = require('./lib/decorate')
const ContentTypeParser = require('./lib/contentTypeParser')
const SchemaController = require('./lib/schema-controller')
const { Hooks, hookRunnerApplication, supportedHooks } = require('./lib/hooks')
const { createLogger } = require('./lib/logger')
const pluginUtils = require('./lib/pluginUtils')
const reqIdGenFactory = require('./lib/reqIdGenFactory')
const { buildRouting, validateBodyLimitOption } = require('./lib/route')
const build404 = require('./lib/fourOhFour')
const getSecuredInitialConfig = require('./lib/initialConfigValidation')
const override = require('./lib/pluginOverride')
const warning = require('./lib/warnings')
const noopSet = require('./lib/noop-set')
const { defaultInitOptions } = getSecuredInitialConfig

const {
  FST_ERR_BAD_URL,
  FST_ERR_FORCE_CLOSE_CONNECTIONS_IDLE_NOT_AVAILABLE,
  AVVIO_ERRORS_MAP,
  appendStackTrace
} = require('./lib/errors')

const { buildErrorHandler } = require('./lib/error-handler.js')

const onBadUrlContext = {
  config: {
  },
  onSend: [],
  onError: [],
  [kFourOhFourContext]: null
}

function defaultBuildPrettyMeta (route) {
  // return a shallow copy of route's sanitized context

  const cleanKeys = {}
  const allowedProps = ['errorHandler', 'logLevel', 'logSerializers']

  allowedProps.concat(supportedHooks).forEach(k => {
    cleanKeys[k] = route.store[k]
  })

  return Object.assign({}, cleanKeys)
}

function fastify (options) {
  // Options validations
  options = options || {}

  if (typeof options !== 'object') {
    throw new TypeError('Options must be an object')
  }

  if (options.querystringParser && typeof options.querystringParser !== 'function') {
    throw new Error(`querystringParser option should be a function, instead got '${typeof options.querystringParser}'`)
  }

  if (options.schemaController && options.schemaController.bucket && typeof options.schemaController.bucket !== 'function') {
    throw new Error(`schemaController.bucket option should be a function, instead got '${typeof options.schemaController.bucket}'`)
  }

  validateBodyLimitOption(options.bodyLimit)

  const requestIdHeader = options.requestIdHeader || defaultInitOptions.requestIdHeader
  const genReqId = options.genReqId || reqIdGenFactory()
  const requestIdLogLabel = options.requestIdLogLabel || 'reqId'
  const bodyLimit = options.bodyLimit || defaultInitOptions.bodyLimit
  const disableRequestLogging = options.disableRequestLogging || false

  const ajvOptions = Object.assign({
    customOptions: {},
    plugins: []
  }, options.ajv)
  const frameworkErrors = options.frameworkErrors

  // Ajv options
  if (!ajvOptions.customOptions || Object.prototype.toString.call(ajvOptions.customOptions) !== '[object Object]') {
    throw new Error(`ajv.customOptions option should be an object, instead got '${typeof ajvOptions.customOptions}'`)
  }
  if (!ajvOptions.plugins || !Array.isArray(ajvOptions.plugins)) {
    throw new Error(`ajv.plugins option should be an array, instead got '${typeof ajvOptions.plugins}'`)
  }

  // Instance Fastify components
  const { logger, hasLogger } = createLogger(options)

  // Update the options with the fixed values
  options.connectionTimeout = options.connectionTimeout || defaultInitOptions.connectionTimeout
  options.keepAliveTimeout = options.keepAliveTimeout || defaultInitOptions.keepAliveTimeout
  options.maxRequestsPerSocket = options.maxRequestsPerSocket || defaultInitOptions.maxRequestsPerSocket
  options.requestTimeout = options.requestTimeout || defaultInitOptions.requestTimeout
  options.logger = logger
  options.genReqId = genReqId
  options.requestIdHeader = requestIdHeader
  options.requestIdLogLabel = requestIdLogLabel
  options.disableRequestLogging = disableRequestLogging
  options.ajv = ajvOptions
  options.clientErrorHandler = options.clientErrorHandler || defaultClientErrorHandler

  const initialConfig = getSecuredInitialConfig(options)

  // exposeHeadRoutes have its default set from the validator
  options.exposeHeadRoutes = initialConfig.exposeHeadRoutes

  let constraints = options.constraints
  if (options.versioning) {
    warning.emit('FSTDEP009')
    constraints = {
      ...constraints,
      version: {
        name: 'version',
        mustMatchWhenDerived: true,
        storage: options.versioning.storage,
        deriveConstraint: options.versioning.deriveVersion,
        validate (value) {
          if (typeof value !== 'string') {
            throw new Error('Version constraint should be a string.')
          }
        }
      }
    }
  }

  // Default router
  const router = buildRouting({
    config: {
      defaultRoute,
      onBadUrl,
      constraints,
      ignoreTrailingSlash: options.ignoreTrailingSlash || defaultInitOptions.ignoreTrailingSlash,
      ignoreDuplicateSlashes: options.ignoreDuplicateSlashes || defaultInitOptions.ignoreDuplicateSlashes,
      maxParamLength: options.maxParamLength || defaultInitOptions.maxParamLength,
      caseSensitive: options.caseSensitive,
      allowUnsafeRegex: options.allowUnsafeRegex || defaultInitOptions.allowUnsafeRegex,
      buildPrettyMeta: defaultBuildPrettyMeta,
      querystringParser: options.querystringParser
    }
  })

  // 404 router, used for handling encapsulated 404 handlers
  const fourOhFour = build404(options)

  // HTTP server and its handler
  const httpHandler = wrapRouting(router.routing, options)

  // we need to set this before calling createServer
  options.http2SessionTimeout = initialConfig.http2SessionTimeout
  const { server, listen } = createServer(options, httpHandler)

  const serverHasCloseAllConnections = typeof server.closeAllConnections === 'function'
  const serverHasCloseIdleConnections = typeof server.closeIdleConnections === 'function'

  let forceCloseConnections = options.forceCloseConnections
  if (forceCloseConnections === 'idle' && !serverHasCloseIdleConnections) {
    throw new FST_ERR_FORCE_CLOSE_CONNECTIONS_IDLE_NOT_AVAILABLE()
  } else if (typeof forceCloseConnections !== 'boolean') {
    /* istanbul ignore next: only one branch can be valid in a given Node.js version */
    forceCloseConnections = serverHasCloseIdleConnections ? 'idle' : false
  }

  const keepAliveConnections = !serverHasCloseAllConnections && forceCloseConnections === true ? new Set() : noopSet()

  const setupResponseListeners = Reply.setupResponseListeners
  const schemaController = SchemaController.buildSchemaController(null, options.schemaController)

  // Public API
  const fastify = {
    // Fastify internals
    [kState]: {
      listening: false,
      closing: false,
      started: false
    },
    [kKeepAliveConnections]: keepAliveConnections,
    [kOptions]: options,
    [kChildren]: [],
    [kServerBindings]: [],
    [kBodyLimit]: bodyLimit,
    [kRoutePrefix]: '',
    [kLogLevel]: '',
    [kLogSerializers]: null,
    [kHooks]: new Hooks(),
    [kSchemaController]: schemaController,
    [kSchemaErrorFormatter]: null,
    [kErrorHandler]: buildErrorHandler(),
    [kReplySerializerDefault]: null,
    [kContentTypeParser]: new ContentTypeParser(
      bodyLimit,
      (options.onProtoPoisoning || defaultInitOptions.onProtoPoisoning),
      (options.onConstructorPoisoning || defaultInitOptions.onConstructorPoisoning)
    ),
    [kReply]: Reply.buildReply(Reply),
    [kRequest]: Request.buildRequest(Request, options.trustProxy),
    [kFourOhFour]: fourOhFour,
    [pluginUtils.registeredPlugins]: [],
    [kPluginNameChain]: ['fastify'],
    [kAvvioBoot]: null,
    // routing method
    routing: httpHandler,
    getDefaultRoute: router.getDefaultRoute.bind(router),
    setDefaultRoute: router.setDefaultRoute.bind(router),
    // routes shorthand methods
    delete: function _delete (url, options, handler) {
      return router.prepareRoute.call(this, { method: 'DELETE', url, options, handler })
    },
    get: function _get (url, options, handler) {
      return router.prepareRoute.call(this, { method: 'GET', url, options, handler })
    },
    head: function _head (url, options, handler) {
      return router.prepareRoute.call(this, { method: 'HEAD', url, options, handler })
    },
    patch: function _patch (url, options, handler) {
      return router.prepareRoute.call(this, { method: 'PATCH', url, options, handler })
    },
    post: function _post (url, options, handler) {
      return router.prepareRoute.call(this, { method: 'POST', url, options, handler })
    },
    put: function _put (url, options, handler) {
      return router.prepareRoute.call(this, { method: 'PUT', url, options, handler })
    },
    options: function _options (url, options, handler) {
      return router.prepareRoute.call(this, { method: 'OPTIONS', url, options, handler })
    },
    all: function _all (url, options, handler) {
      return router.prepareRoute.call(this, { method: supportedMethods, url, options, handler })
    },
    // extended route
    route: function _route (options) {
      // we need the fastify object that we are producing so we apply a lazy loading of the function,
      // otherwise we should bind it after the declaration
      return router.route.call(this, { options })
    },
    // expose logger instance
    log: logger,
    // type provider
    withTypeProvider,
    // hooks
    addHook,
    // schemas
    addSchema,
    getSchema: schemaController.getSchema.bind(schemaController),
    getSchemas: schemaController.getSchemas.bind(schemaController),
    setValidatorCompiler,
    setSerializerCompiler,
    setSchemaController,
    setReplySerializer,
    setSchemaErrorFormatter,
    // custom parsers
    addContentTypeParser: ContentTypeParser.helpers.addContentTypeParser,
    hasContentTypeParser: ContentTypeParser.helpers.hasContentTypeParser,
    getDefaultJsonParser: ContentTypeParser.defaultParsers.getDefaultJsonParser,
    defaultTextParser: ContentTypeParser.defaultParsers.defaultTextParser,
    removeContentTypeParser: ContentTypeParser.helpers.removeContentTypeParser,
    removeAllContentTypeParsers: ContentTypeParser.helpers.removeAllContentTypeParsers,
    // Fastify architecture methods (initialized by Avvio)
    register: null,
    after: null,
    ready: null,
    onClose: null,
    close: null,
    printPlugins: null,
    hasPlugin: function (name) {
      return this[kPluginNameChain].includes(name)
    },
    // http server
    listen,
    server,
    addresses: function () {
      /* istanbul ignore next */
      const binded = this[kServerBindings].map(b => b.address())
      binded.push(this.server.address())
      return binded.filter(adr => adr)
    },
    // extend fastify objects
    decorate: decorator.add,
    hasDecorator: decorator.exist,
    decorateReply: decorator.decorateReply,
    decorateRequest: decorator.decorateRequest,
    hasRequestDecorator: decorator.existRequest,
    hasReplyDecorator: decorator.existReply,
    // fake http injection
    inject,
    // pretty print of the registered routes
    printRoutes,
    // custom error handling
    setNotFoundHandler,
    setErrorHandler,
    // Set fastify initial configuration options read-only object
    initialConfig,
    // constraint strategies
    addConstraintStrategy: router.addConstraintStrategy.bind(router),
    hasConstraintStrategy: router.hasConstraintStrategy.bind(router)
  }

  Object.defineProperties(fastify, {
    pluginName: {
      configurable: true,
      get () {
        if (this[kPluginNameChain].length > 1) {
          return this[kPluginNameChain].join(' -> ')
        }
        return this[kPluginNameChain][0]
      }
    },
    prefix: {
      configurable: true,
      get () { return this[kRoutePrefix] }
    },
    validatorCompiler: {
      configurable: true,
      get () { return this[kSchemaController].getValidatorCompiler() }
    },
    serializerCompiler: {
      configurable: true,
      get () { return this[kSchemaController].getSerializerCompiler() }
    },
    version: {
      configurable: true,
      get () { return VERSION }
    },
    errorHandler: {
      configurable: true,
      get () {
        return this[kErrorHandler].func
      }
    }
  })

  if (options.schemaErrorFormatter) {
    validateSchemaErrorFormatter(options.schemaErrorFormatter)
    fastify[kSchemaErrorFormatter] = options.schemaErrorFormatter.bind(fastify)
  }

  // Install and configure Avvio
  // Avvio will update the following Fastify methods:
  // - register
  // - after
  // - ready
  // - onClose
  // - close

  const avvioPluginTimeout = Number(options.pluginTimeout)
  const avvio = Avvio(fastify, {
    autostart: false,
    timeout: isNaN(avvioPluginTimeout) === false ? avvioPluginTimeout : defaultInitOptions.pluginTimeout,
    expose: {
      use: 'register'
    }
  })
  // Override to allow the plugin encapsulation
  avvio.override = override
  avvio.on('start', () => (fastify[kState].started = true))
  fastify[kAvvioBoot] = fastify.ready // the avvio ready function
  fastify.ready = ready // overwrite the avvio ready function
  fastify.printPlugins = avvio.prettyPrint.bind(avvio)

  // cache the closing value, since we are checking it in an hot path
  avvio.once('preReady', () => {
    fastify.onClose((instance, done) => {
      fastify[kState].closing = true
      router.closeRoutes()
      if (fastify[kState].listening) {
        // No new TCP connections are accepted
        instance.server.close(done)

        /* istanbul ignore next: Cannot test this without Node.js core support */
        if (forceCloseConnections === 'idle') {
          instance.server.closeIdleConnections()
        /* istanbul ignore next: Cannot test this without Node.js core support */
        } else if (serverHasCloseAllConnections && forceCloseConnections) {
          instance.server.closeAllConnections()
        } else {
          for (const conn of fastify[kKeepAliveConnections]) {
            // We must invoke the destroy method instead of merely unreffing
            // the sockets. If we only unref, then the callback passed to
            // `fastify.close` will never be invoked; nor will any of the
            // registered `onClose` hooks.
            conn.destroy()
            fastify[kKeepAliveConnections].delete(conn)
          }
        }
      } else {
        done(null)
      }
    })
  })

  // Set the default 404 handler
  fastify.setNotFoundHandler()
  fourOhFour.arrange404(fastify)

  router.setup(options, {
    avvio,
    fourOhFour,
    logger,
    hasLogger,
    setupResponseListeners,
    throwIfAlreadyStarted,
    validateHTTPVersion: compileValidateHTTPVersion(options),
    keepAliveConnections
  })

  // Delay configuring clientError handler so that it can access fastify state.
  server.on('clientError', options.clientErrorHandler.bind(fastify))

  try {
    const dc = require('diagnostics_channel')
    const initChannel = dc.channel('fastify.initialization')
    if (initChannel.hasSubscribers) {
      initChannel.publish({ fastify })
    }
  } catch (e) {
    // This only happens if `diagnostics_channel` isn't available, i.e. earlier
    // versions of Node.js. In that event, we don't care, so ignore the error.
  }

  return fastify

  function throwIfAlreadyStarted (msg) {
    if (fastify[kState].started) throw new Error(msg)
  }

  // HTTP injection handling
  // If the server is not ready yet, this
  // utility will automatically force it.
  function inject (opts, cb) {
    // lightMyRequest is dynamically loaded as it seems very expensive
    // because of Ajv
    if (lightMyRequest === undefined) {
      lightMyRequest = require('light-my-request')
    }

    if (fastify[kState].started) {
      if (fastify[kState].closing) {
        // Force to return an error
        const error = new Error('Server is closed')
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

  function ready (cb) {
    let resolveReady
    let rejectReady

    // run the hooks after returning the promise
    process.nextTick(runHooks)

    if (!cb) {
      return new Promise(function (resolve, reject) {
        resolveReady = resolve
        rejectReady = reject
      })
    }

    function runHooks () {
      // start loading
      fastify[kAvvioBoot]((err, done) => {
        if (err || fastify[kState].started) {
          manageErr(err)
        } else {
          hookRunnerApplication('onReady', fastify[kAvvioBoot], fastify, manageErr)
        }
        done()
      })
    }

    function manageErr (err) {
      // If the error comes out of Avvio's Error codes
      // We create a make and preserve the previous error
      // as cause
      err = err != null && AVVIO_ERRORS_MAP[err.code] != null
        ? appendStackTrace(err, new AVVIO_ERRORS_MAP[err.code](err.message))
        : err

      if (cb) {
        if (err) {
          cb(err)
        } else {
          cb(undefined, fastify)
        }
      } else {
        if (err) {
          return rejectReady(err)
        }
        resolveReady(fastify)
      }
    }
  }

  // Used exclusively in TypeScript contexts to enable auto type inference from JSON schema.
  function withTypeProvider () {
    return this
  }

  // wrapper that we expose to the user for hooks handling
  function addHook (name, fn) {
    throwIfAlreadyStarted('Cannot call "addHook" when fastify instance is already started!')

    if (name === 'onSend' || name === 'preSerialization' || name === 'onError' || name === 'preParsing') {
      if (fn.constructor.name === 'AsyncFunction' && fn.length === 4) {
        throw new Error('Async function has too many arguments. Async hooks should not use the \'done\' argument.')
      }
    } else if (name === 'onReady') {
      if (fn.constructor.name === 'AsyncFunction' && fn.length !== 0) {
        throw new Error('Async function has too many arguments. Async hooks should not use the \'done\' argument.')
      }
    } else {
      if (fn.constructor.name === 'AsyncFunction' && fn.length === 3) {
        throw new Error('Async function has too many arguments. Async hooks should not use the \'done\' argument.')
      }
    }

    if (name === 'onClose') {
      this.onClose(fn)
    } else if (name === 'onReady') {
      this[kHooks].add(name, fn)
    } else if (name === 'onRoute') {
      this[kHooks].validate(name, fn)
      this[kHooks].add(name, fn)
    } else {
      this.after((err, done) => {
        _addHook.call(this, name, fn)
        done(err)
      })
    }
    return this

    function _addHook (name, fn) {
      this[kHooks].add(name, fn)
      this[kChildren].forEach(child => _addHook.call(child, name, fn))
    }
  }

  // wrapper that we expose to the user for schemas handling
  function addSchema (schema) {
    throwIfAlreadyStarted('Cannot call "addSchema" when fastify instance is already started!')
    this[kSchemaController].add(schema)
    this[kChildren].forEach(child => child.addSchema(schema))
    return this
  }

  function defaultClientErrorHandler (err, socket) {
    // In case of a connection reset, the socket has been destroyed and there is nothing that needs to be done.
    // https://nodejs.org/api/http.html#http_event_clienterror
    if (err.code === 'ECONNRESET' || socket.destroyed) {
      return
    }

    const body = JSON.stringify({
      error: http.STATUS_CODES['400'],
      message: 'Client Error',
      statusCode: 400
    })

    // Most devs do not know what to do with this error.
    // In the vast majority of cases, it's a network error and/or some
    // config issue on the load balancer side.
    this.log.trace({ err }, 'client error')
    // Copying standard node behaviour
    // https://github.com/nodejs/node/blob/6ca23d7846cb47e84fd344543e394e50938540be/lib/_http_server.js#L666

    // If the socket is not writable, there is no reason to try to send data.
    if (socket.writable) {
      socket.write(`HTTP/1.1 400 Bad Request\r\nContent-Length: ${body.length}\r\nContent-Type: application/json\r\n\r\n${body}`)
    }
    socket.destroy(err)
  }

  // If the router does not match any route, every request will land here
  // req and res are Node.js core objects
  function defaultRoute (req, res) {
    if (req.headers['accept-version'] !== undefined) {
      // we remove the accept-version header for performance result
      // because we do not want to go through the constraint checking
      // the usage of symbol here to prevent any collision on custom header name
      req.headers[kRequestAcceptVersion] = req.headers['accept-version']
      req.headers['accept-version'] = undefined
    }
    fourOhFour.router.lookup(req, res)
  }

  function onBadUrl (path, req, res) {
    if (frameworkErrors) {
      const id = genReqId(req)
      const childLogger = logger.child({ reqId: id })

      childLogger.info({ req }, 'incoming request')

      const request = new Request(id, null, req, null, childLogger, onBadUrlContext)
      const reply = new Reply(res, request, childLogger)
      return frameworkErrors(new FST_ERR_BAD_URL(path), request, reply)
    }
    const body = `{"error":"Bad Request","message":"'${path}' is not a valid url component","statusCode":400}`
    res.writeHead(400, {
      'Content-Type': 'application/json',
      'Content-Length': body.length
    })
    res.end(body)
  }

  function setNotFoundHandler (opts, handler) {
    throwIfAlreadyStarted('Cannot call "setNotFoundHandler" when fastify instance is already started!')

    fourOhFour.setNotFoundHandler.call(this, opts, handler, avvio, router.routeHandler)
    return this
  }

  function setValidatorCompiler (validatorCompiler) {
    throwIfAlreadyStarted('Cannot call "setValidatorCompiler" when fastify instance is already started!')
    this[kSchemaController].setValidatorCompiler(validatorCompiler)
    return this
  }

  function setSchemaErrorFormatter (errorFormatter) {
    throwIfAlreadyStarted('Cannot call "setSchemaErrorFormatter" when fastify instance is already started!')
    validateSchemaErrorFormatter(errorFormatter)
    this[kSchemaErrorFormatter] = errorFormatter.bind(this)
    return this
  }

  function setSerializerCompiler (serializerCompiler) {
    throwIfAlreadyStarted('Cannot call "setSerializerCompiler" when fastify instance is already started!')
    this[kSchemaController].setSerializerCompiler(serializerCompiler)
    return this
  }

  function setSchemaController (schemaControllerOpts) {
    throwIfAlreadyStarted('Cannot call "setSchemaController" when fastify instance is already started!')
    const old = this[kSchemaController]
    const schemaController = SchemaController.buildSchemaController(old, Object.assign({}, old.opts, schemaControllerOpts))
    this[kSchemaController] = schemaController
    this.getSchema = schemaController.getSchema.bind(schemaController)
    this.getSchemas = schemaController.getSchemas.bind(schemaController)
    return this
  }

  function setReplySerializer (replySerializer) {
    throwIfAlreadyStarted('Cannot call "setReplySerializer" when fastify instance is already started!')

    this[kReplySerializerDefault] = replySerializer
    return this
  }

  // wrapper that we expose to the user for configure the custom error handler
  function setErrorHandler (func) {
    throwIfAlreadyStarted('Cannot call "setErrorHandler" when fastify instance is already started!')

    this[kErrorHandler] = buildErrorHandler(this[kErrorHandler], func.bind(this))
    return this
  }

  function printRoutes (opts = {}) {
    // includeHooks:true - shortcut to include all supported hooks exported by fastify.Hooks
    opts.includeMeta = opts.includeHooks ? opts.includeMeta ? supportedHooks.concat(opts.includeMeta) : supportedHooks : opts.includeMeta
    return router.printRoutes(opts)
  }
}

function validateSchemaErrorFormatter (schemaErrorFormatter) {
  if (typeof schemaErrorFormatter !== 'function') {
    throw new Error(`schemaErrorFormatter option should be a function, instead got ${typeof schemaErrorFormatter}`)
  } else if (schemaErrorFormatter.constructor.name === 'AsyncFunction') {
    throw new Error('schemaErrorFormatter option should not be an async function')
  }
}

function wrapRouting (httpHandler, { rewriteUrl, logger }) {
  if (!rewriteUrl) {
    return httpHandler
  }
  return function preRouting (req, res) {
    const originalUrl = req.url
    const url = rewriteUrl(req)
    if (originalUrl !== url) {
      logger.debug({ originalUrl, url }, 'rewrite url')
      if (typeof url === 'string') {
        req.url = url
      } else {
        req.destroy(new Error(`Rewrite url for "${req.url}" needs to be of type "string" but received "${typeof url}"`))
      }
    }
    httpHandler(req, res)
  }
}

/**
 * These export configurations enable JS and TS developers
 * to consumer fastify in whatever way best suits their needs.
 * Some examples of supported import syntax includes:
 * - `const fastify = require('fastify')`
 * - `const { fastify } = require('fastify')`
 * - `import * as Fastify from 'fastify'`
 * - `import { fastify, TSC_definition } from 'fastify'`
 * - `import fastify from 'fastify'`
 * - `import fastify, { TSC_definition } from 'fastify'`
 */
module.exports = fastify
module.exports.fastify = fastify
module.exports.default = fastify
