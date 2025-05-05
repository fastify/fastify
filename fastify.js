'use strict'

const VERSION = '5.3.3'

const http = require('node:http')
const diagnostics = require('node:diagnostics_channel')

const {
  kAvvioBoot,
  kChildren,
  kServerBindings,
  kBodyLimit,
  kSupportedHTTPMethods,
  kRoutePrefix,
  kLogLevel,
  kLogSerializers,
  kHooks,
  kSchemaController,
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
  kChildLoggerFactory,
  kGenReqId
} = require('./lib/symbols.js')

const { createServer } = require('./lib/server')
const Reply = require('./lib/reply')
const Request = require('./lib/request')
const Context = require('./lib/context.js')
const decorator = require('./lib/decorate')
const ContentTypeParser = require('./lib/contentTypeParser')
const SchemaController = require('./lib/schema-controller')
const { Hooks, supportedHooks, addHook } = require('./lib/hooks')
const { createChildLogger, defaultChildLoggerFactory, createLogger } = require('./lib/logger-factory')
const pluginUtils = require('./lib/pluginUtils')
const { getGenReqId, reqIdGenFactory } = require('./lib/reqIdGenFactory')
const { buildRouting, validateBodyLimitOption } = require('./lib/route')
const build404 = require('./lib/fourOhFour')
const getSecuredInitialConfig = require('./lib/initialConfigValidation')
const noopSet = require('./lib/noop-set')
const {
  appendStackTrace,
  AVVIO_ERRORS_MAP,
  ...errorCodes
} = require('./lib/errors')

const { defaultInitOptions } = getSecuredInitialConfig

const {
  FST_ERR_ASYNC_CONSTRAINT,
  FST_ERR_FORCE_CLOSE_CONNECTIONS_IDLE_NOT_AVAILABLE,
  FST_ERR_OPTIONS_NOT_OBJ,
  FST_ERR_QSP_NOT_FN,
  FST_ERR_SCHEMA_CONTROLLER_BUCKET_OPT_NOT_FN,
  FST_ERR_AJV_CUSTOM_OPTIONS_OPT_NOT_OBJ,
  FST_ERR_AJV_CUSTOM_OPTIONS_OPT_NOT_ARR,
  FST_ERR_INSTANCE_ALREADY_LISTENING,
  FST_ERR_ROUTE_REWRITE_NOT_STR,
  FST_ERR_SCHEMA_ERROR_FORMATTER_NOT_FN,
  FST_ERR_ERROR_HANDLER_NOT_FN,
  FST_ERR_ROUTE_METHOD_INVALID
} = errorCodes

const { buildErrorHandler } = require('./lib/error-handler.js')
const setupInject = require('./lib/setup/setup-inject.js')
const setupAvvio = require('./lib/setup/setup-avvio.js')
const setupReady = require('./lib/setup/setup-ready.js')
const setupClientErrorHandler = require('./lib/setup/setup-client-error-handler.js')

const initChannel = diagnostics.channel('fastify.initialization')

function defaultBuildPrettyMeta (route) {
  // return a shallow copy of route's sanitized context

  const cleanKeys = {}
  const allowedProps = ['errorHandler', 'logLevel', 'logSerializers']

  allowedProps.concat(supportedHooks).forEach(k => {
    cleanKeys[k] = route.store[k]
  })

  return Object.assign({}, cleanKeys)
}

/**
 * @param {import('./fastify.js').FastifyServerOptions} options
 */
