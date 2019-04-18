'use strict'

const FindMyWay = require('find-my-way')
const Avvio = require('avvio')
const http = require('http')
const querystring = require('querystring')
const Middie = require('middie')
let lightMyRequest
const proxyAddr = require('proxy-addr')

const {
  kChildren,
  kBodyLimit,
  kRoutePrefix,
  kLogLevel,
  kHooks,
  kSchemas,
  kSchemaCompiler,
  kContentTypeParser,
  kReply,
  kRequest,
  kMiddlewares,
  kFourOhFour,
  kState,
  kOptions,
  kGlobalHooks
} = require('./lib/symbols.js')

const { createServer } = require('./lib/server')
const Reply = require('./lib/reply')
const Request = require('./lib/request')
const Context = require('./lib/context')
const supportedMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS']
const buildSchema = require('./lib/validation').build
const handleRequest = require('./lib/handleRequest')
const validation = require('./lib/validation')
const buildSchemaCompiler = validation.buildSchemaCompiler
const decorator = require('./lib/decorate')
const ContentTypeParser = require('./lib/contentTypeParser')
const { Hooks, hookRunner, hookIterator, buildHooks } = require('./lib/hooks')
const { Schemas, buildSchemas } = require('./lib/schemas')
const { createLogger } = require('./lib/logger')
const pluginUtils = require('./lib/pluginUtils')
const reqIdGenFactory = require('./lib/reqIdGenFactory')
const build404 = require('./lib/fourOhFour')
const { beforeHandlerWarning } = require('./lib/warnings')
const getSecuredInitialConfig = require('./lib/initialConfigValidation')
const { defaultInitOptions } = getSecuredInitialConfig

