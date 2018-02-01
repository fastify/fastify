'use strict'

const FindMyWay = require('find-my-way')
const avvio = require('avvio')
const http = require('http')
const https = require('https')
const Middie = require('middie')
const hookRunner = require('./lib/hookRunner')
const lightMyRequest = require('light-my-request')
const abstractLogging = require('abstract-logging')

const Reply = require('./lib/reply')
const Request = require('./lib/request')
const supportedMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS']
const buildSchema = require('./lib/validation').build
const handleRequest = require('./lib/handleRequest')
const validation = require('./lib/validation')
const isValidLogger = validation.isValidLogger
const buildSchemaCompiler = validation.buildSchemaCompiler
const decorator = require('./lib/decorate')
const ContentTypeParser = require('./lib/ContentTypeParser')
const Hooks = require('./lib/hooks')
const Schemas = require('./lib/schemas')
const loggerUtils = require('./lib/logger')
const pluginUtils = require('./lib/pluginUtils')

const DEFAULT_JSON_BODY_LIMIT = 1024 * 1024 // 1 MiB

function validateBodyLimitOption (jsonBodyLimit) {
  if (jsonBodyLimit === undefined) return
  if (!Number.isInteger(jsonBodyLimit) || jsonBodyLimit <= 0) {
    throw new TypeError(`'jsonBodyLimit' option must be an integer > 0. Got '${jsonBodyLimit}'`)
  }
}

