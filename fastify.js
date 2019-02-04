'use strict'

const FindMyWay = require('find-my-way')
const Avvio = require('avvio')
const http = require('http')
const https = require('https')
const querystring = require('querystring')
const Middie = require('middie')
const lightMyRequest = require('light-my-request')
const abstractLogging = require('abstract-logging')
const proxyAddr = require('proxy-addr')

const {
  kChildren,
  kBodyLimit,
  kRoutePrefix,
  kLogLevel,
  kHooks,
  kSchemas,
  kContentTypeParser,
  kReply,
  kRequest,
  kMiddlewares,
  kCanSetNotFoundHandler,
  kFourOhFourLevelInstance,
  kFourOhFourContext
} = require('./lib/symbols.js')

const {
  codes: { FST_ERR_HTTP2_INVALID_VERSION }
} = require('./lib/errors')

const Reply = require('./lib/reply')
const Request = require('./lib/request')
const supportedMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS']
const buildSchema = require('./lib/validation').build
const handleRequest = require('./lib/handleRequest')
const validation = require('./lib/validation')
const isValidLogger = validation.isValidLogger
const buildSchemaCompiler = validation.buildSchemaCompiler
const decorator = require('./lib/decorate')
const ContentTypeParser = require('./lib/contentTypeParser')
const { Hooks, hookRunner, hookIterator, buildHooks } = require('./lib/hooks')
const { Schemas, buildSchemas } = require('./lib/schemas')
const loggerUtils = require('./lib/logger')
const pluginUtils = require('./lib/pluginUtils')
const reqIdGenFactory = require('./lib/reqIdGenFactory')

const DEFAULT_BODY_LIMIT = 1024 * 1024 // 1 MiB

function validateBodyLimitOption (bodyLimit) {
  if (bodyLimit === undefined) return
  if (!Number.isInteger(bodyLimit) || bodyLimit <= 0) {
    throw new TypeError(`'bodyLimit' option must be an integer > 0. Got '${bodyLimit}'`)
  }
}