function build (options) {
  // Options validations
  options = options || {}

  if (typeof options !== 'object') {
    throw new TypeError('Options must be an object')
  }

  if (options.querystringParser && typeof options.querystringParser !== 'function') {
    throw new Error(`querystringParser option should be a function, instead got '${typeof options.querystringParser}'`)
  }

  validateBodyLimitOption(options.bodyLimit)

  if (options.logger && options.logger.genReqId) {
    process.emitWarning(`Using 'genReqId' in logger options is deprecated. Use fastify options instead. See: https://www.fastify.io/docs/latest/Server/#gen-request-id`)
    options.genReqId = options.logger.genReqId
  }

  const trustProxy = options.trustProxy
  const modifyCoreObjects = options.modifyCoreObjects !== false
  const requestIdHeader = options.requestIdHeader || defaultInitOptions.requestIdHeader
  const querystringParser = options.querystringParser || querystring.parse
  const genReqId = options.genReqId || reqIdGenFactory()
  const requestIdLogLabel = options.requestIdLogLabel || 'reqId'
  const bodyLimit = options.bodyLimit || defaultInitOptions.bodyLimit

  // Instance Fastify components
  const { logger, hasLogger } = createLogger(options)

  // Update the options with the fixed values
  options.logger = logger
  options.modifyCoreObjects = modifyCoreObjects
  options.genReqId = genReqId

  // Default router
  const router = FindMyWay({
    defaultRoute: defaultRoute,
    ignoreTrailingSlash: options.ignoreTrailingSlash || defaultInitOptions.ignoreTrailingSlash,
    maxParamLength: options.maxParamLength || defaultInitOptions.maxParamLength,
    caseSensitive: options.caseSensitive,
    versioning: options.versioning
  })
  // 404 router, used for handling encapsulated 404 handlers
  const fourOhFour = build404(options)

  // HTTP server and its handler
  const httpHandler = router.lookup.bind(router)
  const { server, listen } = createServer(options, httpHandler)
  if (Number(process.version.match(/v(\d+)/)[1]) >= 6) {
    server.on('clientError', handleClientError)
  }

  const setupResponseListeners = Reply.setupResponseListeners
  const proxyFn = getTrustProxyFn(options)
  const schemas = new Schemas()

  // Public API
  const fastify = {
    // Fastify internals
    [kState]: {
      listening: false,
      closing: false,
      started: false
    },
    [kOptions]: options,
    [kChildren]: [],
    [kBodyLimit]: bodyLimit,
    [kRoutePrefix]: '',
    [kLogLevel]: '',
    [kHooks]: new Hooks(),
    [kSchemas]: schemas,
    [kSchemaCompiler]: null,
    [kContentTypeParser]: new ContentTypeParser(bodyLimit, (options.onProtoPoisoning || defaultInitOptions.onProtoPoisoning)),
    [kReply]: Reply.buildReply(Reply),
    [kRequest]: Request.buildRequest(Request),
    [kMiddlewares]: [],
    [kFourOhFour]: fourOhFour,
    [kGlobalHooks]: {
      onRoute: [],
      onRegister: []
    },
    [pluginUtils.registeredPlugins]: [],
    // routes shorthand methods
    delete: function _delete (url, opts, handler) {
      return prepareRoute.call(this, 'DELETE', url, opts, handler)
    },
    get: function _get (url, opts, handler) {
      return prepareRoute.call(this, 'GET', url, opts, handler)
    },
    head: function _head (url, opts, handler) {
      return prepareRoute.call(this, 'HEAD', url, opts, handler)
    },
    patch: function _patch (url, opts, handler) {
      return prepareRoute.call(this, 'PATCH', url, opts, handler)
    },
    post: function _post (url, opts, handler) {
      return prepareRoute.call(this, 'POST', url, opts, handler)
    },
    put: function _put (url, opts, handler) {
      return prepareRoute.call(this, 'PUT', url, opts, handler)
    },
    options: function _options (url, opts, handler) {
      return prepareRoute.call(this, 'OPTIONS', url, opts, handler)
    },
    all: function _all (url, opts, handler) {
      return prepareRoute.call(this, supportedMethods, url, opts, handler)
    },
    // extended route
    route: route,
    // expose logger instance
    log: logger,
    // hooks
    addHook: addHook,
    // schemas
    addSchema: addSchema,
    getSchemas: schemas.getSchemas.bind(schemas),
    setSchemaCompiler: setSchemaCompiler,
    // custom parsers
    addContentTypeParser: ContentTypeParser.helpers.addContentTypeParser,
    hasContentTypeParser: ContentTypeParser.helpers.hasContentTypeParser,
    // Fastify architecture methods (initialized by Avvio)
    register: null,
    after: null,
    ready: null,
    onClose: null,
    close: null,
    // http server
    listen: listen,
    server: server,
    // extend fastify objects
    decorate: decorator.add,
    hasDecorator: decorator.exist,
    decorateReply: decorator.decorateReply,
    decorateRequest: decorator.decorateRequest,
    hasRequestDecorator: decorator.existRequest,
    hasReplyDecorator: decorator.existReply,
    // middleware support
    use: use,
    // fake http injection
    inject: inject,
    // pretty print of the registered routes
    printRoutes: router.prettyPrint.bind(router),
    // custom error handling
    setNotFoundHandler: setNotFoundHandler,
    setErrorHandler: setErrorHandler,
    // Set fastify initial configuration options read-only object
    initialConfig: getSecuredInitialConfig(options)
  }

  Object.defineProperty(fastify, 'schemaCompiler', {
    get: function () {
      return this[kSchemaCompiler]
    },
    set: function (schemaCompiler) {
      this.setSchemaCompiler(schemaCompiler)
    }
  })

  Object.defineProperty(fastify, 'prefix', {
    get: function () {
      return this[kRoutePrefix]
    }
  })

  Object.defineProperty(fastify, 'basePath', {
    get: function () {
      process.emitWarning('basePath is deprecated. Use prefix instead. See: https://www.fastify.io/docs/latest/Server/#prefix')
      return this[kRoutePrefix]
    }
  })

  // Install and configure Avvio
  // Avvio will update the following Fastify methods:
  // - register
  // - after
  // - ready
  // - onClose
  // - close
  const avvio = Avvio(fastify, {
    autostart: false,
    timeout: Number(options.pluginTimeout) || defaultInitOptions.pluginTimeout,
    expose: { use: 'register' }
  })
  // Override to allow the plugin incapsulation
  avvio.override = override
  avvio.on('start', () => (fastify[kState].started = true))
  // cache the closing value, since we are checking it in an hot path
  var closing = false
  avvio.once('preReady', () => {
    fastify.onClose((instance, done) => {
      fastify[kState].closing = true
      closing = true
      if (fastify[kState].listening) {
        instance.server.close(done)
      } else {
        done(null)
      }
    })
  })

  // Set the default 404 handler
  fastify.setNotFoundHandler()
  fourOhFour.arrange404(fastify)

  const schemaCache = new Map()
  schemaCache.put = schemaCache.set

  return fastify

  // HTTP request entry point, the routing has already been executed
  function routeHandler (req, res, params, context) {
    if (closing === true) {
      const headers = {
        'Content-Type': 'application/json',
        'Content-Length': '80'
      }
      if (req.httpVersionMajor !== 2) {
        headers.Connection = 'close'
      }
      res.writeHead(503, headers)
      res.end('{"error":"Service Unavailable","message":"Service Unavailable","statusCode":503}')
      if (req.httpVersionMajor !== 2) {
        // This is not needed in HTTP/2
        setImmediate(() => req.destroy())
      }
      return
    }

    req.id = req.headers[requestIdHeader] || genReqId(req)
    req.originalUrl = req.url
    var hostname = req.headers['host']
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

    // added hostname, ip, and ips back to the Node req object to maintain backward compatibility
    if (modifyCoreObjects) {
      req.hostname = hostname
      req.ip = ip
      req.ips = ips

      req.log = res.log = childLogger
    }

    childLogger.info({ req }, 'incoming request')

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

  function onRunMiddlewares (err, req, res, reply) {
    if (err != null) {
      reply.send(err)
      return
    }

    if (reply.context.preParsing !== null) {
      hookRunner(
        reply.context.preParsing,
        hookIterator,
        reply.request,
        reply,
        handleRequest
      )
    } else {
      handleRequest(null, reply.request, reply)
    }
  }

  function throwIfAlreadyStarted (msg) {
    if (fastify[kState].started) throw new Error(msg)
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
            afterRouteAdded.call(this, path, notHandledErr, done)
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
      for (const hook of this[kGlobalHooks].onRoute) hook.call(this, opts)

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
        opts.attachValidation
      )

      // TODO this needs to be refactored so that buildSchemaCompiler is
      // not called for every single route. Creating a new one for every route
      // is going to be very expensive.
      if (opts.schema) {
        try {
          if (opts.schemaCompiler == null && this[kSchemaCompiler] == null) {
            const externalSchemas = this[kSchemas].getJsonSchemas({ onlyAbsoluteUri: true })
            this.setSchemaCompiler(buildSchemaCompiler(externalSchemas, schemaCache))
          }

          buildSchema(context, opts.schemaCompiler || this[kSchemaCompiler], this[kSchemas])
        } catch (error) {
          done(error)
          return
        }
      }

      if (opts.preHandler == null && opts.beforeHandler != null) {
        beforeHandlerWarning()
        opts.preHandler = opts.beforeHandler
      }

      const hooks = ['preParsing', 'preValidation', 'onRequest', 'preHandler', 'preSerialization']

      for (let hook of hooks) {
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

        for (let hook of hooks) {
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

  // HTTP injection handling
  // If the server is not ready yet, this
  // utility will automatically force it.
  function inject (opts, cb) {
    // lightMyRequest is dynamically laoded as it seems very expensive
    // because of Ajv
    if (lightMyRequest === undefined) {
      lightMyRequest = require('light-my-request')
    }

    if (fastify[kState].started) {
      return lightMyRequest(httpHandler, opts, cb)
    }

    if (cb) {
      this.ready(err => {
        if (err) cb(err, null)
        else lightMyRequest(httpHandler, opts, cb)
      })
    } else {
      return this.ready()
        .then(() => lightMyRequest(httpHandler, opts))
    }
  }

  // wrapper tha we expose to the user for middlewares handling
  function use (url, fn) {
    throwIfAlreadyStarted('Cannot call "use" when fastify instance is already started!')
    if (typeof url === 'string') {
      const prefix = this[kRoutePrefix]
      url = prefix + (url === '/' && prefix.length > 0 ? '' : url)
    }
    return this.after((err, done) => {
      addMiddleware.call(this, [url, fn])
      done(err)
    })

    function addMiddleware (middleware) {
      this[kMiddlewares].push(middleware)
      this[kChildren].forEach(child => addMiddleware.call(child, middleware))
    }
  }

  // wrapper that we expose to the user for hooks handling
  function addHook (name, fn) {
    throwIfAlreadyStarted('Cannot call "addHook" when fastify instance is already started!')

    if (name === 'onClose') {
      this[kHooks].validate(name, fn)
      this.onClose(fn)
    } else if (name === 'onRoute') {
      this[kHooks].validate(name, fn)
      this[kGlobalHooks].onRoute.push(fn)
    } else if (name === 'onRegister') {
      this[kHooks].validate(name, fn)
      this[kGlobalHooks].onRegister.push(fn)
    } else {
      this.after((err, done) => {
        _addHook.call(this, name, fn)
        done(err)
      })
    }
    return this

    function _addHook (name, fn) {
      this[kHooks].add(name, fn.bind(this))
      this[kChildren].forEach(child => _addHook.call(child, name, fn))
    }
  }

  // wrapper that we expose to the user for schemas handling
  function addSchema (schema) {
    throwIfAlreadyStarted('Cannot call "addSchema" when fastify instance is already started!')
    this[kSchemas].add(schema)
    this[kChildren].forEach(child => child.addSchema(schema))
    return this
  }

  function handleClientError (err, socket) {
    const body = JSON.stringify({
      error: http.STATUS_CODES['400'],
      message: 'Client Error',
      statusCode: 400
    })
    logger.debug({ err }, 'client error')
    socket.end(`HTTP/1.1 400 Bad Request\r\nContent-Length: ${body.length}\r\nContent-Type: application/json\r\n\r\n${body}`)
  }

  // If the router does not match any route, every request will land here
  // req and res are Node.js core objects
  function defaultRoute (req, res) {
    if (req.headers['accept-version'] !== undefined) {
      req.headers['accept-version'] = undefined
    }
    fourOhFour.router.lookup(req, res)
  }

  function setNotFoundHandler (opts, handler) {
    throwIfAlreadyStarted('Cannot call "setNotFoundHandler" when fastify instance is already started!')

    fourOhFour.setNotFoundHandler.call(this, opts, handler, avvio, routeHandler, buildMiddie)
  }

  // wrapper that we expose to the user for schemas compiler handling
  function setSchemaCompiler (schemaCompiler) {
    throwIfAlreadyStarted('Cannot call "setSchemaCompiler" when fastify instance is already started!')

    this[kSchemaCompiler] = schemaCompiler
    return this
  }

  // wrapper that we expose to the user for configure the custom error handler
  function setErrorHandler (func) {
    throwIfAlreadyStarted('Cannot call "setErrorHandler" when fastify instance is already started!')

    this._errorHandler = func
    return this
  }

  function buildMiddie (middlewares) {
    if (!middlewares.length) {
      return null
    }

    const middie = Middie(onRunMiddlewares)
    for (var i = 0; i < middlewares.length; i++) {
      middie.use.apply(middie, middlewares[i])
    }

    return middie
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

function validateBodyLimitOption (bodyLimit) {
  if (bodyLimit === undefined) return
  if (!Number.isInteger(bodyLimit) || bodyLimit <= 0) {
    throw new TypeError(`'bodyLimit' option must be an integer > 0. Got '${bodyLimit}'`)
  }
}

// Function that runs the encapsulation magic.
// Everything that need to be encapsulated must be handled in this function.
function override (old, fn, opts) {
  const shouldSkipOverride = pluginUtils.registerPlugin.call(old, fn)
  if (shouldSkipOverride) {
    return old
  }

  const instance = Object.create(old)
  old[kChildren].push(instance)
  instance[kChildren] = []
  instance[kReply] = Reply.buildReply(instance[kReply])
  instance[kRequest] = Request.buildRequest(instance[kRequest])
  instance[kContentTypeParser] = ContentTypeParser.helpers.buildContentTypeParser(instance[kContentTypeParser])
  instance[kHooks] = buildHooks(instance[kHooks])
  instance[kRoutePrefix] = buildRoutePrefix(instance[kRoutePrefix], opts.prefix)
  instance[kLogLevel] = opts.logLevel || instance[kLogLevel]
  instance[kMiddlewares] = old[kMiddlewares].slice()
  instance[kSchemas] = buildSchemas(old[kSchemas])
  instance.getSchemas = instance[kSchemas].getSchemas.bind(instance[kSchemas])
  instance[pluginUtils.registeredPlugins] = Object.create(instance[pluginUtils.registeredPlugins])

  if (opts.prefix) {
    instance[kFourOhFour].arrange404(instance)
  }

  for (const hook of instance[kGlobalHooks].onRegister) hook.call(this, instance)

  return instance
}

function buildRoutePrefix (instancePrefix, pluginPrefix) {
  if (!pluginPrefix) {
    return instancePrefix
  }

  // Ensure that there is a '/' between the prefixes
  if (instancePrefix.endsWith('/')) {
    if (pluginPrefix[0] === '/') {
      // Remove the extra '/' to avoid: '/first//second'
      pluginPrefix = pluginPrefix.slice(1)
    }
  } else if (pluginPrefix[0] !== '/') {
    pluginPrefix = '/' + pluginPrefix
  }

  return instancePrefix + pluginPrefix
}

module.exports = build
