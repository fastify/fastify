'use strict'

const FindMyWay = require('find-my-way')
const avvio = require('avvio')
const Ajv = require('ajv')
const http = require('http')
const https = require('https')
const Middie = require('middie')
const runHooks = require('fast-iterator')
const lightMyRequest = require('light-my-request')
const abstractLogging = require('abstract-logging')

const Reply = require('./lib/reply')
const Request = require('./lib/request')
const supportedMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS']
const buildSchema = require('./lib/validation').build
const handleRequest = require('./lib/handleRequest')
const isValidLogger = require('./lib/validation').isValidLogger
const schemaCompiler = require('./lib/validation').schemaCompiler
const decorator = require('./lib/decorate')
const ContentTypeParser = require('./lib/ContentTypeParser')
const Hooks = require('./lib/hooks')
const loggerUtils = require('./lib/logger')

const ffs = require('fast-fast-series')
const urlUtil = require('url')

const validation = require('./lib/validation')
const validateSchema = validation.validate

function onRequestHandling (requestContext, callback) {
  this.onRequest(requestContext.req, requestContext.res, function (err) {
    callback(err, requestContext)
  })
}

function parsingGet (requestContext, callback) {
  var req = requestContext.req
  requestContext.request = new this.Request(
    req.params,
    req,
    null,
    urlUtil.parse(req.url, true).query,
    req.headers,
    req.log
  )
  callback(null, requestContext)
}

const APPLICATION_JSON_CONTENT_TYPE = 'application/json'
function parsingPost (requestContext, callback) {
  var req = requestContext.req
  var contentType = req.headers['content-type']
  if (contentType && (contentType === APPLICATION_JSON_CONTENT_TYPE || contentType.indexOf(APPLICATION_JSON_CONTENT_TYPE) > -1)) {
    jsonBody(requestContext, this.Request, callback)
    return
  }

  // custom parser for a given content type
  if (this.contentTypeParser.fastHasHeader(contentType)) {
    this.contentTypeParser.run(contentType, requestContext, callback)
    return
  }

  requestContext.res.statusCode = 415
  callback(new Error(), requestContext)
}

function parsingDelete (requestContext, callback) {
  var req = requestContext.req
  var contentType = req.headers['content-type']
  if (contentType) {
    // application/json content type
    if (contentType === APPLICATION_JSON_CONTENT_TYPE || contentType.indexOf(APPLICATION_JSON_CONTENT_TYPE) > -1) {
      jsonBody(requestContext, this.Request, callback)
      return
      // custom parser for a given content type
    } else if (this.contentTypeParser.fastHasHeader(contentType)) {
      this.contentTypeParser.run(contentType, requestContext, callback)
      return
    }

    requestContext.res.statusCode = 415
    callback(new Error(), requestContext)
    return
  }
  requestContext.request = new this.Request(
    req.params,
    req,
    null,
    urlUtil.parse(req.url, true).query,
    req.headers,
    req.log
  )
  callback(null, requestContext)
}

function jsonBody (requestContext, Request, callback) {
  var body = ''
  requestContext.req.on('error', onError)
    .on('data', onData)
    .on('end', onEnd)
  function onError (err) {
    requestContext.res.statusCode = 422
    parse(requestContext, err, null, callback)
  }
  function onData (chunk) {
    body += chunk
  }
  function onEnd () {
    parse(requestContext, null, body, callback)
  }
  function parse (requestContext, err, body, callback) {
    if (err) {
      callback(err, requestContext)
      return
    }
    try {
      var req = requestContext.req
      requestContext.request = new Request(
        req.params,
        req,
        JSON.parse(body),
        urlUtil.parse(req.url, true).query,
        req.headers,
        req.log
      )
      callback(null, requestContext)
    } catch (e) {
      requestContext.res.statusCode = 422
      callback(e, requestContext)
    }
  }
}

function validate (requestContext, callback) {
  var valid = validateSchema(this.compiledSchema, requestContext.request)

  requestContext.reply = new this.Reply(
    requestContext.res,
    this.compiledSchema,
    requestContext.request
  )

  if (valid !== true) {
    requestContext.reply.code(400)
    callback(valid, requestContext)
    return
  }
  callback(null, requestContext)
}

function handleUserHandler (requestContext, callback) {
  var reply = requestContext.reply
  var result = this.userHandler(requestContext.request, reply)
  if (result && typeof result.then === 'function') {
    result.then((payload) => {
      // this is for async functions that
      // are using reply.send directly
      if (payload !== undefined || reply.res.statusCode === 204) {
        reply.send(payload)
      }
    }).catch((err) => {
      reply['isError'] = true
      reply.send(err)
    })
  }
}

