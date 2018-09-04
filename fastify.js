'use strict'

const FindMyWay = require('find-my-way')
const avvio = require('avvio')
const http = require('http')
const https = require('https')
const Middie = require('middie')
const lightMyRequest = require('light-my-request')
const abstractLogging = require('abstract-logging')
const proxyAddr = require('proxy-addr')

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
const Hooks = require('./lib/hooks')
const Schemas = require('./lib/schemas')
const loggerUtils = require('./lib/logger')
const pluginUtils = require('./lib/pluginUtils')
const runHooks = require('./lib/hookRunner').hookRunner

const DEFAULT_BODY_LIMIT = 1024 * 1024 // 1 MiB
const childrenKey = Symbol('fastify.children')

function validateBodyLimitOption (bodyLimit) {
  if (bodyLimit === undefined) return
  if (!Number.isInteger(bodyLimit) || bodyLimit <= 0) {
    throw new TypeError(`'bodyLimit' option must be an integer > 0. Got '${bodyLimit}'`)
  }
}

function noop () { }

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
    [childrenKey]: []
  }
  const router = FindMyWay({
    defaultRoute: defaultRoute,
    ignoreTrailingSlash: options.ignoreTrailingSlash,
    maxParamLength: options.maxParamLength,
    caseSensitive: options.caseSensitive
  })

  const requestIdHeader = options.requestIdHeader || 'request-id'

  fastify.printRoutes = router.prettyPrint.bind(router)

  // logger utils
  const customGenReqId = options.logger ? options.logger.genReqId : null
  const handleTrustProxy = options.trustProxy ? _handleTrustProxy : _ipAsRemoteAddress
  const proxyFn = getTrustProxyFn()
  const genReqId = customGenReqId || loggerUtils.reqIdGenFactory(requestIdHeader)
  const now = loggerUtils.now
  const onResponseIterator = loggerUtils.onResponseIterator
  const onResponseCallback = hasLogger ? loggerUtils.onResponseCallback : noop

  const app = avvio(fastify, {
    autostart: false,
    timeout: Number(options.pluginTimeout) || 0
  })
  // Override to allow the plugin incapsulation
  app.override = override

  var listening = false
  var closing = false
  // true when Fastify is ready to go
  var started = false
  app.on('start', () => {
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

  app.once('preReady', () => {
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
  fastify._bodyLimit = options.bodyLimit || DEFAULT_BODY_LIMIT

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
  fastify._routePrefix = ''
  fastify._logLevel = ''

  Object.defineProperty(fastify, 'basePath', {
    get: function () {
      return this._routePrefix
    }
  })

  // expose logger instance
  fastify.log = log

  // hooks
  fastify.addHook = addHook
  fastify._hooks = new Hooks()

  // schemas
  fastify.addSchema = addSchema
  fastify._schemas = new Schemas()
  fastify.getSchemas = fastify._schemas.getSchemas.bind(fastify._schemas)

  const onRouteHooks = []

  // custom parsers
  fastify.addContentTypeParser = addContentTypeParser
  fastify.hasContentTypeParser = hasContentTypeParser
  fastify._contentTypeParser = new ContentTypeParser(fastify._bodyLimit)

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

  fastify._Reply = Reply.buildReply(Reply)
  fastify._Request = Request.buildRequest(Request)

  // middleware support
  fastify.use = use
  fastify._middlewares = []

  // fake http injection
  fastify.inject = inject

  var fourOhFour = FindMyWay({ defaultRoute: fourOhFourFallBack })
  fastify._canSetNotFoundHandler = true
  fastify._404LevelInstance = fastify
  fastify._404Context = null
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
    res._startTime = hasLogger ? now() : undefined
    res._context = context

    req.log.info({ req }, 'incoming request')

    if (hasLogger === true || context.onResponse !== null) {
      res.on('finish', onResFinished)
      res.on('error', onResFinished)
    }

    if (context.onRequest !== null) {
      runHooks(
        context.onRequest,
        hookIterator,
        new State(req, res, params, context),
        middlewareCallback
      )
    } else {
      middlewareCallback(null, new State(req, res, params, context))
    }
  }

  function onResFinished (err) {
    this.removeListener('finish', onResFinished)
    this.removeListener('error', onResFinished)

    var ctx = this._context

    if (ctx && ctx.onResponse !== null) {
      // deferring this with setImmediate will
      // slow us by 10%
      runHooks(
        ctx.onResponse,
        onResponseIterator,
        this,
        onResponseCallback
      )
    } else {
      onResponseCallback(err, this)
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
      if (err) return cb(err)

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

  function State (req, res, params, context) {
    this.req = req
    this.res = res
    this.params = params
    this.context = context
  }

  function hookIterator (fn, state, next) {
    if (state.res.finished === true) return undefined
    return fn(state.req, state.res, next)
  }

  function middlewareCallback (err, state) {
    if (state.res.finished === true) return
    if (err) {
      const req = state.req
      const request = new state.context.Request(state.params, req, null, req.headers, req.log)
      const reply = new state.context.Reply(state.res, state.context, request)
      reply.send(err)
      return
    }

    if (state.context._middie !== null) {
      state.context._middie.run(state.req, state.res, state)
    } else {
      onRunMiddlewares(null, state.req, state.res, state)
    }
  }

  function onRunMiddlewares (err, req, res, state) {
    if (err) {
      const request = new state.context.Request(state.params, req, null, req.headers, req.log)
      const reply = new state.context.Reply(res, state.context, request)
      reply.send(err)
      return
    }

    handleRequest(req, res, state.params, state.context)
  }

  function override (old, fn, opts) {
    const shouldSkipOverride = pluginUtils.registerPlugin.call(old, fn)
    if (shouldSkipOverride) {
      return old
    }

    const instance = Object.create(old)
    old[childrenKey].push(instance)
    instance[childrenKey] = []
    instance._Reply = Reply.buildReply(instance._Reply)
    instance._Request = Request.buildRequest(instance._Request)
    instance._contentTypeParser = ContentTypeParser.buildContentTypeParser(instance._contentTypeParser)
    instance._hooks = Hooks.buildHooks(instance._hooks)
    instance._routePrefix = buildRoutePrefix(instance._routePrefix, opts.prefix)
    instance._logLevel = opts.logLevel || instance._logLevel
    instance._middlewares = old._middlewares.slice()
    instance[pluginUtils.registeredPlugins] = Object.create(instance[pluginUtils.registeredPlugins])

    if (opts.prefix) {
      instance._canSetNotFoundHandler = true
      instance._404LevelInstance = instance
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

    _fastify.after(function afterRouteAdded (notHandledErr, done) {
      const prefix = _fastify._routePrefix
      var path = opts.url || opts.path
      if (path === '/' && prefix.length > 0) {
        // Ensure that '/prefix' + '/' gets registered as '/prefix'
        path = ''
      } else if (path[0] === '/' && prefix.endsWith('/')) {
        // Ensure that '/prefix/' + '/route' gets registered as '/prefix/route'
        path = path.slice(1)
      }
      const url = prefix + path

      opts.url = url
      opts.path = url
      opts.prefix = prefix
      opts.logLevel = opts.logLevel || _fastify._logLevel

      // run 'onRoute' hooks
      for (var h of onRouteHooks) {
        h.call(_fastify, opts)
      }

      const config = opts.config || {}
      config.url = url

      const context = new Context(
        opts.schema,
        opts.handler.bind(_fastify),
        _fastify._Reply,
        _fastify._Request,
        _fastify._contentTypeParser,
        config,
        _fastify._errorHandler,
        opts.bodyLimit,
        opts.logLevel
      )

      try {
        buildSchema(context, opts.schemaCompiler || _fastify._schemaCompiler, _fastify._schemas)
      } catch (error) {
        done(error)
        return
      }

      if (opts.beforeHandler) {
        if (Array.isArray(opts.beforeHandler)) {
          opts.beforeHandler.forEach((h, i) => {
            opts.beforeHandler[i] = h.bind(_fastify)
          })
        } else {
          opts.beforeHandler = opts.beforeHandler.bind(_fastify)
        }
      }

      try {
        router.on(opts.method, url, { version: opts.version }, routeHandler, context)
      } catch (err) {
        done(err)
        return
      }

      // It can happen that a user register a plugin with some hooks/middlewares *after*
      // the route registration. To be sure to load also that hoooks/middlwares,
      // we must listen for the avvio's preReady event, and update the context object accordingly.
      app.once('preReady', () => {
        const onRequest = _fastify._hooks.onRequest
        const onResponse = _fastify._hooks.onResponse
        const onSend = _fastify._hooks.onSend
        const preHandler = _fastify._hooks.preHandler.concat(opts.beforeHandler || [])

        context.onRequest = onRequest.length ? onRequest : null
        context.preHandler = preHandler.length ? preHandler : null
        context.onSend = onSend.length ? onSend : null
        context.onResponse = onResponse.length ? onResponse : null

        context._middie = buildMiddie(_fastify._middlewares)

        // Must store the 404 Context in 'preReady' because it is only guaranteed to
        // be available after all of the plugins and routes have been loaded.
        const _404Context = Object.assign({}, _fastify._404Context)
        _404Context.onSend = context.onSend
        context._404Context = _404Context
      })

      done(notHandledErr)
    })

    // chainable api
    return _fastify
  }

  function Context (schema, handler, Reply, Request, contentTypeParser, config, errorHandler, bodyLimit, logLevel) {
    this.schema = schema
    this.handler = handler
    this.Reply = Reply
    this.Request = Request
    this.contentTypeParser = contentTypeParser
    this.onRequest = null
    this.onSend = null
    this.preHandler = null
    this.onResponse = null
    this.config = config
    this.errorHandler = errorHandler
    this._middie = null
    this._parserOptions = {
      limit: bodyLimit || null
    }
    this.logLevel = logLevel
    this._404Context = null
  }

  function inject (opts, cb) {
    if (started) {
      return lightMyRequest(httpHandler, opts, cb)
    }

    if (cb) {
      this.ready(err => {
        if (err) throw err
        return lightMyRequest(httpHandler, opts, cb)
      })
    } else {
      return this.ready()
        .then(() => lightMyRequest(httpHandler, opts))
    }
  }

  function use (url, fn) {
    throwIfAlreadyStarted('Cannot call "use" when fastify instance is already started!')
    if (typeof url === 'string') {
      const prefix = this._routePrefix
      url = prefix + (url === '/' && prefix.length > 0 ? '' : url)
    }
    return this.after((err, done) => {
      addMiddleware(this, [url, fn])
      done(err)
    })
  }

  function addMiddleware (instance, middleware) {
    instance._middlewares.push(middleware)
    instance[childrenKey].forEach(child => addMiddleware(child, middleware))
  }

  function addHook (name, fn) {
    throwIfAlreadyStarted('Cannot call "addHook" when fastify instance is already started!')

    if (name === 'onClose') {
      this._hooks.validate(name, fn)
      this.onClose(fn)
    } else if (name === 'onRoute') {
      this._hooks.validate(name, fn)
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
    instance._hooks.add(name, fn.bind(instance))
    instance[childrenKey].forEach(child => _addHook(child, name, fn))
  }

  function addSchema (name, schema) {
    throwIfAlreadyStarted('Cannot call "addSchema" when fastify instance is already started!')
    this._schemas.add(name, schema)
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
      opts.bodyLimit = this._bodyLimit
    }

    if (Array.isArray(contentType)) {
      contentType.forEach((type) => this._contentTypeParser.add(type, opts, parser))
    } else {
      this._contentTypeParser.add(contentType, opts, parser)
    }

    return this
  }

  function hasContentTypeParser (contentType, fn) {
    return this._contentTypeParser.hasParser(contentType)
  }

  function handleClientError (e, socket) {
    const body = JSON.stringify({
      error: http.STATUS_CODES['400'],
      message: 'Client Error',
      statusCode: 400
    })
    log.error(e, 'client error')
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

    res._startTime = now()
    res.on('finish', onResFinished)
    res.on('error', onResFinished)

    req.log.warn('the default handler for 404 did not catch this, this is likely a fastify bug, please report it')
    req.log.warn(fourOhFour.prettyPrint())
    const request = new Request(null, req, null, req.headers, req.log)
    const reply = new Reply(res, { onSend: [] }, request)
    reply.code(404).send(new Error('Not Found'))
  }

  function setNotFoundHandler (opts, handler) {
    throwIfAlreadyStarted('Cannot call "setNotFoundHandler" when fastify instance is already started!')

    const _fastify = this
    const prefix = this._routePrefix || '/'

    if (this._canSetNotFoundHandler === false) {
      throw new Error(`Not found handler already set for Fastify instance with prefix: '${prefix}'`)
    }

    if (typeof opts === 'object' && opts.beforeHandler) {
      if (Array.isArray(opts.beforeHandler)) {
        opts.beforeHandler.forEach((h, i) => {
          opts.beforeHandler[i] = h.bind(_fastify)
        })
      } else {
        opts.beforeHandler = opts.beforeHandler.bind(_fastify)
      }
    }

    if (typeof opts === 'function') {
      handler = opts
      opts = undefined
    }
    opts = opts || {}

    if (handler) {
      this._404LevelInstance._canSetNotFoundHandler = false
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
      this._Reply,
      this._Request,
      this._contentTypeParser,
      opts.config || {},
      this._errorHandler,
      this._bodyLimit,
      this._logLevel
    )

    app.once('preReady', () => {
      const context = this._404Context

      const onRequest = this._hooks.onRequest
      const preHandler = this._hooks.preHandler.concat(opts.beforeHandler || [])
      const onSend = this._hooks.onSend
      const onResponse = this._hooks.onResponse

      context.onRequest = onRequest.length ? onRequest : null
      context.preHandler = preHandler.length ? preHandler : null
      context.onSend = onSend.length ? onSend : null
      context.onResponse = onResponse.length ? onResponse : null

      context._middie = buildMiddie(this._middlewares)
    })

    if (this._404Context !== null && prefix === '/') {
      Object.assign(this._404Context, context) // Replace the default 404 handler
      return
    }

    this._404LevelInstance._404Context = context

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
}

function http2 () {
  try {
    return require('http2')
  } catch (err) {
    console.error('http2 is available only from node >= 8.8.1')
  }
}

module.exports = build
