'use strict'

const FindMyWay = require('find-my-way')
const proxyAddr = require('proxy-addr')
const Context = require('./context')
const { buildMiddie, onRunMiddlewares } = require('./middleware')
const { hookRunner, hookIterator } = require('./hooks')
const supportedMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS']
const supportedHooks = ['preParsing', 'preValidation', 'onRequest', 'preHandler', 'preSerialization', 'onResponse']
const validation = require('./validation')
const buildSchema = validation.build
const { buildSchemaCompiler } = validation
const { beforeHandlerWarning } = require('./warnings')

const {
  codes: {
    FST_ERR_SCH_BUILD,
    FST_ERR_SCH_MISSING_COMPILER
  }
} = require('./errors')

const {
  kRoutePrefix,
  kLogLevel,
  kHooks,
  kSchemas,
  kSchemaCompiler,
  kSchemaResolver,
  kContentTypeParser,
  kReply,
  kReplySerializerDefault,
  kRequest,
  kMiddlewares,
  kGlobalHooks,
  kDisableRequestLogging
} = require('./symbols.js')

function buildRouting (options) {
  const router = FindMyWay(options.config)

  const schemaCache = new Map()
  schemaCache.put = schemaCache.set

  let avvio
  let fourOhFour
  let trustProxy
  let requestIdHeader
  let querystringParser
  let requestIdLogLabel
  let logger
  let hasLogger
  let setupResponseListeners
  let throwIfAlreadyStarted
  let proxyFn
  let modifyCoreObjects
  let genReqId
  let disableRequestLogging
  let ignoreTrailingSlash
  let return503OnClosing

  let closing = false

  return {
    setup (options, fastifyArgs) {
      avvio = fastifyArgs.avvio
      fourOhFour = fastifyArgs.fourOhFour
      logger = fastifyArgs.logger
      hasLogger = fastifyArgs.hasLogger
      setupResponseListeners = fastifyArgs.setupResponseListeners
      throwIfAlreadyStarted = fastifyArgs.throwIfAlreadyStarted

      proxyFn = getTrustProxyFn(options)
      trustProxy = options.trustProxy
      requestIdHeader = options.requestIdHeader
      querystringParser = options.querystringParser
      requestIdLogLabel = options.requestIdLogLabel
      modifyCoreObjects = options.modifyCoreObjects
      genReqId = options.genReqId
      disableRequestLogging = options.disableRequestLogging
      ignoreTrailingSlash = options.ignoreTrailingSlash
      return503OnClosing = Object.prototype.hasOwnProperty.call(options, 'return503OnClosing') ? options.return503OnClosing : true
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

    validateBodyLimitOption(opts.bodyLimit)

    if (opts.preHandler == null && opts.beforeHandler != null) {
      beforeHandlerWarning()
      opts.preHandler = opts.beforeHandler
    }

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
      opts.prefix = prefix
      opts.logLevel = opts.logLevel || this[kLogLevel]

      if (opts.attachValidation == null) {
        opts.attachValidation = false
      }

      // run 'onRoute' hooks
      for (const hook of this[kGlobalHooks].onRoute) {
        try {
          hook.call(this, opts)
        } catch (error) {
          done(error)
          return
        }
      }

      const config = opts.config || {}
      config.url = url

      const context = new Context(
        opts.schema,
        opts.handler.bind(this),
        this[kReply],
        this[kRequest],
        this[kContentTypeParser],
        config,
        this._errorHandler,
        opts.bodyLimit,
        opts.logLevel,
        opts.attachValidation,
        this[kReplySerializerDefault]
      )

      // TODO this needs to be refactored so that buildSchemaCompiler is
      // not called for every single route. Creating a new one for every route
      // is going to be very expensive.
      if (opts.schema) {
        if (this[kSchemaCompiler] == null && this[kSchemaResolver]) {
          done(new FST_ERR_SCH_MISSING_COMPILER(opts.method, url))
          return
        }

        try {
          if (opts.schemaCompiler == null && this[kSchemaCompiler] == null) {
            const externalSchemas = this[kSchemas].getJsonSchemas({ onlyAbsoluteUri: true })
            this.setSchemaCompiler(buildSchemaCompiler(externalSchemas, schemaCache))
          }

          buildSchema(context, opts.schemaCompiler || this[kSchemaCompiler], this[kSchemas], this[kSchemaResolver])
        } catch (error) {
          // bubble up the FastifyError instance
          done(error.code ? error : new FST_ERR_SCH_BUILD(opts.method, url, error.message))
          return
        }
      }

      for (const hook of supportedHooks) {
        if (opts[hook]) {
          if (Array.isArray(opts[hook])) {
            opts[hook] = opts[hook].map(fn => fn.bind(this))
          } else {
            opts[hook] = opts[hook].bind(this)
          }
        }
      }

      try {
        router.on(opts.method, url, { version: opts.version }, routeHandler, context)
      } catch (err) {
        done(err)
        return
      }

      // It can happen that a user register a plugin with some hooks/middlewares *after*
      // the route registration. To be sure to load also that hooks/middlewares,
      // we must listen for the avvio's preReady event, and update the context object accordingly.
      avvio.once('preReady', () => {
        const onResponse = this[kHooks].onResponse
        const onSend = this[kHooks].onSend
        const onError = this[kHooks].onError

        context.onSend = onSend.length ? onSend : null
        context.onError = onError.length ? onError : null
        context.onResponse = onResponse.length ? onResponse : null

        for (const hook of supportedHooks) {
          const toSet = this[kHooks][hook].concat(opts[hook] || [])
          context[hook] = toSet.length ? toSet : null
        }

        context._middie = buildMiddie(this[kMiddlewares])

        // Must store the 404 Context in 'preReady' because it is only guaranteed to
        // be available after all of the plugins and routes have been loaded.
        fourOhFour.setContext(this, context)
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

    req.id = req.headers[requestIdHeader] || genReqId(req)
    req.originalUrl = req.url
    var hostname = req.headers.host
    var ip = req.connection.remoteAddress
    var ips

    if (trustProxy) {
      ip = proxyAddr(req, proxyFn)
      ips = proxyAddr.all(req, proxyFn)
      if (ip !== undefined && req.headers['x-forwarded-host']) {
        hostname = req.headers['x-forwarded-host']
      }
    }

    var childLogger = logger.child({ [requestIdLogLabel]: req.id, level: context.logLevel })
    childLogger[kDisableRequestLogging] = disableRequestLogging

    // added hostname, ip, and ips back to the Node req object to maintain backward compatibility
    if (modifyCoreObjects) {
      req.hostname = hostname
      req.ip = ip
      req.ips = ips

      req.log = res.log = childLogger
    }

    if (disableRequestLogging === false) {
      childLogger.info({ req }, 'incoming request')
    }

    var queryPrefix = req.url.indexOf('?')
    var query = querystringParser(queryPrefix > -1 ? req.url.slice(queryPrefix + 1) : '')
    var request = new context.Request(params, req, query, req.headers, childLogger, ip, ips, hostname)
    var reply = new context.Reply(res, context, request, childLogger)

    if (hasLogger === true || context.onResponse !== null) {
      setupResponseListeners(reply)
    }

    if (context.onRequest !== null) {
      hookRunner(
        context.onRequest,
        hookIterator,
        request,
        reply,
        middlewareCallback
      )
    } else {
      middlewareCallback(null, request, reply)
    }
  }
}

function validateBodyLimitOption (bodyLimit) {
  if (bodyLimit === undefined) return
  if (!Number.isInteger(bodyLimit) || bodyLimit <= 0) {
    throw new TypeError(`'bodyLimit' option must be an integer > 0. Got '${bodyLimit}'`)
  }
}

function middlewareCallback (err, request, reply) {
  if (reply.sent === true) return
  if (err != null) {
    reply.send(err)
    return
  }

  if (reply.context._middie !== null) {
    reply.context._middie.run(request.raw, reply.res, reply)
  } else {
    onRunMiddlewares(null, null, null, reply)
  }
}

function getTrustProxyFn (options) {
  const tp = options.trustProxy
  if (typeof tp === 'function') {
    return tp
  }
  if (tp === true) {
    // Support plain true/false
    return function () { return true }
  }
  if (typeof tp === 'number') {
    // Support trusting hop count
    return function (a, i) { return i < tp }
  }
  if (typeof tp === 'string') {
    // Support comma-separated tps
    const vals = tp.split(',').map(it => it.trim())
    return proxyAddr.compile(vals)
  }
  return proxyAddr.compile(tp || [])
}

module.exports = { buildRouting, validateBodyLimitOption }
