'use strict'

const FindMyWay = require('find-my-way')
const avvio = require('avvio')
const Ajv = require('ajv')
const http = require('http')
const https = require('https')
const Middie = require('middie')
const runHooks = require('fastseries')()
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

function build (options) {
  options = options || {}
  if (typeof options !== 'object') {
    throw new TypeError('Options must be an object')
  }

  var logger
  if (isValidLogger(options.logger)) {
    logger = loggerUtils.createLogger({ logger: options.logger, serializers: loggerUtils.serializers })
  } else if (options.logger === false) {
    logger = abstractLogging
    logger.child = () => logger
  } else {
    options.logger = options.logger || {}
    options.logger.level = options.logger.level || 'fatal'
    options.logger.serializers = options.logger.serializers || loggerUtils.serializers
    logger = loggerUtils.createLogger(options.logger)
  }

  const ajv = new Ajv(Object.assign({ coerceTypes: true }, options.ajv))

  const router = FindMyWay({ defaultRoute: defaultRoute })
  const map = new Map()

  // logger utils
  const customGenReqId = options.logger ? options.logger.genReqId : null
  const genReqId = customGenReqId || loggerUtils.reqIdGenFactory()
  const now = loggerUtils.now
  const OnResponseState = loggerUtils.OnResponseState
  const onResponseIterator = loggerUtils.onResponseIterator
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
    server = https.createServer(options.https, fastify)
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
  fastify.logger = logger

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

  fastify._Reply = Reply
  fastify._Request = Request

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
    req.id = genReqId()
    req.log = res.log = logger.child({ reqId: req.id })

    req.log.info({ req }, 'incoming request')

    res._startTime = now()
    res._context = null
    res.on('finish', onResFinished)
    res.on('error', onResFinished)

    router.lookup(req, res)
  }

  function onResFinished (err) {
    this.removeListener('finish', onResFinished)
    this.removeListener('error', onResFinished)

    var ctx = this._context

    if (ctx !== null && ctx.onResponse.length > 0) {
      // deferring this with setImmediate will
      // slow us by 10%
      runHooks(new OnResponseState(err, this),
        onResponseIterator,
        ctx.onResponse,
        wrapOnResponseCallback)
    } else {
      onResponseCallback(err, this)
    }
  }

  function wrapOnResponseCallback (err) {
    onResponseCallback(this.err || err, this.res)
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

  function startHooks (req, res, params, store) {
    res._context = store
    runHooks(
      new State(req, res, params, store),
      hookIterator,
      store.onRequest,
      middlewareCallback
    )
  }

  function middlewareCallback (err) {
    if (err) {
      const reply = new Reply(this.req, this.res, this.store)
      reply.send(err)
      return
    }
    this.store._middie.run(this.req, this.res, this)
  }

  function onRunMiddlewares (err, req, res, ctx) {
    if (err) {
      const reply = new Reply(req, res, ctx.store)
      reply.send(err)
      return
    }

    handleRequest(req, res, ctx.params, ctx.store)
  }

  function State (req, res, params, store) {
    this.req = req
    this.res = res
    this.params = params
    this.store = store
  }

  function hookIterator (fn, cb) {
    fn(this.req, this.res, cb)
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
      instance._404Store = null
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

      const store = new Store(
        opts.schema,
        opts.handler,
        opts.Reply || _fastify._Reply,
        opts.Request || _fastify._Request,
        opts.contentTypeParser || _fastify._contentTypeParser,
        opts.onRequest || _fastify._hooks.onRequest,
        [],
        opts.onResponse || _fastify._hooks.onResponse,
        config,
        opts.errorHander || _fastify._errorHandler,
        opts.middie || _fastify._middie
      )

      buildSchema(store, opts.schemaCompiler || _fastify._schemaCompiler)

      store.preHandler.push.apply(store.preHandler, (opts.preHandler || _fastify._hooks.preHandler))
      if (opts.beforeHandler) {
        opts.beforeHandler = Array.isArray(opts.beforeHandler) ? opts.beforeHandler : [opts.beforeHandler]
        store.preHandler.push.apply(store.preHandler, opts.beforeHandler)
      }

      if (map.has(url)) {
        if (map.get(url)[opts.method]) {
          return done(new Error(`${opts.method} already set for ${url}`))
        }

        if (Array.isArray(opts.method)) {
          for (i = 0; i < opts.method.length; i++) {
            map.get(url)[opts.method[i]] = store
          }
        } else {
          map.get(url)[opts.method] = store
        }
        router.on(opts.method, url, startHooks, store)
      } else {
        const node = {}
        if (Array.isArray(opts.method)) {
          for (i = 0; i < opts.method.length; i++) {
            node[opts.method[i]] = store
          }
        } else {
          node[opts.method] = store
        }
        map.set(url, node)
        router.on(opts.method, url, startHooks, store)
      }
      done()
    })

    // chainable api
    return _fastify
  }

  function Store (schema, handler, Reply, Request, contentTypeParser, onRequest, preHandler, onResponse, config, errorHandler, middie) {
    this.schema = schema
    this.handler = handler
    this.Reply = Reply
    this.Request = Request
    this.contentTypeParser = contentTypeParser
    this.onRequest = onRequest
    this.preHandler = preHandler
    this.onResponse = onResponse
    this.config = config
    this.errorHandler = errorHandler
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
      this._hooks.add(name, fn)
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
    logger.error(e, 'client error')
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
    const reply = new Reply(req, res, null)
    reply.code(404).send(new Error('Not found'))
  }

  function setNotFoundHandler (opts, handler) {
    this.after(() => {
      _setNotFoundHandler.call(this, opts, handler)
    })
  }

  function _setNotFoundHandler (opts, handler) {
    if (typeof opts === 'function') {
      handler = opts
      opts = undefined
    }
    opts = opts || {}
    handler = handler || basic404

    if (!this._404Store) {
      const store = new Store(
        opts.schema,
        handler,
        this._Reply,
        this._Request,
        opts.contentTypeParser || this._contentTypeParser,
        this._hooks.onRequest,
        [],
        this._hooks.onResponse,
        opts.config || {},
        this._errorHandler,
        this._middie
      )

      this._404Store = store

      var prefix = this._RoutePrefix.prefix
      var star = '/*'

      fourOhFour.all(prefix + star, startHooks, store)
      fourOhFour.all(prefix || '/', startHooks, store)
    } else {
      this._404Store.handler = handler
      this._404Store.contentTypeParser = opts.contentTypeParser || this._contentTypeParser
      this._404Store.config = opts.config || {}
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

module.exports = build
