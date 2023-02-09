'use strict'

const FindMyWay = require('find-my-way')
const Context = require('./context')
const handleRequest = require('./handleRequest')
const { hookRunner, hookIterator, lifecycleHooks } = require('./hooks')
const { supportedMethods } = require('./httpMethods')
const { normalizeSchema } = require('./schemas')
const { parseHeadOnSendHandlers } = require('./headRoute')
const warning = require('./warnings')

const {
  compileSchemasForValidation,
  compileSchemasForSerialization
} = require('./validation')

const {
  FST_ERR_SCH_VALIDATION_BUILD,
  FST_ERR_SCH_SERIALIZATION_BUILD,
  FST_ERR_DEFAULT_ROUTE_INVALID_TYPE,
  FST_ERR_DUPLICATED_ROUTE,
  FST_ERR_INVALID_URL,
  FST_ERR_SEND_UNDEFINED_ERR,
  FST_ERR_HOOK_INVALID_HANDLER,
  FST_ERR_ROUTE_OPTIONS_NOT_OBJ,
  FST_ERR_ROUTE_DUPLICATED_HANDLER,
  FST_ERR_ROUTE_HANDLER_NOT_FN,
  FST_ERR_ROUTE_MISSING_HANDLER,
  FST_ERR_ROUTE_METHOD_NOT_SUPPORTED,
  FST_ERR_ROUTE_BODY_VALIDATION_SCHEMA_NOT_SUPPORTED,
  FST_ERR_ROUTE_BODY_LIMIT_OPTION_NOT_INT
} = require('./errors')

const {
  kRoutePrefix,
  kLogLevel,
  kLogSerializers,
  kHooks,
  kSchemaController,
  kOptions,
  kReplySerializerDefault,
  kReplyIsError,
  kRequestPayloadStream,
  kDisableRequestLogging,
  kSchemaErrorFormatter,
  kErrorHandler,
  kHasBeenDecorated,
  kRequestAcceptVersion,
  kRouteByFastify,
  kRouteContext
} = require('./symbols.js')
const { buildErrorHandler } = require('./error-handler')