function build (options) {
  options = options || {}
  if (typeof options !== 'object') {
    throw new TypeError('Options must be an object')
  }

  var log
  if (isValidLogger(options.logger)) {
    log = loggerUtils.createLogger({
      logger: options.logger,
      serializers: Object.assign({}, loggerUtils.serializers, options.logger.serializers)
    })
  } else if (!options.logger) {
    log = Object.create(abstractLogging)
    log.child = () => log
  } else {
    options.logger = typeof options.logger === 'object' ? options.logger : {}
    options.logger.level = options.logger.level || 'info'
    options.logger.serializers = Object.assign({}, loggerUtils.serializers, options.logger.serializers)
    log = loggerUtils.createLogger(options.logger)
  }

  const fastify = {}
  const router = FindMyWay({
    defaultRoute: defaultRoute,
    ignoreTrailingSlash: options.ignoreTrailingSlash,
    maxParamLength: options.maxParamLength
  })

  fastify.printRoutes = router.prettyPrint.bind(router)

  // logger utils
  const customGenReqId = options.logger ? options.logger.genReqId : null
  const genReqId = customGenReqId || loggerUtils.reqIdGenFactory()
  const now = loggerUtils.now
  const onResponseIterator = loggerUtils.onResponseIterator
  const onResponseCallback = loggerUtils.onResponseCallback

  const app = avvio(fastify, {
    autostart: false
  })
  // Override to allow the plugin incapsulation
  app.override = override

  var listening = false
  // true when Fastify is ready to go
  var started = false
  app.on('start', () => {
    started = true
  })

  function throwIfAlreadyBound (msg) {
    if (started) throw new Error(msg)
  }

  var server
  const httpHandler = router.lookup.bind(router)
  if (options.https) {
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

  fastify.onClose((instance, done) => {
    if (listening) {
      instance.server.close(done)
    } else {
      done(null)
    }
  })

  if (Number(process.versions.node[0]) >= 6) {
    server.on('clientError', handleClientError)
  }

  // JSON body limit option
  validateBodyLimitOption(options.jsonBodyLimit)
  fastify._jsonBodyLimit = options.jsonBodyLimit || DEFAULT_JSON_BODY_LIMIT

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

  const onRouteHooks = []

  // custom parsers
  fastify.addContentTypeParser = addContentTypeParser
  fastify.hasContentTypeParser = hasContentTypeParser
  fastify._contentTypeParser = new ContentTypeParser()

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

  fastify._Reply = Reply.buildReply(Reply)
  fastify._Request = Request.buildRequest(Request)

  // middleware support
  fastify.use = use
  fastify._middlewares = []

  // fake http injection (for testing purposes)
  fastify.inject = inject

  var fourOhFour = FindMyWay({ defaultRoute: fourOhFourFallBack })
  fastify.setNotFoundHandler = setNotFoundHandler
  fastify._notFoundHandler = null
  fastify._404Context = null
  fastify.setNotFoundHandler() // Set the default 404 handler

  fastify.setErrorHandler = setErrorHandler

  return fastify

  function routeHandler (req, res, params, context) {
    res._context = context
    req.id = genReqId(req)
    req.log = res.log = log.child({ reqId: req.id, level: context.logLevel })
    req.originalUrl = req.url

    req.log.info({ req }, 'incoming request')

    res._startTime = now()
    res.on('finish', onResFinished)
    res.on('error', onResFinished)

    if (context.onRequest !== null) {
      context.onRequest(
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
      ctx.onResponse(
        onResponseIterator,
        this,
        onResponseCallback
      )
    } else {
      onResponseCallback(err, this)
    }
  }

  function listen (port, address, cb) {
    /* Deal with listen (port, cb) */
    if (typeof address === 'function') {
      cb = address
      address = undefined
    }
    address = address || '127.0.0.1'

    if (cb === undefined) {
      return new Promise((resolve, reject) => {
        fastify.listen(port, address, err => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    }

    fastify.ready(function (err) {
      if (err) return cb(err)
      if (listening) {
        return cb(new Error('Fastify is already listening'))
      }

      server.on('error', wrap)
      server.listen(port, address, wrap)
      listening = true
    })

    function wrap (err) {
      if (!err) {
        let address = server.address()
        if (typeof address === 'object') {
          if (address.address.indexOf(':') === -1) {
            address = address.address + ':' + address.port
          } else {
            address = '[' + address.address + ']:' + address.port
          }
        }
        address = 'http' + (options.https ? 's' : '') + '://' + address
        fastify.log.info('Server listening at ' + address)
      }

      server.removeListener('error', wrap)
      cb(err)
    }
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
    instance._Reply = Reply.buildReply(instance._Reply)
    instance._Request = Request.buildRequest(instance._Request)
    instance._contentTypeParser = ContentTypeParser.buildContentTypeParser(instance._contentTypeParser)
    instance._hooks = Hooks.buildHooks(instance._hooks)
    instance._routePrefix = buildRoutePrefix(instance._routePrefix, opts.prefix)
    instance._logLevel = opts.logLevel || instance._logLevel
    instance._middlewares = old._middlewares.slice()
    instance[pluginUtils.registeredPlugins] = Object.create(instance[pluginUtils.registeredPlugins])

    if (opts.prefix) {
      instance._notFoundHandler = null
      instance._404Context = null
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
    }

    options = Object.assign({}, options, {
      method,
      url,
      handler
    })

    return _fastify.route(options)
  }

  // Route management
  function route (opts) {
    throwIfAlreadyBound('Cannot add route when fastify instance is already started!')

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

    validateBodyLimitOption(opts.jsonBodyLimit)

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
      opts.jsonBodyLimit = opts.jsonBodyLimit || _fastify._jsonBodyLimit

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
        buildMiddie(_fastify._middlewares),
        opts.jsonBodyLimit,
        opts.logLevel,
        _fastify
      )

      try {
        buildSchema(context, opts.schemaCompiler || _fastify._schemaCompiler, _fastify._schemas)
      } catch (error) {
        done(error)
        return
      }

      const onRequest = _fastify._hooks.onRequest
      const onResponse = _fastify._hooks.onResponse
      const onSend = _fastify._hooks.onSend
      const preHandler = _fastify._hooks.preHandler.concat(opts.beforeHandler || [])

      context.onRequest = onRequest.length ? hookRunner(onRequest, _fastify) : null
      context.onResponse = onResponse.length ? hookRunner(onResponse, _fastify) : null
      context.onSend = onSend.length ? hookRunner(onSend, _fastify) : null
      context.preHandler = preHandler.length ? hookRunner(preHandler, _fastify) : null

      try {
        router.on(opts.method, url, routeHandler, context)
      } catch (err) {
        done(err)
        return
      }

      done(notHandledErr)
    })

    // chainable api
    return _fastify
  }

  function Context (schema, handler, Reply, Request, contentTypeParser, config, errorHandler, middie, jsonBodyLimit, logLevel, fastify) {
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
    this._middie = middie
    this._jsonParserOptions = {
      limit: jsonBodyLimit
    }
    this._fastify = fastify
    this.logLevel = logLevel
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
      return new Promise((resolve, reject) => {
        this.ready(err => {
          if (err) return reject(err)
          resolve()
        })
      }).then(() => lightMyRequest(httpHandler, opts))
    }
  }

  function use (url, fn) {
    throwIfAlreadyBound('Cannot call "use" when fastify instance is already started!')
    if (typeof url === 'string') {
      const prefix = this._routePrefix
      url = prefix + (url === '/' && prefix.length > 0 ? '' : url)
    }
    this._middlewares.push([url, fn])
    return this
  }

  function addHook (name, fn) {
    throwIfAlreadyBound('Cannot call "addHook" when fastify instance is already started!')

    if (name === 'onClose') {
      this._hooks.validate(name, fn)
      this.onClose(fn)
    } else if (name === 'onRoute') {
      this._hooks.validate(name, fn)
      onRouteHooks.push(fn)
    } else {
      this._hooks.add(name, fn)
    }
    return this
  }

  function addSchema (name, schema) {
    throwIfAlreadyBound('Cannot call "addSchema" when fastify instance is already started!')
    this._schemas.add(name, schema)
    return this
  }

  function addContentTypeParser (contentType, fn) {
    throwIfAlreadyBound('Cannot call "addContentTypeParser" when fastify instance is already started!')

    this._contentTypeParser.add(contentType, fn)
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
    socket.end(`HTTP/1.1 400 Bad Request\r\nContent-Length: ${body.length}\r\nContent-Type: 'application/json'\r\n\r\n${body}`)
  }

  function defaultRoute (req, res) {
    fourOhFour.lookup(req, res)
  }

  function basic404 (req, reply) {
    reply.code(404).send(new Error('Not found'))
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
    const reply = new Reply(res, { onSend: hookRunner([], null) }, request)
    reply.code(404).send(new Error('Not found'))
  }

  function setNotFoundHandler (opts, handler) {
    throwIfAlreadyBound('Cannot call "setNotFoundHandler" when fastify instance is already started!')

    if (this._notFoundHandler !== null && this._notFoundHandler !== basic404) {
      throw new Error(`Not found handler already set for Fastify instance with prefix: '${this._routePrefix || '/'}'`)
    }

    if (typeof opts === 'function') {
      handler = opts
      opts = undefined
    }
    opts = opts || {}
    handler = handler ? handler.bind(this) : basic404

    this._notFoundHandler = handler

    this.after((notHandledErr, done) => {
      _setNotFoundHandler.call(this, opts, handler)
      done(notHandledErr)
    })
  }

  function _setNotFoundHandler (opts, handler) {
    const context = new Context(
      opts.schema,
      handler,
      this._Reply,
      this._Request,
      this._contentTypeParser,
      opts.config || {},
      this._errorHandler,
      buildMiddie(this._middlewares),
      this._jsonBodyLimit,
      this._logLevel,
      null
    )

    const onRequest = this._hooks.onRequest
    const preHandler = this._hooks.preHandler
    const onSend = this._hooks.onSend
    const onResponse = this._hooks.onResponse

    context.onRequest = onRequest.length ? hookRunner(onRequest, this) : null
    context.preHandler = preHandler.length ? hookRunner(preHandler, this) : null
    context.onSend = onSend.length ? hookRunner(onSend, this) : null
    context.onResponse = onResponse.length ? hookRunner(onResponse, this) : null

    if (this._404Context !== null) {
      Object.assign(this._404Context, context) // Replace the default 404 handler
      return
    }

    this._404Context = context

    const prefix = this._routePrefix

    fourOhFour.all(prefix + (prefix.endsWith('/') ? '*' : '/*'), routeHandler, context)
    fourOhFour.all(prefix || '/', routeHandler, context)
  }

  function setSchemaCompiler (schemaCompiler) {
    throwIfAlreadyBound('Cannot call "setSchemaCompiler" when fastify instance is already started!')

    this._schemaCompiler = schemaCompiler
    return this
  }

  function setErrorHandler (func) {
    throwIfAlreadyBound('Cannot call "setErrorHandler" when fastify instance is already started!')

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