function fastify (options) {
  // === OPTIONS PREPROCESSING ===========================================
  //
  // Normalise and validate the user-supplied `options` object, then
  // fill in default values.
  if (options && typeof options !== 'object') {
    throw new FST_ERR_OPTIONS_NOT_OBJ()
  } else {
    // Shallow copy options object to prevent mutations outside of this function
    options = Object.assign({}, options)
  }

  if (options.querystringParser && typeof options.querystringParser !== 'function') {
    throw new FST_ERR_QSP_NOT_FN(typeof options.querystringParser)
  }

  if (options.schemaController && options.schemaController.bucket && typeof options.schemaController.bucket !== 'function') {
    throw new FST_ERR_SCHEMA_CONTROLLER_BUCKET_OPT_NOT_FN(typeof options.schemaController.bucket)
  }

  validateBodyLimitOption(options.bodyLimit)

  const requestIdHeader = typeof options.requestIdHeader === 'string' && options.requestIdHeader.length !== 0 ? options.requestIdHeader.toLowerCase() : (options.requestIdHeader === true && 'request-id')
  const genReqId = reqIdGenFactory(requestIdHeader, options.genReqId)
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
    throw new FST_ERR_AJV_CUSTOM_OPTIONS_OPT_NOT_OBJ(typeof ajvOptions.customOptions)
  }
  if (!ajvOptions.plugins || !Array.isArray(ajvOptions.plugins)) {
    throw new FST_ERR_AJV_CUSTOM_OPTIONS_OPT_NOT_ARR(typeof ajvOptions.plugins)
  }

  // Instance Fastify components

  const { logger, hasLogger } = createLogger(options)

  // Update the options with the fixed values
  options.connectionTimeout = options.connectionTimeout || defaultInitOptions.connectionTimeout
  options.keepAliveTimeout = options.keepAliveTimeout || defaultInitOptions.keepAliveTimeout
  options.maxRequestsPerSocket = options.maxRequestsPerSocket || defaultInitOptions.maxRequestsPerSocket
  options.requestTimeout = options.requestTimeout || defaultInitOptions.requestTimeout
  options.logger = logger
  options.requestIdHeader = requestIdHeader
  options.requestIdLogLabel = requestIdLogLabel
  options.disableRequestLogging = disableRequestLogging
  options.ajv = ajvOptions

  const initialConfig = getSecuredInitialConfig(options)

  // exposeHeadRoutes have its default set from the validator
  options.exposeHeadRoutes = initialConfig.exposeHeadRoutes

  // 404 router, used for handling encapsulated 404 handlers
  const fourOhFour = build404(options)

  // Default router
  const router = buildRouting({
    config: {
      constraints: options.constraints,
      ignoreTrailingSlash: options.ignoreTrailingSlash || defaultInitOptions.ignoreTrailingSlash,
      ignoreDuplicateSlashes: options.ignoreDuplicateSlashes || defaultInitOptions.ignoreDuplicateSlashes,
      maxParamLength: options.maxParamLength || defaultInitOptions.maxParamLength,
      caseSensitive: options.caseSensitive,
      allowUnsafeRegex: options.allowUnsafeRegex || defaultInitOptions.allowUnsafeRegex,
      buildPrettyMeta: defaultBuildPrettyMeta,
      querystringParser: options.querystringParser,
      useSemicolonDelimiter: options.useSemicolonDelimiter ?? defaultInitOptions.useSemicolonDelimiter
    }
  })

  // HTTP server and its handler
  const httpHandler = wrapRouting(router, options)

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

  // === INSTANCE OBJECT =================================================
  //
  // Construct the main `fastify` object: public API, symbol-backed
  //
  const fastify = {
    // Fastify internals
    [kState]: {
      listening: false,
      closing: false,
      started: false,
      ready: false,
      booting: false,
      readyPromise: null
    },
    [kKeepAliveConnections]: keepAliveConnections,
    [kSupportedHTTPMethods]: {
      bodyless: new Set([
        // Standard
        'GET',
        'HEAD',
        'TRACE'
      ]),
      bodywith: new Set([
        // Standard
        'DELETE',
        'OPTIONS',
        'PATCH',
        'PUT',
        'POST'
      ])
    },
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
    [kChildLoggerFactory]: defaultChildLoggerFactory,
    [kReplySerializerDefault]: null,
    [kContentTypeParser]: new ContentTypeParser(
      bodyLimit,
      (options.onProtoPoisoning || defaultInitOptions.onProtoPoisoning),
      (options.onConstructorPoisoning || defaultInitOptions.onConstructorPoisoning)
    ),
    [kReply]: Reply.buildReply(Reply),
    [kRequest]: Request.buildRequest(Request, options.trustProxy),
    [kFourOhFour]: fourOhFour,
    [pluginUtils.kRegisteredPlugins]: [],
    [kPluginNameChain]: ['fastify'],
    [kAvvioBoot]: null,
    [kGenReqId]: genReqId,
    // routing method
    routing: httpHandler,
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
    trace: function _trace (url, options, handler) {
      return router.prepareRoute.call(this, { method: 'TRACE', url, options, handler })
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
      return router.prepareRoute.call(this, { method: this.supportedMethods, url, options, handler })
    },
    // extended route
    route: function _route (options) {
      // we need the fastify object that we are producing so we apply a lazy loading of the function,
      // otherwise we should bind it after the declaration
      return router.route.call(this, { options })
    },
    hasRoute: function _route (options) {
      return router.hasRoute.call(this, { options })
    },
    findRoute: function _findRoute (options) {
      return router.findRoute(options)
    },
    // expose logger instance
    log: logger,
    // type provider
    withTypeProvider,
    // hooks
    addHook: function _addHook (name, fn) {
      throwIfAlreadyStarted('Cannot call "addHook"!')
      return addHook.call(this, name, fn)
    },
    // wrapper that we expose to the user for schemas handling
    addSchema,
    getSchema: schemaController.getSchema.bind(schemaController),
    getSchemas: schemaController.getSchemas.bind(schemaController),
    setValidatorCompiler,
    setSerializerCompiler,
    setSchemaController,
    setReplySerializer,
    setSchemaErrorFormatter,
    // set generated request id
    setGenReqId,
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
      return this[pluginUtils.kRegisteredPlugins].includes(name) || this[kPluginNameChain].includes(name)
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
    getDecorator: decorator.getInstanceDecorator,
    addHttpMethod,
    // fake http injection
    inject: null,
    // pretty print of the registered routes
    printRoutes,
    // custom error handling
    setNotFoundHandler,
    setErrorHandler,
    // child logger
    setChildLoggerFactory,
    // Set fastify initial configuration options read-only object
    initialConfig,
    // constraint strategies
    addConstraintStrategy: router.addConstraintStrategy.bind(router),
    hasConstraintStrategy: router.hasConstraintStrategy.bind(router)
  }

  Object.defineProperties(fastify, {
    listeningOrigin: {
      get () {
        const address = this.addresses().slice(-1).pop()
        /* ignore if windows: unix socket is not testable on Windows platform */
        /* c8 ignore next 3 */
        if (typeof address === 'string') {
          return address
        }
        const host = address.family === 'IPv6' ? `[${address.address}]` : address.address
        return `${this[kOptions].https ? 'https' : 'http'}://${host}:${address.port}`
      }
    },
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
    childLoggerFactory: {
      configurable: true,
      get () { return this[kChildLoggerFactory] }
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
    },
    genReqId: {
      configurable: true,
      get () { return this[kGenReqId] }
    },
    supportedMethods: {
      configurable: false,
      get () {
        return [
          ...this[kSupportedHTTPMethods].bodyless,
          ...this[kSupportedHTTPMethods].bodywith
        ]
      }
    }
  })
  // === INSTANCE SETUP PHASE ===========================================
  //
  // Wire Avvio, router, 404 handler, diagnostics channel, HTTP injection,
  // and any other side-effects that mutate the instance after construction.
  if (options.schemaErrorFormatter) {
    validateSchemaErrorFormatter(options.schemaErrorFormatter)
    fastify[kSchemaErrorFormatter] = options.schemaErrorFormatter.bind(fastify)
  }

  // HTTP injection handling
  // If the server is not ready yet, this
  // utility will automatically force it.
  fastify.inject = setupInject(fastify, {
    httpHandler
  })

  // Install and configure Avvio
  // Avvio will update the following Fastify methods:
  // - register
  // - after
  // - ready
  // - onClose
  // - close
  const avvio = setupAvvio(fastify, {
    options,
    defaultInitOptions,
    forceCloseConnections,
    serverHasCloseAllConnections,
    router
  })
  fastify.ready = setupReady(fastify) // overwrite the avvio ready function

  // Create bad URL context
  const onBadUrlContext = new Context({
    server: fastify,
    config: {}
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
    keepAliveConnections,
    frameworkErrors,
    onBadUrlContext
  })

  setupClientErrorHandler(fastify, {
    options,
    server
  })

  if (initChannel.hasSubscribers) {
    initChannel.publish({ fastify })
  }

  // Older nodejs versions may not have asyncDispose
  if ('asyncDispose' in Symbol) {
    fastify[Symbol.asyncDispose] = function dispose () {
      return fastify.close()
    }
  }

  return fastify

  // === INSTANCE METHODS ===============================================
  //
  // Public methods attached to `fastify`.
  function setNotFoundHandler (opts, handler) {
    throwIfAlreadyStarted('Cannot call "setNotFoundHandler"!')

    fourOhFour.setNotFoundHandler.call(this, opts, handler, avvio, router.routeHandler)
    return this
  }

  // Used exclusively in TypeScript contexts to enable auto type inference from JSON schema.
  function withTypeProvider () {
    return this
  }

  // wrapper that we expose to the user for schemas handling
  function addSchema (schema) {
    throwIfAlreadyStarted('Cannot call "addSchema"!')
    this[kSchemaController].add(schema)
    this[kChildren].forEach(child => child.addSchema(schema))
    return this
  }

  function setValidatorCompiler (validatorCompiler) {
    throwIfAlreadyStarted('Cannot call "setValidatorCompiler"!')
    this[kSchemaController].setValidatorCompiler(validatorCompiler)
    return this
  }

  function setSchemaErrorFormatter (errorFormatter) {
    throwIfAlreadyStarted('Cannot call "setSchemaErrorFormatter"!')
    validateSchemaErrorFormatter(errorFormatter)
    this[kSchemaErrorFormatter] = errorFormatter.bind(this)
    return this
  }

  function setSerializerCompiler (serializerCompiler) {
    throwIfAlreadyStarted('Cannot call "setSerializerCompiler"!')
    this[kSchemaController].setSerializerCompiler(serializerCompiler)
    return this
  }

  function setSchemaController (schemaControllerOpts) {
    throwIfAlreadyStarted('Cannot call "setSchemaController"!')
    const old = this[kSchemaController]
    const schemaController = SchemaController.buildSchemaController(old, Object.assign({}, old.opts, schemaControllerOpts))
    this[kSchemaController] = schemaController
    this.getSchema = schemaController.getSchema.bind(schemaController)
    this.getSchemas = schemaController.getSchemas.bind(schemaController)
    return this
  }

  function setReplySerializer (replySerializer) {
    throwIfAlreadyStarted('Cannot call "setReplySerializer"!')

    this[kReplySerializerDefault] = replySerializer
    return this
  }

  // wrapper that we expose to the user for configure the custom error handler
  function setErrorHandler (func) {
    throwIfAlreadyStarted('Cannot call "setErrorHandler"!')

    if (typeof func !== 'function') {
      throw new FST_ERR_ERROR_HANDLER_NOT_FN()
    }

    this[kErrorHandler] = buildErrorHandler(this[kErrorHandler], func.bind(this))
    return this
  }

  function setChildLoggerFactory (factory) {
    throwIfAlreadyStarted('Cannot call "setChildLoggerFactory"!')

    this[kChildLoggerFactory] = factory
    return this
  }

  function printRoutes (opts = {}) {
    // includeHooks:true - shortcut to include all supported hooks exported by fastify.Hooks
    opts.includeMeta = opts.includeHooks ? opts.includeMeta ? supportedHooks.concat(opts.includeMeta) : supportedHooks : opts.includeMeta
    return router.printRoutes(opts)
  }

  function setGenReqId (func) {
    throwIfAlreadyStarted('Cannot call "setGenReqId"!')

    this[kGenReqId] = reqIdGenFactory(this[kOptions].requestIdHeader, func)
    return this
  }

  function addHttpMethod (method, { hasBody = false } = {}) {
    if (typeof method !== 'string' || http.METHODS.indexOf(method) === -1) {
      throw new FST_ERR_ROUTE_METHOD_INVALID()
    }

    if (hasBody === true) {
      this[kSupportedHTTPMethods].bodywith.add(method)
      this[kSupportedHTTPMethods].bodyless.delete(method)
    } else {
      this[kSupportedHTTPMethods].bodywith.delete(method)
      this[kSupportedHTTPMethods].bodyless.add(method)
    }

    const _method = method.toLowerCase()
    if (!this.hasDecorator(_method)) {
      this.decorate(_method, function (url, options, handler) {
        return router.prepareRoute.call(this, { method, url, options, handler })
      })
    }

    return this
  }

  // === INTERNAL HELPERS ===============================================
  //
  // Private utilities used only inside this factory
  //
  function throwIfAlreadyStarted (msg) {
    if (fastify[kState].started) throw new FST_ERR_INSTANCE_ALREADY_LISTENING(msg)
  }

  function buildAsyncConstraintCallback (isAsync, req, res) {
    if (isAsync === false) return undefined
    return function onAsyncConstraintError (err) {
      if (err) {
        if (frameworkErrors) {
          const id = getGenReqId(onBadUrlContext.server, req)
          const childLogger = createChildLogger(onBadUrlContext, logger, req, id)

          const request = new Request(id, null, req, null, childLogger, onBadUrlContext)
          const reply = new Reply(res, request, childLogger)

          if (disableRequestLogging === false) {
            childLogger.info({ req: request }, 'incoming request')
          }

          return frameworkErrors(new FST_ERR_ASYNC_CONSTRAINT(), request, reply)
        }
        const body = '{"error":"Internal Server Error","message":"Unexpected error from async constraint","statusCode":500}'
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Content-Length': body.length
        })
        res.end(body)
      }
    }
  }

  function wrapRouting (router, { rewriteUrl, logger }) {
    let isAsync
    return function preRouting (req, res) {
      // only call isAsyncConstraint once
      if (isAsync === undefined) isAsync = router.isAsyncConstraint()
      if (rewriteUrl) {
        req.originalUrl = req.url
        const url = rewriteUrl.call(fastify, req)
        if (typeof url === 'string') {
          req.url = url
        } else {
          const err = new FST_ERR_ROUTE_REWRITE_NOT_STR(req.url, typeof url)
          req.destroy(err)
        }
      }
      router.routing(req, res, buildAsyncConstraintCallback(isAsync, req, res))
    }
  }
}

function validateSchemaErrorFormatter (schemaErrorFormatter) {
  if (typeof schemaErrorFormatter !== 'function') {
    throw new FST_ERR_SCHEMA_ERROR_FORMATTER_NOT_FN(typeof schemaErrorFormatter)
  } else if (schemaErrorFormatter.constructor.name === 'AsyncFunction') {
    throw new FST_ERR_SCHEMA_ERROR_FORMATTER_NOT_FN('AsyncFunction')
  }
}

/**
 * These export configurations enable JS and TS developers
 * to consume fastify in whatever way best suits their needs.
 * Some examples of supported import syntax includes:
 * - `const fastify = require('fastify')`
 * - `const { fastify } = require('fastify')`
 * - `import * as Fastify from 'fastify'`
 * - `import { fastify, TSC_definition } from 'fastify'`
 * - `import fastify from 'fastify'`
 * - `import fastify, { TSC_definition } from 'fastify'`
 */
module.exports = fastify
module.exports.errorCodes = errorCodes
module.exports.fastify = fastify
module.exports.default = fastify