function buildRouting (options) {
  const router = FindMyWay(options.config)

  let avvio
  let fourOhFour
  let requestIdLogLabel
  let logger
  let hasLogger
  let setupResponseListeners
  let throwIfAlreadyStarted
  let genReqId
  let disableRequestLogging
  let ignoreTrailingSlash
  let ignoreDuplicateSlashes
  let return503OnClosing
  let globalExposeHeadRoutes
  let validateHTTPVersion
  let keepAliveConnections

  let closing = false

  return {
    setup (options, fastifyArgs) {
      avvio = fastifyArgs.avvio
      fourOhFour = fastifyArgs.fourOhFour
      logger = fastifyArgs.logger
      hasLogger = fastifyArgs.hasLogger
      setupResponseListeners = fastifyArgs.setupResponseListeners
      throwIfAlreadyStarted = fastifyArgs.throwIfAlreadyStarted
      validateHTTPVersion = fastifyArgs.validateHTTPVersion

      globalExposeHeadRoutes = options.exposeHeadRoutes
      requestIdLogLabel = options.requestIdLogLabel
      genReqId = options.genReqId
      disableRequestLogging = options.disableRequestLogging
      ignoreTrailingSlash = options.ignoreTrailingSlash
      ignoreDuplicateSlashes = options.ignoreDuplicateSlashes
      return503OnClosing = Object.prototype.hasOwnProperty.call(options, 'return503OnClosing') ? options.return503OnClosing : true
      keepAliveConnections = fastifyArgs.keepAliveConnections
    },
    routing: router.lookup.bind(router), // router func to find the right handler to call
    route, // configure a route in the fastify instance
    hasRoute,
    prepareRoute,
    getDefaultRoute: function () {
      warning.emit('FSTDEP014')
      return router.defaultRoute
    },
    setDefaultRoute: function (defaultRoute) {
      warning.emit('FSTDEP014')
      if (typeof defaultRoute !== 'function') {
        throw new FST_ERR_DEFAULT_ROUTE_INVALID_TYPE()
      }

      router.defaultRoute = defaultRoute
    },
    routeHandler,
    closeRoutes: () => { closing = true },
    printRoutes: router.prettyPrint.bind(router),
    addConstraintStrategy,
    hasConstraintStrategy,
    isAsyncConstraint
  }

  function addConstraintStrategy (strategy) {
    throwIfAlreadyStarted('Cannot add constraint strategy!')
    return router.addConstraintStrategy(strategy)
  }

  function hasConstraintStrategy (strategyName) {
    return router.hasConstraintStrategy(strategyName)
  }

  function isAsyncConstraint () {
    return router.constrainer.asyncStrategiesInUse.size > 0
  }

  // Convert shorthand to extended route declaration
  function prepareRoute ({ method, url, options, handler, isFastify }) {
    if (typeof url !== 'string') {
      throw new FST_ERR_INVALID_URL(typeof url)
    }

    if (!handler && typeof options === 'function') {
      handler = options // for support over direct function calls such as fastify.get() options are reused as the handler
      options = {}
    } else if (handler && typeof handler === 'function') {
      if (Object.prototype.toString.call(options) !== '[object Object]') {
        throw new FST_ERR_ROUTE_OPTIONS_NOT_OBJ(method, url)
      } else if (options.handler) {
        if (typeof options.handler === 'function') {
          throw new FST_ERR_ROUTE_DUPLICATED_HANDLER(method, url)
        } else {
          throw new FST_ERR_ROUTE_HANDLER_NOT_FN(method, url)
        }
      }
    }

    options = Object.assign({}, options, {
      method,
      url,
      path: url,
      handler: handler || (options && options.handler)
    })

    return route.call(this, { options, isFastify })
  }

  function hasRoute ({ options }) {
    return router.find(
      options.method,
      options.url || '',
      options.constraints
    ) !== null
  }

  // Route management
  function route ({ options, isFastify }) {
    // Since we are mutating/assigning only top level props, it is fine to have a shallow copy using the spread operator
    const opts = { ...options }

    const { exposeHeadRoute } = opts
    const hasRouteExposeHeadRouteFlag = exposeHeadRoute != null
    const shouldExposeHead = hasRouteExposeHeadRouteFlag ? exposeHeadRoute : globalExposeHeadRoutes
    // we need to clone a set of initial options for HEAD route
    const headOpts = shouldExposeHead && options.method === 'GET' ? { ...options } : null

    throwIfAlreadyStarted('Cannot add route!')

    const path = opts.url || opts.path || ''

    if (Array.isArray(opts.method)) {
      // eslint-disable-next-line no-var
      for (var i = 0; i < opts.method.length; ++i) {
        validateMethodAndSchemaBodyOption(opts.method[i], path, opts.schema)
      }
    } else {
      validateMethodAndSchemaBodyOption(opts.method, path, opts.schema)
    }

    if (!opts.handler) {
      throw new FST_ERR_ROUTE_MISSING_HANDLER(opts.method, path)
    }

    if (opts.errorHandler !== undefined && typeof opts.errorHandler !== 'function') {
      throw new FST_ERR_ROUTE_HANDLER_NOT_FN(opts.method, path)
    }

    validateBodyLimitOption(opts.bodyLimit)

    const prefix = this[kRoutePrefix]

    if (path === '/' && prefix.length > 0 && opts.method !== 'HEAD') {
      switch (opts.prefixTrailingSlash) {
        case 'slash':
          addNewRoute.call(this, { path, isFastify })
          break
        case 'no-slash':
          addNewRoute.call(this, { path: '', isFastify })
          break
        case 'both':
        default:
          addNewRoute.call(this, { path: '', isFastify })
          // If ignoreTrailingSlash is set to true we need to add only the '' route to prevent adding an incomplete one.
          if (ignoreTrailingSlash !== true && (ignoreDuplicateSlashes !== true || !prefix.endsWith('/'))) {
            addNewRoute.call(this, { path, prefixing: true, isFastify })
          }
      }
    } else if (path[0] === '/' && prefix.endsWith('/')) {
      // Ensure that '/prefix/' + '/route' gets registered as '/prefix/route'
      addNewRoute.call(this, { path: path.slice(1), isFastify })
    } else {
      addNewRoute.call(this, { path, isFastify })
    }

    // chainable api
    return this

    function addNewRoute ({ path, prefixing = false, isFastify = false }) {
      const url = prefix + path

      opts.url = url
      opts.path = url
      opts.routePath = path
      opts.prefix = prefix
      opts.logLevel = opts.logLevel || this[kLogLevel]

      if (this[kLogSerializers] || opts.logSerializers) {
        opts.logSerializers = Object.assign(Object.create(this[kLogSerializers]), opts.logSerializers)
      }

      if (opts.attachValidation == null) {
        opts.attachValidation = false
      }

      if (prefixing === false) {
        // run 'onRoute' hooks
        for (const hook of this[kHooks].onRoute) {
          hook.call(this, opts)
        }
      }

      for (const hook of lifecycleHooks) {
        if (opts && hook in opts) {
          if (Array.isArray(opts[hook])) {
            for (const func of opts[hook]) {
              if (typeof func !== 'function') {
                throw new FST_ERR_HOOK_INVALID_HANDLER(hook, Object.prototype.toString.call(func))
              }
            }
          } else if (opts[hook] !== undefined && typeof opts[hook] !== 'function') {
            throw new FST_ERR_HOOK_INVALID_HANDLER(hook, Object.prototype.toString.call(opts[hook]))
          }
        }
      }

      const constraints = opts.constraints || {}
      const config = {
        ...opts.config,
        url,
        method: opts.method
      }

      const context = new Context({
        schema: opts.schema,
        handler: opts.handler.bind(this),
        config,
        errorHandler: opts.errorHandler,
        bodyLimit: opts.bodyLimit,
        logLevel: opts.logLevel,
        logSerializers: opts.logSerializers,
        attachValidation: opts.attachValidation,
        schemaErrorFormatter: opts.schemaErrorFormatter,
        replySerializer: this[kReplySerializerDefault],
        validatorCompiler: opts.validatorCompiler,
        serializerCompiler: opts.serializerCompiler,
        exposeHeadRoute: shouldExposeHead,
        prefixTrailingSlash: (opts.prefixTrailingSlash || 'both'),
        server: this,
        isFastify
      })

      if (opts.version) {
        warning.emit('FSTDEP008')
        constraints.version = opts.version
      }

      const headHandler = router.find('HEAD', opts.url, constraints)
      const hasHEADHandler = headHandler != null

      // remove the head route created by fastify
      if (hasHEADHandler && !context[kRouteByFastify] && headHandler.store[kRouteByFastify]) {
        router.off(opts.method, opts.url, { constraints })
      }

      try {
        router.on(opts.method, opts.url, { constraints }, routeHandler, context)
      } catch (error) {
        // any route insertion error created by fastify can be safely ignore
        // because it only duplicate route for head
        if (!context[kRouteByFastify]) {
          const isDuplicatedRoute = error.message.includes(`Method '${opts.method}' already declared for route '${opts.url}'`)
          if (isDuplicatedRoute) {
            throw new FST_ERR_DUPLICATED_ROUTE(opts.method, opts.url)
          }

          throw error
        }
      }

      this.after((notHandledErr, done) => {
        // Send context async
        context.errorHandler = opts.errorHandler ? buildErrorHandler(this[kErrorHandler], opts.errorHandler) : this[kErrorHandler]
        context._parserOptions.limit = opts.bodyLimit || null
        context.logLevel = opts.logLevel
        context.logSerializers = opts.logSerializers
        context.attachValidation = opts.attachValidation
        context[kReplySerializerDefault] = this[kReplySerializerDefault]
        context.schemaErrorFormatter = opts.schemaErrorFormatter || this[kSchemaErrorFormatter] || context.schemaErrorFormatter

        // Run hooks and more
        avvio.once('preReady', () => {
          for (const hook of lifecycleHooks) {
            const toSet = this[kHooks][hook]
              .concat(opts[hook] || [])
              .map(h => h.bind(this))
            context[hook] = toSet.length ? toSet : null
          }

          // Optimization: avoid encapsulation if no decoration has been done.
          while (!context.Request[kHasBeenDecorated] && context.Request.parent) {
            context.Request = context.Request.parent
          }
          while (!context.Reply[kHasBeenDecorated] && context.Reply.parent) {
            context.Reply = context.Reply.parent
          }

          // Must store the 404 Context in 'preReady' because it is only guaranteed to
          // be available after all of the plugins and routes have been loaded.
          fourOhFour.setContext(this, context)

          if (opts.schema) {
            context.schema = normalizeSchema(context.schema, this.initialConfig)

            const schemaController = this[kSchemaController]
            if (!opts.validatorCompiler && (opts.schema.body || opts.schema.headers || opts.schema.querystring || opts.schema.params)) {
              schemaController.setupValidator(this[kOptions])
            }
            try {
              const isCustom = typeof opts?.validatorCompiler === 'function' || schemaController.isCustomValidatorCompiler
              compileSchemasForValidation(context, opts.validatorCompiler || schemaController.validatorCompiler, isCustom)
            } catch (error) {
              throw new FST_ERR_SCH_VALIDATION_BUILD(opts.method, url, error.message)
            }

            if (opts.schema.response && !opts.serializerCompiler) {
              schemaController.setupSerializer(this[kOptions])
            }
            try {
              compileSchemasForSerialization(context, opts.serializerCompiler || schemaController.serializerCompiler)
            } catch (error) {
              throw new FST_ERR_SCH_SERIALIZATION_BUILD(opts.method, url, error.message)
            }
          }
        })

        done(notHandledErr)
      })

      // register head route in sync
      // we must place it after the `this.after`

      if (shouldExposeHead && options.method === 'GET' && !hasHEADHandler) {
        const onSendHandlers = parseHeadOnSendHandlers(headOpts.onSend)
        prepareRoute.call(this, { method: 'HEAD', url: path, options: { ...headOpts, onSend: onSendHandlers }, isFastify: true })
      } else if (hasHEADHandler && exposeHeadRoute) {
        warning.emit('FSTDEP007')
      }
    }
  }

  // HTTP request entry point, the routing has already been executed
  function routeHandler (req, res, params, context, query) {
    // TODO: The check here should be removed once https://github.com/nodejs/node/issues/43115 resolve in core.
    if (!validateHTTPVersion(req.httpVersion)) {
      const message = '{"error":"HTTP Version Not Supported","message":"HTTP Version Not Supported","statusCode":505}'
      const headers = {
        'Content-Type': 'application/json',
        'Content-Length': message.length
      }
      res.writeHead(505, headers)
      res.end(message)
      return
    }

    if (closing === true) {
      /* istanbul ignore next mac, windows */
      if (req.httpVersionMajor !== 2) {
        res.setHeader('Connection', 'close')
      }

      // TODO remove return503OnClosing after Node v18 goes EOL
      /* istanbul ignore else */
      if (return503OnClosing) {
        // On Node v19 we cannot test this behavior as it won't be necessary
        // anymore. It will close all the idle connections before they reach this
        // stage.
        const headers = {
          'Content-Type': 'application/json',
          'Content-Length': '80'
        }
        res.writeHead(503, headers)
        res.end('{"error":"Service Unavailable","message":"Service Unavailable","statusCode":503}')
        return
      }
    }

    // When server.forceCloseConnections is true, we will collect any requests
    // that have indicated they want persistence so that they can be reaped
    // on server close. Otherwise, the container is a noop container.
    const connHeader = String.prototype.toLowerCase.call(req.headers.connection || '')
    if (connHeader === 'keep-alive') {
      if (keepAliveConnections.has(req.socket) === false) {
        keepAliveConnections.add(req.socket)
        req.socket.on('close', removeTrackedSocket.bind({ keepAliveConnections, socket: req.socket }))
      }
    }

    // we revert the changes in defaultRoute
    if (req.headers[kRequestAcceptVersion] !== undefined) {
      req.headers['accept-version'] = req.headers[kRequestAcceptVersion]
      req.headers[kRequestAcceptVersion] = undefined
    }

    const id = genReqId(req)

    const loggerBinding = {
      [requestIdLogLabel]: id
    }

    const loggerOpts = {
      level: context.logLevel
    }

    if (context.logSerializers) {
      loggerOpts.serializers = context.logSerializers
    }
    const childLogger = logger.child(loggerBinding, loggerOpts)
    childLogger[kDisableRequestLogging] = disableRequestLogging

    const request = new context.Request(id, params, req, query, childLogger, context)
    const reply = new context.Reply(res, request, childLogger)

    if (disableRequestLogging === false) {
      childLogger.info({ req: request }, 'incoming request')
    }

    if (hasLogger === true || context.onResponse !== null) {
      setupResponseListeners(reply)
    }

    if (context.onRequest !== null) {
      hookRunner(
        context.onRequest,
        hookIterator,
        request,
        reply,
        runPreParsing
      )
    } else {
      runPreParsing(null, request, reply)
    }

    if (context.onTimeout !== null) {
      if (!request.raw.socket._meta) {
        request.raw.socket.on('timeout', handleTimeout)
      }
      request.raw.socket._meta = { context, request, reply }
    }
  }
}

