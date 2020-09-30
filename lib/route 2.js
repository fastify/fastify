'use strict'

const FindMyWay = require('find-my-way')
const Context = require('./context')
const handleRequest = require('./handleRequest')
const { hookRunner, hookIterator, lifecycleHooks } = require('./hooks')
const supportedMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS']
const validation = require('./validation')
const { normalizeSchema } = require('./schemas')
const {
  ValidatorSelector,
  SerializerCompiler: buildDefaultSerializer
} = require('./schema-compilers')
const warning = require('./warnings')

const {
  compileSchemasForValidation,
  compileSchemasForSerialization
} = validation

const {
  FST_ERR_SCH_VALIDATION_BUILD,
  FST_ERR_SCH_SERIALIZATION_BUILD
} = require('./errors')

const {
  kRoutePrefix,
  kLogLevel,
  kLogSerializers,
  kHooks,
  kHooksDeprecatedPreParsing,
  kSchemas,
  kOptions,
  kValidatorCompiler,
  kSerializerCompiler,
  kContentTypeParser,
  kReply,
  kReplySerializerDefault,
  kReplyIsError,
  kRequest,
  kRequestPayloadStream,
  kDisableRequestLogging
} = require('./symbols.js')

function buildRouting (options) {
  const router = FindMyWay(options.config)

  let avvio
  let fourOhFour
  let requestIdHeader
  let querystringParser
  let requestIdLogLabel
  let logger
  let hasLogger
  let setupResponseListeners
  let throwIfAlreadyStarted
  let genReqId
  let disableRequestLogging
  let ignoreTrailingSlash
  let return503OnClosing
  let buildPerformanceValidator

  let closing = false

  return {
    setup (options, fastifyArgs) {
      avvio = fastifyArgs.avvio
      fourOhFour = fastifyArgs.fourOhFour
      logger = fastifyArgs.logger
      hasLogger = fastifyArgs.hasLogger
      setupResponseListeners = fastifyArgs.setupResponseListeners
      throwIfAlreadyStarted = fastifyArgs.throwIfAlreadyStarted

      requestIdHeader = options.requestIdHeader
      querystringParser = options.querystringParser
      requestIdLogLabel = options.requestIdLogLabel
      genReqId = options.genReqId
      disableRequestLogging = options.disableRequestLogging
      ignoreTrailingSlash = options.ignoreTrailingSlash
      return503OnClosing = Object.prototype.hasOwnProperty.call(options, 'return503OnClosing') ? options.return503OnClosing : true
      buildPerformanceValidator = ValidatorSelector()
    },
    routing: router.lookup.bind(router), // router func to find the right handler to call
    route, // configure a route in the fastify instance
    prepareRoute,
    routeHandler,
    closeRoutes: () => { closing = true },
    printRoutes: router.prettyPrint.bind(router)
  }

  // Convert shorthand to extended route declaration
  function prepareRoute (method, url, options, handler) {
    if (!handler && typeof options === 'function') {
      handler = options
      options = {}
    } else if (handler && typeof handler === 'function') {
      if (Object.prototype.toString.call(options) !== '[object Object]') {
        throw new Error(`Options for ${method}:${url} route must be an object`)
      } else if (options.handler) {
        if (typeof options.handler === 'function') {
          throw new Error(`Duplicate handler for ${method}:${url} route is not allowed!`)
        } else {
          throw new Error(`Handler for ${method}:${url} route must be a function`)
        }
      }
    }

    options = Object.assign({}, options, {
      method,
      url,
      handler: handler || (options && options.handler)
    })

    return route.call(this, options)
  }

  // Route management
  function route (opts) {
    throwIfAlreadyStarted('Cannot add route when fastify instance is already started!')

    if (Array.isArray(opts.method)) {
      for (var i = 0; i < opts.method.length; i++) {
        if (supportedMethods.indexOf(opts.method[i]) === -1) {
          throw new Error(`${opts.method[i]} method is not supported!`)
        }
      }
    } else {
      if (supportedMethods.indexOf(opts.method) === -1) {
        throw new Error(`${opts.method} method is not supported!`)
      }
    }

    if (!opts.handler) {
      throw new Error(`Missing handler function for ${opts.method}:${opts.url} route.`)
    }

    if (opts.errorHandler !== undefined && typeof opts.errorHandler !== 'function') {
      throw new Error(`Error Handler for ${opts.method}:${opts.url} route, if defined, must be a function`)
    }

    validateBodyLimitOption(opts.bodyLimit)

    const prefix = this[kRoutePrefix]

    this.after((notHandledErr, done) => {
      var path = opts.url || opts.path
      if (path === '/' && prefix.length > 0) {
        switch (opts.prefixTrailingSlash) {
          case 'slash':
            afterRouteAdded.call(this, path, notHandledErr, done)
            break
          case 'no-slash':
            afterRouteAdded.call(this, '', notHandledErr, done)
            break
          case 'both':
          default:
            afterRouteAdded.call(this, '', notHandledErr, done)
            // If ignoreTrailingSlash is set to true we need to add only the '' route to prevent adding an incomplete one.
            if (ignoreTrailingSlash !== true) {
              afterRouteAdded.call(this, path, notHandledErr, done)
            }
        }
      } else if (path[0] === '/' && prefix.endsWith('/')) {
        // Ensure that '/prefix/' + '/route' gets registered as '/prefix/route'
        afterRouteAdded.call(this, path.slice(1), notHandledErr, done)
      } else {
        afterRouteAdded.call(this, path, notHandledErr, done)
      }
    })

    // chainable api
    return this

    function afterRouteAdded (path, notHandledErr, done) {
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

      // run 'onRoute' hooks
      for (const hook of this[kHooks].onRoute) {
        try {
          hook.call(this, opts)
        } catch (error) {
          done(error)
          return
        }
      }

      const config = opts.config || {}
      config.url = url
      config.method = opts.method

      const context = new Context(
        opts.schema,
        opts.handler.bind(this),
        this[kReply],
        this[kRequest],
        this[kContentTypeParser],
        config,
        opts.errorHandler || this._errorHandler,
        opts.bodyLimit,
        opts.logLevel,
        opts.logSerializers,
        opts.attachValidation,
        this[kReplySerializerDefault]
      )

      try {
        router.on(opts.method, opts.url, { version: opts.version }, routeHandler, context)
      } catch (err) {
        done(err)
        return
      }

      // It can happen that a user registers a plugin with some hooks *after*
      // the route registration. To be sure to also load also those hooks,
      // we must listen for the avvio's preReady event, and update the context object accordingly.
      avvio.once('preReady', () => {
        for (const hook of lifecycleHooks) {
          const toSet = this[kHooks][hook]
            .concat(opts[hook] || [])
            .map(h => {
              const bound = h.bind(this)

              // Track hooks deprecation markers
              if (hook === 'preParsing') {
                // Check for deprecation syntax
                if (h.length === (h.constructor.name === 'AsyncFunction' ? 2 : 3)) {
                  warning.emit('FSTDEP004')
                  bound[kHooksDeprecatedPreParsing] = true
                }
              }

              return bound
            })
          context[hook] = toSet.length ? toSet : null
        }

        // Must store the 404 Context in 'preReady' because it is only guaranteed to
        // be available after all of the plugins and routes have been loaded.
        fourOhFour.setContext(this, context)

        if (opts.schema) {
          context.schema = normalizeSchema(context.schema)

          const schemaBucket = this[kSchemas]
          if (!opts.validatorCompiler && (
            !this[kValidatorCompiler] ||
            (this[kValidatorCompiler] && schemaBucket.hasNewSchemas()))) {
            // if the instance doesn't have a validator, build the default one for the single fastify instance
            this.setValidatorCompiler(buildPerformanceValidator(schemaBucket.getSchemas(), this[kOptions].ajv))
          }
          try {
            compileSchemasForValidation(context, opts.validatorCompiler || this[kValidatorCompiler])
          } catch (error) {
            throw new FST_ERR_SCH_VALIDATION_BUILD(opts.method, url, error.message)
          }

          if (opts.schema.response &&
            !opts.serializerCompiler &&
            (!this[kSerializerCompiler] || (this[kSerializerCompiler] && schemaBucket.hasNewSchemas()))) {
            // if the instance doesn't have a serializer, build the default one for the single fastify instance
            this.setSerializerCompiler(buildDefaultSerializer(schemaBucket.getSchemas()))
          }
          try {
            compileSchemasForSerialization(context, opts.serializerCompiler || this[kSerializerCompiler])
          } catch (error) {
            throw new FST_ERR_SCH_SERIALIZATION_BUILD(opts.method, url, error.message)
          }
        }
      })

      done(notHandledErr)
    }
  }

  // HTTP request entry point, the routing has already been executed
  function routeHandler (req, res, params, context) {
    if (closing === true) {
      if (req.httpVersionMajor !== 2) {
        res.once('finish', () => req.destroy())
        res.setHeader('Connection', 'close')
      }

      if (return503OnClosing) {
        const headers = {
          'Content-Type': 'application/json',
          'Content-Length': '80'
        }
        res.writeHead(503, headers)
        res.end('{"error":"Service Unavailable","message":"Service Unavailable","statusCode":503}')
        return
      }
    }

    var id = req.headers[requestIdHeader] || genReqId(req)

    var loggerOpts = {
      [requestIdLogLabel]: id,
      level: context.logLevel
    }

    if (context.logSerializers) {
      loggerOpts.serializers = context.logSerializers
    }
    var childLogger = logger.child(loggerOpts)
    childLogger[kDisableRequestLogging] = disableRequestLogging

    var queryPrefix = req.url.indexOf('?')
    var query = querystringParser(queryPrefix > -1 ? req.url.slice(queryPrefix + 1) : '')
    var request = new context.Request(id, params, req, query, childLogger, context)
    var reply = new context.Reply(res, request, childLogger)

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

function validateBodyLimitOption (bodyLimit) {
  if (bodyLimit === undefined) return
  if (!Number.isInteger(bodyLimit) || bodyLimit <= 0) {
    throw new TypeError(`'bodyLimit' option must be an integer > 0. Got '${bodyLimit}'`)
  }
}

function runPreParsing (err, request, reply) {
  if (reply.sent === true) return
  if (err != null) {
    reply.send(err)
    return
  }

  request[kRequestPayloadStream] = request.raw

  if (reply.context.preParsing !== null) {
    preParsingHookRunner(reply.context.preParsing, request, reply, handleRequest)
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
      if (err && !(err instanceof Error)) {
        reply[kReplyIsError] = true
      }

      cb(err, request, reply)
      return
    }

    const fn = functions[i++]
    let result

    if (fn[kHooksDeprecatedPreParsing]) {
      result = fn(request, reply, next)
    } else {
      result = fn(request, reply, request[kRequestPayloadStream], next)
    }

    if (result && typeof result.then === 'function') {
      result.then(handleResolve, handleReject)
    }
  }

  function handleResolve (stream) {
    next(null, stream)
  }

  function handleReject (err) {
    next(err)
  }

  next(null, request[kRequestPayloadStream])
}

function noop () { }

module.exports = { buildRouting, validateBodyLimitOption }