function defaultErrorHandler (err, requestContext) {
  if (!requestContext.reply) {
    requestContext.reply = new this.Reply(
      requestContext.res,
      this.compiledSchema,
      requestContext.request
    )
  }
  if (err instanceof Error) {
    requestContext.reply.sendError(err)
  } else {
    requestContext.reply.sendError(new Error(err || ''))
  }
}

function startSeries (req, res, params, context) {
  req.params = params
  const requestContext = {
    req: req,
    res: res,
    reply: null,
    request: null
  }
  res._requestContext = requestContext
  context.steps(requestContext)
}

function build (options) {
  options = options || {}
  if (typeof options !== 'object') {
    throw new TypeError('Options must be an object')
  }

  var log
  if (isValidLogger(options.logger)) {
    log = loggerUtils.createLogger({ logger: options.logger, serializers: loggerUtils.serializers })
  } else if (!options.logger) {
    log = Object.create(abstractLogging)
    log.child = () => log
  } else {
    options.logger = typeof options.logger === 'object' ? options.logger : {}
    options.logger.level = options.logger.level || 'info'
    options.logger.serializers = options.logger.serializers || loggerUtils.serializers
    log = loggerUtils.createLogger(options.logger)
  }

  const ajv = new Ajv(Object.assign({ coerceTypes: true }, options.ajv))

  const router = FindMyWay({ defaultRoute: defaultRoute })
  const map = new Map()

  // logger utils
  const customGenReqId = options.logger ? options.logger.genReqId : null
  const genReqId = customGenReqId || loggerUtils.reqIdGenFactory()
  const now = loggerUtils.now
  const onResponseCallback = loggerUtils.onResponseCallback

  const app = avvio(fastify, {})
  // Override to allow the plugin incapsulation
  app.override = override

  var listening = false
  // true when Fastify is ready to go
  var started = false
  app.on('start', () => {
    started = true
  })

  var server
  if (options.https) {
    if (options.http2) {
      server = http2().createSecureServer(options.https, fastify)
    } else {
      server = https.createServer(options.https, fastify)
    }
  } else if (options.http2) {
    server = http2().createServer(fastify)
  } else {
    server = http.createServer(fastify)
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
  fastify._RoutePrefix = new RoutePrefix()

  // expose logger instance
  fastify.log = log

  // hooks
  fastify.addHook = addHook
  fastify._hooks = new Hooks()

  // custom parsers
  fastify.addContentTypeParser = addContentTypeParser
  fastify.hasContentTypeParser = hasContentTypeParser
  fastify._contentTypeParser = new ContentTypeParser()

  fastify.setSchemaCompiler = setSchemaCompiler
  fastify._schemaCompiler = schemaCompiler.bind({ ajv: ajv })

  // plugin
  fastify.register = fastify.use
  fastify.listen = listen
  fastify.server = server

  // extend server methods
  fastify.decorate = decorator.add
  fastify.hasDecorator = decorator.exist
  fastify.decorateReply = decorator.decorateReply
  fastify.decorateRequest = decorator.decorateRequest
  fastify.extendServerError = decorator.extendServerError

  fastify._Reply = Reply.buildReply(Reply)
  fastify._Request = Request.buildRequest(Request)

  // middleware support
  fastify.use = use
  fastify._middie = Middie(onRunMiddlewares)
  fastify._middlewares = []

  // exposes the routes map
  fastify[Symbol.iterator] = iterator

  // fake http injection (for testing purposes)
  fastify.inject = inject

  var fourOhFour = FindMyWay({ defaultRoute: fourOhFourFallBack })
  fastify.setNotFoundHandler = setNotFoundHandler
  setNotFoundHandler.call(fastify)

  fastify.setErrorHandler = setErrorHandler

  return fastify

  function fastify (req, res) {
    req.id = genReqId(req)
    req.log = res.log = log.child({ reqId: req.id })

    req.log.info({ req }, 'incoming request')

    res._startTime = now()
    res._context = null
    res.on('error', onResFinished)

    router.lookup(req, res)
  }

  function onResFinished (err) {
    if (!this._requestContext) return
    _onResFinished(this._requestContext, err)
  }

  function _onResFinished (requestContext, err) {
    requestContext.res.removeListener('error', onResFinished)
    onResponseCallback(err, requestContext.res)
  }

  function listen (port, address, cb) {
    const hasAddress = arguments.length === 3
    const _cb = (hasAddress) ? cb : address
    fastify.ready(function (err) {
      if (err) return _cb(err)
      if (listening) {
        return _cb(new Error('Fastify is already listening'))
      }

      server.on('error', wrap)
      if (hasAddress) {
        server.listen(port, address, wrap)
      } else {
        server.listen(port, wrap)
      }
      listening = true
    })

    function wrap (err) {
      server.removeListener('error', wrap)
      if (_cb) {
        _cb(err)
      } else if (err) {
        // this will crash the process
        // it will go to 'uncaughtException'
        throw err
      }
    }
  }

  function startHooks (req, res, params, context) {
    res._context = context
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

  function State (req, res, params, context) {
    this.req = req
    this.res = res
    this.params = params
    this.context = context
  }

  function hookIterator (fn, state, next) {
    return fn(state.req, state.res, next)
  }

  function middlewareCallback (err, state) {
    if (err) {
      const reply = new Reply(state.res, state.context, null)
      reply.send(err)
      return
    }
    state.context._middie.run(state.req, state.res, state)
  }

  function onRunMiddlewares (err, req, res, state) {
    if (err) {
      const reply = new Reply(res, state.context, null)
      reply.send(err)
      return
    }

    handleRequest(req, res, state.params, state.context)
  }

  function override (old, fn, opts) {
    if (fn[Symbol.for('skip-override')]) {
      return old
    }

    const middlewares = Object.assign([], old._middlewares)
    const instance = Object.create(old)
    instance._Reply = Reply.buildReply(instance._Reply)
    instance._Request = Request.buildRequest(instance._Request)
    instance._contentTypeParser = ContentTypeParser.buildContentTypeParser(instance._contentTypeParser)
    instance._hooks = Hooks.buildHooks(instance._hooks)
    instance._RoutePrefix = buildRoutePrefix(instance._RoutePrefix, opts)
    instance._middlewares = []
    instance._middie = Middie(onRunMiddlewares)

    if (opts.prefix) {
      instance._404Context = null
    }

    for (var i = 0; i < middlewares.length; i++) {
      instance.use.apply(instance, middlewares[i])
    }

    return instance
  }

  function RoutePrefix () {
    this.prefix = ''
  }

  function buildRoutePrefix (r, opts) {
    const _RoutePrefix = Object.create(opts)
    const R = _RoutePrefix
    R.prefix = r.prefix
    if (typeof opts.prefix === 'string') {
      if (opts.prefix[0] !== '/') {
        opts.prefix = '/' + opts.prefix
      }
      R.prefix += opts.prefix
    }
    return R
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

  function _route (self, method, url, options, handler) {
    if (!handler && typeof options === 'function') {
      handler = options
      options = {}
    }
    return route.call(self, {
      method,
      url,
      handler,
      schema: options.schema || {},
      Reply: self._Reply,
      Request: self._Request,
      contentTypeParser: self._contentTypeParser,
      onRequest: self._hooks.onRequest,
      preHandler: self._hooks.preHandler,
      RoutePrefix: self._RoutePrefix,
      beforeHandler: options.beforeHandler,
      onResponse: options.onResponse,
      onSend: options.onSend,
      config: options.config,
      middie: self._middie,
      errorHander: self._errorHandler,
      schemaCompiler: options.schemaCompiler
    })
  }

  // Route management
  function route (opts) {
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

    _fastify._RoutePrefix = opts.RoutePrefix || _fastify._RoutePrefix

    _fastify.after((notHandledErr, done) => {
      const path = opts.url || opts.path
      const prefix = _fastify._RoutePrefix.prefix
      const url = prefix + (path === '/' && prefix.length > 0 ? '' : path)

      const config = opts.config || {}
      config.url = url

      const compiledSchema = { schema: opts.schema }
      buildSchema(compiledSchema, opts.schemaCompiler || _fastify._schemaCompiler)

      const contentTypeParser = opts.contentTypeParser || _fastify._contentTypeParser
      const errorHandler = opts.errorHander || _fastify._errorHandler
      const context = new Context(
        config,
        opts.middie || _fastify._middie
      )

      const onRequest = opts.onRequest || _fastify._hooks.onRequest

      const functions = []
      for (let i = 0; i < onRequest.length; i++) {
        functions.push(onRequestHandling.bind({ onRequest: onRequest[i] }))
      }
      if (opts.method === 'GET' || opts.method === 'HEAD') {
        functions.push(parsingGet.bind({ Request: opts.Request || _fastify._Request }))
      } else if (opts.method === 'POST' || opts.method === 'PUT' || opts.method === 'PATCH') {
        functions.push(parsingPost.bind({ Request: opts.Request || _fastify._Request, contentTypeParser: contentTypeParser }))
      } else if (opts.method === 'OPTIONS' || opts.method === 'DELETE') {
        functions.push(parsingDelete.bind({ Request: opts.Request || _fastify._Request, contentTypeParser: contentTypeParser }))
      }
      functions.push(validate.bind({ Reply: opts.Reply || _fastify._Reply, compiledSchema: compiledSchema }))
      // TODO: prehandler
      // TODO: beforeHandler
      functions.push(handleUserHandler.bind({ userHandler: opts.handler.bind(_fastify) }))
      // TODO: onSend
      functions.push(_onResFinished)

      const steps = ffs(functions, errorHandler ? errorHandler.bind(context) : defaultErrorHandler.bind({ compiledSchema: compiledSchema, Reply: Reply }))
      context.steps = steps

      if (map.has(url)) {
        if (map.get(url)[opts.method]) {
          return done(new Error(`${opts.method} already set for ${url}`))
        }

        if (Array.isArray(opts.method)) {
          for (i = 0; i < opts.method.length; i++) {
            map.get(url)[opts.method[i]] = steps
          }
        } else {
          map.get(url)[opts.method] = steps
        }
        router.on(opts.method, url, startSeries, context)
      } else {
        const node = {}
        if (Array.isArray(opts.method)) {
          for (i = 0; i < opts.method.length; i++) {
            node[opts.method[i]] = steps
          }
        } else {
          node[opts.method] = steps
        }
        map.set(url, node)
        router.on(opts.method, url, startSeries, context)
      }
      done(notHandledErr)
    })

    // chainable api
    return _fastify
  }

  function Context (config, middie) {
    this.config = config
    this._middie = middie
  }

  function iterator () {
    var entries = map.entries()
    var it = {}
    it.next = function () {
      var next = entries.next()

      if (next.done) {
        return {
          value: null,
          done: true
        }
      }

      var value = {}
      var methods = {}

      value[next.value[0]] = methods

      // out methods are saved Uppercase,
      // so we lowercase them for a better usability
      for (var method in next.value[1]) {
        methods[method.toLowerCase()] = next.value[1][method]
      }

      return {
        value: value,
        done: false
      }
    }
    return it
  }

  function inject (opts, cb) {
    if (started) {
      return lightMyRequest(this, opts, cb)
    }

    if (cb) {
      this.ready(err => {
        if (err) throw err
        return lightMyRequest(this, opts, cb)
      })
    } else {
      return new Promise((resolve, reject) => {
        this.ready(err => {
          if (err) return reject(err)
          resolve()
        })
      }).then(() => lightMyRequest(this, opts))
    }
  }

  function use (url, fn) {
    if (typeof url === 'string') {
      const prefix = this._RoutePrefix.prefix
      url = prefix + (url === '/' && prefix.length > 0 ? '' : url)
    }
    this._middlewares.push([url, fn])
    this._middie.use(url, fn)
    return this
  }

  function addHook (name, fn) {
    if (name === 'onClose') {
      this.onClose(fn)
    } else {
      this._hooks.add(name, fn.bind(this))
    }
    return this
  }

  function addContentTypeParser (contentType, fn) {
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
    req.log.warn('the default handler for 404 did not catch this, this is likely a fastify bug, please report it')
    req.log.warn(fourOhFour.prettyPrint())
    const reply = new Reply(res, { onSend: runHooks([], null) }, null)
    reply.code(404).send(new Error('Not found'))
  }

  function setNotFoundHandler (opts, handler) {
    this.after((notHandledErr, done) => {
      _setNotFoundHandler.call(this, opts, handler)
      done(notHandledErr)
    })
  }

  function _setNotFoundHandler (opts, handler) {
    if (typeof opts === 'function') {
      handler = opts
      opts = undefined
    }
    opts = opts || {}
    handler = handler || basic404

    if (!this._404Context) {
      const context = new Context(
        opts.schema,
        handler,
        this._Reply,
        this._Request,
        opts.contentTypeParser || this._contentTypeParser,
        opts.config || {},
        this._errorHandler,
        this._middie
      )

      const onRequest = this._hooks.onRequest
      const onResponse = this._hooks.onResponse
      const onSend = this._hooks.onSend

      context.onRequest = onRequest.length ? runHooks(onRequest, context) : null
      context.onResponse = onResponse.length ? runHooks(onResponse, context) : null
      context.onSend = onSend.length ? runHooks(onSend, context) : null

      this._404Context = context

      var prefix = this._RoutePrefix.prefix
      var star = '/*'

      fourOhFour.all(prefix + star, startHooks, context)
      fourOhFour.all(prefix || '/', startHooks, context)
    } else {
      this._404Context.handler = handler
      this._404Context.contentTypeParser = opts.contentTypeParser || this._contentTypeParser
      this._404Context.config = opts.config || {}
    }
  }

  function setSchemaCompiler (schemaCompiler) {
    this._schemaCompiler = schemaCompiler
    return this
  }

  function setErrorHandler (func) {
    this._errorHandler = func
    return this
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