function handleTimeout () {
  const { context, request, reply } = this._meta
  hookRunner(
    context.onTimeout,
    hookIterator,
    request,
    reply,
    noop
  )
}

function validateMethodAndSchemaBodyOption (method, path, schema) {
  if (supportedMethods.indexOf(method) === -1) {
    throw new FST_ERR_ROUTE_METHOD_NOT_SUPPORTED(method)
  }

  if ((method === 'GET' || method === 'HEAD') && schema && schema.body) {
    throw new FST_ERR_ROUTE_BODY_VALIDATION_SCHEMA_NOT_SUPPORTED(method, path)
  }
}

function validateBodyLimitOption (bodyLimit) {
  if (bodyLimit === undefined) return
  if (!Number.isInteger(bodyLimit) || bodyLimit <= 0) {
    throw new FST_ERR_ROUTE_BODY_LIMIT_OPTION_NOT_INT(bodyLimit)
  }
}

function runPreParsing (err, request, reply) {
  if (reply.sent === true) return
  if (err != null) {
    reply[kReplyIsError] = true
    reply.send(err)
    return
  }

  request[kRequestPayloadStream] = request.raw

  if (request[kRouteContext].preParsing !== null) {
    preParsingHookRunner(request[kRouteContext].preParsing, request, reply, handleRequest)
  } else {
    handleRequest(null, request, reply)
  }
}

function preParsingHookRunner (functions, request, reply, cb) {
  let i = 0

  function next (err, stream) {
    if (reply.sent) {
      return
    }

    if (typeof stream !== 'undefined') {
      request[kRequestPayloadStream] = stream
    }

    if (err || i === functions.length) {
      cb(err, request, reply)
      return
    }

    const fn = functions[i++]
    let result
    try {
      result = fn(request, reply, request[kRequestPayloadStream], next)
    } catch (error) {
      next(error)
      return
    }

    if (result && typeof result.then === 'function') {
      result.then(handleResolve, handleReject)
    }
  }

  function handleResolve (stream) {
    next(null, stream)
  }

  function handleReject (err) {
    if (!err) {
      err = new FST_ERR_SEND_UNDEFINED_ERR()
    }

    next(err)
  }

  next(null, request[kRequestPayloadStream])
}

/**
 * Used within the route handler as a `net.Socket.close` event handler.
 * The purpose is to remove a socket from the tracked sockets collection when
 * the socket has naturally timed out.
 */
function removeTrackedSocket () {
  this.keepAliveConnections.delete(this.socket)
}

function noop () { }

module.exports = { buildRouting, validateBodyLimitOption }