function build (options) {
  options = options || {}
  if (typeof options !== 'object') {
    throw new TypeError('Options must be an object')
  }

  var log
  var hasLogger = true
  if (isValidLogger(options.logger)) {
    log = loggerUtils.createLogger({
      logger: options.logger,
      serializers: Object.assign({}, loggerUtils.serializers, options.logger.serializers)
    })
  } else if (!options.logger) {
    hasLogger = false
    log = Object.create(abstractLogging)
    log.child = () => log
  } else {
    options.logger = typeof options.logger === 'object' ? options.logger : {}
    options.logger.level = options.logger.level || 'info'
    options.logger.serializers = Object.assign({}, loggerUtils.serializers, options.logger.serializers)
    log = loggerUtils.createLogger(options.logger)
  }

  const fastify = {
    [kChildren]: []
  }
  const router = FindMyWay({
    defaultRoute: defaultRoute,
    ignoreTrailingSlash: options.ignoreTrailingSlash,
    maxParamLength: options.maxParamLength,
    caseSensitive: options.caseSensitive,
    versioning: options.versioning
  })

  const requestIdHeader = options.requestIdHeader || 'request-id'
  if (options.querystringParser && typeof options.querystringParser !== 'function') {
    throw new Error(`querystringParser option should be a function, instead got '${typeof options.querystringParser}'`)
  }
  const querystringParser = options.querystringParser || querystring.parse

  let genReqId = options.genReqId || reqIdGenFactory(requestIdHeader)

  if (options.logger && options.logger.genReqId) {
    process.emitWarning(`Using 'genReqId' in logger options is deprecated. Use fastify options instead. See: https://www.fastify.io/docs/latest/Server/#gen-request-id`)
    genReqId = options.logger.genReqId
  }

  fastify.printRoutes = router.prettyPrint.bind(router)

  const setupResponseListeners = Reply.setupResponseListeners

  // logger utils
  const handleTrustProxy = options.trustProxy ? _handleTrustProxy : _ipAsRemoteAddress
  const proxyFn = getTrustProxyFn()

  const avvio = Avvio(fastify, {
    autostart: false,
    timeout: Number(options.pluginTimeout) || 10000
  })
  // Override to allow the plugin incapsulation
  avvio.override = override

  var listening = false
  var closing = false
  // true when Fastify is ready to go
  var started = false
  avvio.on('start', () => {
    started = true
  })

  function throwIfAlreadyStarted (msg) {
    if (started) throw new Error(msg)
  }

  var server
  const httpHandler = router.lookup.bind(router)
  if (options.serverFactory) {
    server = options.serverFactory(httpHandler, options)
  } else if (options.https) {
    if (options.http2) {
      server = http2().createSecureServer(options.https, httpHandler)
    } else {
      server = https.createServer(options.https, httpHandler)
    }
  } else if (options.http2) {
    server = http2().createServer(httpHandler)
  } else {
    server = http.createServer(httpHandler)
  }

  avvio.once('preReady', () => {
    fastify.onClose((instance, done) => {
      closing = true
      if (listening) {
        instance.server.close(done)
      } else {
        done(null)
      }
    })
  })

  if (Number(process.version.match(/v(\d+)/)[1]) >= 6) {
    server.on('clientError', handleClientError)
  }

  // body limit option
  validateBodyLimitOption(options.bodyLimit)
  fastify[kBodyLimit] = options.bodyLimit || DEFAULT_BODY_LIMIT

  // shorthand methods
  fastify.delete = _delete
  fastify.get = _get
  fastify.head = _head
  fastify.patch = _patch
  fastify.post = _post
  fastify.put = _put
  fastify.options = _options
  fastify.all = _all
  // extended route
  fastify.route = route
  fastify[kRoutePrefix] = ''
  fastify[kLogLevel] = ''

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

  // expose logger instance
  fastify.log = log

  // hooks
  fastify.addHook = addHook
  fastify[kHooks] = new Hooks()

  // schemas
  fastify.addSchema = addSchema
  fastify[kSchemas] = new Schemas()
  fastify.getSchemas = fastify[kSchemas].getSchemas.bind(fastify[kSchemas])

  const onRouteHooks = []

  // custom parsers
  fastify.addContentTypeParser = addContentTypeParser
  fastify.hasContentTypeParser = hasContentTypeParser
  fastify[kContentTypeParser] = new ContentTypeParser(fastify[kBodyLimit], options.onProtoPoisoning)

  fastify.setSchemaCompiler = setSchemaCompiler
  fastify.setSchemaCompiler(buildSchemaCompiler())

  // plugin
  fastify.register = fastify.use
  fastify.listen = listen
  fastify.server = server
  fastify[pluginUtils.registeredPlugins] = []

  // extend server methods
  fastify.decorate = decorator.add
  fastify.hasDecorator = decorator.exist
  fastify.decorateReply = decorator.decorateReply
  fastify.decorateRequest = decorator.decorateRequest
  fastify.hasRequestDecorator = decorator.existRequest
  fastify.hasReplyDecorator = decorator.existReply

  fastify[kReply] = Reply.buildReply(Reply)
  fastify[kRequest] = Request.buildRequest(Request)

  // middleware support
  fastify.use = use
  fastify[kMiddlewares] = []

  // fake http injection
  fastify.inject = inject

  var fourOhFour = FindMyWay({ defaultRoute: fourOhFourFallBack })
  fastify[kCanSetNotFoundHandler] = true
  fastify[kFourOhFourLevelInstance] = fastify
  fastify[kFourOhFourContext] = null
  fastify.setNotFoundHandler = setNotFoundHandler
  fastify.setNotFoundHandler() // Set the default 404 handler

  fastify.setErrorHandler = setErrorHandler

  return fastify

  function getTrustProxyFn () {
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

  function _handleTrustProxy (req) {
    req.ip = proxyAddr(req, proxyFn)
    req.ips = proxyAddr.all(req, proxyFn)
    if (req.ip !== undefined) {
      req.hostname = req.headers['x-forwarded-host']
    }
  }

  function _ipAsRemoteAddress (req) {
    req.ip = req.connection.remoteAddress
  }

  function routeHandler (req, res, params, context) {
    if (closing === true) {
      res.writeHead(503, {
        'Content-Type': 'application/json',
        'Content-Length': '80',
        'Connection': 'close'
      })
      res.end('{"error":"Service Unavailable","message":"Service Unavailable","statusCode":503}')
      setImmediate(() => req.destroy())
      return
    }

    req.id = genReqId(req)
    handleTrustProxy(req)
    req.hostname = req.hostname || req.headers['host']
    req.log = res.log = log.child({ reqId: req.id, level: context.logLevel })
    req.originalUrl = req.url

    req.log.info({ req }, 'incoming request')

    var queryPrefix = req.url.indexOf('?')
    var query = querystringParser(queryPrefix > -1 ? req.url.slice(queryPrefix + 1) : '')
    var request = new context.Request(params, req, query, req.headers, req.log)
    var reply = new context.Reply(res, context, request, res.log)

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

  function listenPromise (port, address, backlog) {
    if (listening) {
      return Promise.reject(new Error('Fastify is already listening'))
    }

    return fastify.ready().then(() => {
      var errEventHandler
      var errEvent = new Promise((resolve, reject) => {
        errEventHandler = (err) => {
          listening = false
          reject(err)
        }
        server.once('error', errEventHandler)
      })
      var listen = new Promise((resolve, reject) => {
        server.listen(port, address, backlog, () => {
          server.removeListener('error', errEventHandler)
          resolve(logServerAddress(server.address(), options.https))
        })
        // we set it afterwards because listen can throw
        listening = true
      })

      return Promise.race([
        errEvent, // e.g invalid port range error is always emitted before the server listening
        listen
      ])
    })
  }

  function listen (port, address, backlog, cb) {
    /* Deal with listen (cb) */
    if (typeof port === 'function') {
      cb = port
      port = 0
    }

    /* Deal with listen (port, cb) */
    if (typeof address === 'function') {
      cb = address
      address = undefined
    }

    // This will listen to what localhost is.
    // It can be 127.0.0.1 or ::1, depending on the operating system.
    // Fixes https://github.com/fastify/fastify/issues/1022.
    address = address || 'localhost'

    /* Deal with listen (port, address, cb) */
    if (typeof backlog === 'function') {
      cb = backlog
      backlog = undefined
    }

    if (cb === undefined) return listenPromise(port, address, backlog)

    fastify.ready(function (err) {
      if (err != null) return cb(err)

      if (listening) {
        return cb(new Error('Fastify is already listening'), null)
      }

      server.once('error', wrap)
      if (backlog) {
        server.listen(port, address, backlog, wrap)
      } else {
        server.listen(port, address, wrap)
      }

      listening = true
    })

    function wrap (err) {
      server.removeListener('error', wrap)
      if (!err) {
        address = logServerAddress(server.address(), options.https)
        cb(null, address)
      } else {
        listening = false
        cb(err, null)
      }
    }
  }

  function logServerAddress (address, isHttps) {
    const isUnixSocket = typeof address === 'string'
    if (!isUnixSocket) {
      if (address.address.indexOf(':') === -1) {
        address = address.address + ':' + address.port
      } else {
        address = '[' + address.address + ']:' + address.port
      }
    }
    address = (isUnixSocket ? '' : ('http' + (isHttps ? 's' : '') + '://')) + address
    fastify.log.info('Server listening at ' + address)
    return address
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
    instance[kContentTypeParser] = ContentTypeParser.buildContentTypeParser(instance[kContentTypeParser])
    instance[kHooks] = buildHooks(instance[kHooks])
    instance[kRoutePrefix] = buildRoutePrefix(instance[kRoutePrefix], opts.prefix)
    instance[kLogLevel] = opts.logLevel || instance[kLogLevel]
    instance[kMiddlewares] = old[kMiddlewares].slice()
    instance[kSchemas] = buildSchemas(old[kSchemas])
    instance.getSchemas = instance[kSchemas].getSchemas.bind(instance[kSchemas])
    instance[pluginUtils.registeredPlugins] = Object.create(instance[pluginUtils.registeredPlugins])

    if (opts.prefix) {
      instance[kCanSetNotFoundHandler] = true
      instance[kFourOhFourLevelInstance] = instance
    }

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

  // Shorthand methods
  function _delete (url, opts, handler) {
    return _route(this, 'DELETE', url, opts, handler)
  }

  function _get (url, opts, handler) {
    return _route(this, 'GET', url, opts, handler)
  }

  function _head (url, opts, handler) {
    return _route(this, 'HEAD', url, opts, handler)
  }

  function _patch (url, opts, handler) {
    return _route(this, 'PATCH', url, opts, handler)
  }

  function _post (url, opts, handler) {
    return _route(this, 'POST', url, opts, handler)
  }

  function _put (url, opts, handler) {
    return _route(this, 'PUT', url, opts, handler)
  }

  function _options (url, opts, handler) {
    return _route(this, 'OPTIONS', url, opts, handler)
  }

  function _all (url, opts, handler) {
    return _route(this, supportedMethods, url, opts, handler)
  }

  function _route (_fastify, method, url, options, handler) {
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

    return _fastify.route(options)
  }

  // Route management
  function route (opts) {
    throwIfAlreadyStarted('Cannot add route when fastify instance is already started!')

    const _fastify = this

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

    const prefix = _fastify[kRoutePrefix]

    _fastify.after(function (notHandledErr, done) {
      var path = opts.url || opts.path
      if (path === '/' && prefix.length > 0) {
        // Ensure that '/prefix' + '/' gets registered as '/prefix'
        afterRouteAdded('', notHandledErr, done)
      } else if (path[0] === '/' && prefix.endsWith('/')) {
        // Ensure that '/prefix/' + '/route' gets registered as '/prefix/route'
        path = path.slice(1)
      }

      afterRouteAdded(path, notHandledErr, done)
    })

    // chainable api
    return _fastify

    function afterRouteAdded (path, notHandledErr, done) {
      const url = prefix + path

      opts.url = url
      opts.path = url
      opts.prefix = prefix
      opts.logLevel = opts.logLevel || _fastify[kLogLevel]

      if (opts.attachValidation == null) {
        opts.attachValidation = false
      }

      // run 'onRoute' hooks
      for (var h of onRouteHooks) {
        h.call(_fastify, opts)
      }

      const config = opts.config || {}
      config.url = url

      const context = new Context(
        opts.schema,
        opts.handler.bind(_fastify),
        _fastify[kReply],
        _fastify[kRequest],
        _fastify[kContentTypeParser],
        config,
        _fastify._errorHandler,
        opts.bodyLimit,
        opts.logLevel,
        opts.attachValidation
      )

      try {
        buildSchema(context, opts.schemaCompiler || _fastify._schemaCompiler, _fastify[kSchemas])
      } catch (error) {
        done(error)
        return
      }

      if (opts.preHandler == null && opts.beforeHandler != null) {
        beforeHandlerWarning()
        opts.preHandler = opts.beforeHandler
      }

      if (opts.preHandler) {
        if (Array.isArray(opts.preHandler)) {
          opts.preHandler = opts.preHandler.map(hook => hook.bind(_fastify))
        } else {
          opts.preHandler = opts.preHandler.bind(_fastify)
        }
      }

      if (opts.preValidation) {
        if (Array.isArray(opts.preValidation)) {
          opts.preValidation = opts.preValidation.map(hook => hook.bind(_fastify))
        } else {
          opts.preValidation = opts.preValidation.bind(_fastify)
        }
      }

      if (opts.preParsing) {
        if (Array.isArray(opts.preParsing)) {
          opts.preParsing = opts.preParsing.map(hook => hook.bind(_fastify))
        } else {
          opts.preParsing = opts.preParsing.bind(_fastify)
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
        const onRequest = _fastify[kHooks].onRequest
        const onResponse = _fastify[kHooks].onResponse
        const onSend = _fastify[kHooks].onSend
        const onError = _fastify[kHooks].onError
        const preParsing = _fastify[kHooks].preParsing.concat(opts.preParsing || [])
        const preValidation = _fastify[kHooks].preValidation.concat(opts.preValidation || [])
        const preSerialization = _fastify[kHooks].preSerialization.concat(opts.preSerialization || [])
        const preHandler = _fastify[kHooks].preHandler.concat(opts.preHandler || [])

        context.onRequest = onRequest.length ? onRequest : null
        context.preParsing = preParsing.length ? preParsing : null
        context.preValidation = preValidation.length ? preValidation : null
        context.preSerialization = preSerialization.length ? preSerialization : null
        context.preHandler = preHandler.length ? preHandler : null
        context.onSend = onSend.length ? onSend : null
        context.onError = onError.length ? onError : null
        context.onResponse = onResponse.length ? onResponse : null

        context._middie = buildMiddie(_fastify[kMiddlewares])

        // Must store the 404 Context in 'preReady' because it is only guaranteed to
        // be available after all of the plugins and routes have been loaded.
        const _404Context = Object.assign({}, _fastify[kFourOhFourContext])
        _404Context.onSend = context.onSend
        context[kFourOhFourContext] = _404Context
      })

      done(notHandledErr)
    }
  }

  function defaultErrorHandler (error, request, reply) {
    var res = reply.res
    if (res.statusCode >= 500) {
      res.log.error({ req: reply.request.raw, res: res, err: error }, error && error.message)
    } else if (res.statusCode >= 400) {
      res.log.info({ res: res, err: error }, error && error.message)
    }
    reply.send(error)
  }

  function Context (schema, handler, Reply, Request, contentTypeParser, config, errorHandler, bodyLimit, logLevel, attachValidation) {
    this.schema = schema
    this.handler = handler
    this.Reply = Reply
    this.Request = Request
    this.contentTypeParser = contentTypeParser
    this.onRequest = null
    this.onSend = null
    this.onError = null
    this.preHandler = null
    this.onResponse = null
    this.config = config
    this.errorHandler = errorHandler || defaultErrorHandler
    this._middie = null
    this._parserOptions = {
      limit: bodyLimit || null
    }
    this.logLevel = logLevel
    this[kFourOhFourContext] = null
    this.attachValidation = attachValidation
  }

  function inject (opts, cb) {
    if (started) {
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

  function use (url, fn) {
    throwIfAlreadyStarted('Cannot call "use" when fastify instance is already started!')
    if (typeof url === 'string') {
      const prefix = this[kRoutePrefix]
      url = prefix + (url === '/' && prefix.length > 0 ? '' : url)
    }
    return this.after((err, done) => {
      addMiddleware(this, [url, fn])
      done(err)
    })
  }

  function addMiddleware (instance, middleware) {
    instance[kMiddlewares].push(middleware)
    instance[kChildren].forEach(child => addMiddleware(child, middleware))
  }

  function addHook (name, fn) {
    throwIfAlreadyStarted('Cannot call "addHook" when fastify instance is already started!')

    if (name === 'onClose') {
      this[kHooks].validate(name, fn)
      this.onClose(fn)
    } else if (name === 'onRoute') {
      this[kHooks].validate(name, fn)
      onRouteHooks.push(fn)
    } else {
      this.after((err, done) => {
        _addHook(this, name, fn)
        done(err)
      })
    }
    return this
  }

  function _addHook (instance, name, fn) {
    instance[kHooks].add(name, fn.bind(instance))
    instance[kChildren].forEach(child => _addHook(child, name, fn))
  }

  function addSchema (schema) {
    throwIfAlreadyStarted('Cannot call "addSchema" when fastify instance is already started!')
    this[kSchemas].add(schema)
    this[kChildren].forEach(child => child.addSchema(schema))
    return this
  }

  function addContentTypeParser (contentType, opts, parser) {
    throwIfAlreadyStarted('Cannot call "addContentTypeParser" when fastify instance is already started!')

    if (typeof opts === 'function') {
      parser = opts
      opts = {}
    }

    if (!opts) {
      opts = {}
    }

    if (!opts.bodyLimit) {
      opts.bodyLimit = this[kBodyLimit]
    }

    if (Array.isArray(contentType)) {
      contentType.forEach((type) => this[kContentTypeParser].add(type, opts, parser))
    } else {
      this[kContentTypeParser].add(contentType, opts, parser)
    }

    return this
  }

  function hasContentTypeParser (contentType, fn) {
    return this[kContentTypeParser].hasParser(contentType)
  }

  function handleClientError (err, socket) {
    const body = JSON.stringify({
      error: http.STATUS_CODES['400'],
      message: 'Client Error',
      statusCode: 400
    })
    log.debug({ err }, 'client error')
    socket.end(`HTTP/1.1 400 Bad Request\r\nContent-Length: ${body.length}\r\nContent-Type: application/json\r\n\r\n${body}`)
  }

  function defaultRoute (req, res) {
    if (req.headers['accept-version'] !== undefined) {
      req.headers['accept-version'] = undefined
    }
    fourOhFour.lookup(req, res)
  }

  function basic404 (req, reply) {
    reply.code(404).send(new Error('Not Found'))
  }

  function fourOhFourFallBack (req, res) {
    // if this happen, we have a very bad bug
    // we might want to do some hard debugging
    // here, let's print out as much info as
    // we can
    req.id = genReqId(req)
    req.log = res.log = log.child({ reqId: req.id })
    req.originalUrl = req.url

    req.log.info({ req }, 'incoming request')

    var request = new Request(null, req, null, req.headers, req.log)
    var reply = new Reply(res, { onSend: [], onError: [] }, request, res.log)

    request.log.warn('the default handler for 404 did not catch this, this is likely a fastify bug, please report it')
    request.log.warn(fourOhFour.prettyPrint())
    reply.code(404).send(new Error('Not Found'))
  }

  function setNotFoundHandler (opts, handler) {
    throwIfAlreadyStarted('Cannot call "setNotFoundHandler" when fastify instance is already started!')

    const _fastify = this
    const prefix = this[kRoutePrefix] || '/'

    if (this[kCanSetNotFoundHandler] === false) {
      throw new Error(`Not found handler already set for Fastify instance with prefix: '${prefix}'`)
    }

    if (typeof opts === 'object') {
      if (opts.preHandler == null && opts.beforeHandler != null) {
        beforeHandlerWarning()
        opts.preHandler = opts.beforeHandler
      }
      if (opts.preHandler) {
        if (Array.isArray(opts.preHandler)) {
          opts.preHandler = opts.preHandler.map(hook => hook.bind(_fastify))
        } else {
          opts.preHandler = opts.preHandler.bind(_fastify)
        }
      }

      if (opts.preValidation) {
        if (Array.isArray(opts.preValidation)) {
          opts.preValidation = opts.preValidation.map(hook => hook.bind(_fastify))
        } else {
          opts.preValidation = opts.preValidation.bind(_fastify)
        }
      }
    }

    if (typeof opts === 'function') {
      handler = opts
      opts = undefined
    }
    opts = opts || {}

    if (handler) {
      this[kFourOhFourLevelInstance][kCanSetNotFoundHandler] = false
      handler = handler.bind(this)
    } else {
      handler = basic404
    }

    this.after((notHandledErr, done) => {
      _setNotFoundHandler.call(this, prefix, opts, handler)
      done(notHandledErr)
    })
  }

  function _setNotFoundHandler (prefix, opts, handler) {
    const context = new Context(
      opts.schema,
      handler,
      this[kReply],
      this[kRequest],
      this[kContentTypeParser],
      opts.config || {},
      this._errorHandler,
      this[kBodyLimit],
      this[kLogLevel]
    )

    avvio.once('preReady', () => {
      const context = this[kFourOhFourContext]

      const onRequest = this[kHooks].onRequest
      const preParsing = this[kHooks].preParsing.concat(opts.preParsing || [])
      const preValidation = this[kHooks].preValidation.concat(opts.preValidation || [])
      const preSerialization = this[kHooks].preSerialization.concat(opts.preSerialization || [])
      const preHandler = this[kHooks].preHandler.concat(opts.beforeHandler || opts.preHandler || [])
      const onSend = this[kHooks].onSend
      const onError = this[kHooks].onError
      const onResponse = this[kHooks].onResponse

      context.onRequest = onRequest.length ? onRequest : null
      context.preParsing = preParsing.length ? preParsing : null
      context.preValidation = preValidation.length ? preValidation : null
      context.preSerialization = preSerialization.length ? preSerialization : null
      context.preHandler = preHandler.length ? preHandler : null
      context.onSend = onSend.length ? onSend : null
      context.onError = onError.length ? onError : null
      context.onResponse = onResponse.length ? onResponse : null

      context._middie = buildMiddie(this[kMiddlewares])
    })

    if (this[kFourOhFourContext] !== null && prefix === '/') {
      Object.assign(this[kFourOhFourContext], context) // Replace the default 404 handler
      return
    }

    this[kFourOhFourLevelInstance][kFourOhFourContext] = context

    fourOhFour.all(prefix + (prefix.endsWith('/') ? '*' : '/*'), routeHandler, context)
    fourOhFour.all(prefix || '/', routeHandler, context)
  }

  function setSchemaCompiler (schemaCompiler) {
    throwIfAlreadyStarted('Cannot call "setSchemaCompiler" when fastify instance is already started!')

    this._schemaCompiler = schemaCompiler
    return this
  }

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

  function beforeHandlerWarning () {
    if (beforeHandlerWarning.called) return
    beforeHandlerWarning.called = true
    process.emitWarning('The route option `beforeHandler` has been deprecated, use `preHandler` instead')
  }
}

function http2 () {
  try {
    return require('http2')
  } catch (err) {
    throw new FST_ERR_HTTP2_INVALID_VERSION()
  }
}

module.exports = build
