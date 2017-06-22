'use strict'

const FindMyWay = require('find-my-way')
const avvio = require('avvio')
const http = require('http')
const https = require('https')
const pinoHttp = require('pino-http')
const Middie = require('middie')
const fastseries = require('fastseries')
const shot = require('shot')

const Reply = require('./lib/reply')
const Request = require('./lib/request')
const supportedMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS']
const buildSchema = require('./lib/validation').build
const handleRequest = require('./lib/handleRequest')
const isValidLogger = require('./lib/validation').isValidLogger
const decorator = require('./lib/decorate')
const ContentTypeParser = require('./lib/ContentTypeParser')
const Hooks = require('./lib/hooks')

function build (options) {
  options = options || {}
  if (typeof options !== 'object') {
    throw new TypeError('Options must be an object')
  }

  var logger
  if (options.logger && isValidLogger(options.logger)) {
    logger = pinoHttp({ logger: options.logger })
  } else {
    options.logger = options.logger || {}
    options.logger.level = options.logger.level || 'fatal'
    logger = pinoHttp(options.logger)
  }

  const router = FindMyWay({ defaultRoute: defaultRoute })
  const middie = Middie(_runMiddlewares)
  const run = middie.run
  const map = new Map()
  const runHooks = fastseries()

  const app = avvio(fastify, {})
  // Override to allow the plugin incapsulation
  app.override = override

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
  // extended route
  fastify.route = route
  fastify._RoutePrefix = new RoutePrefix()

  // expose logger instance
  fastify.logger = logger

  // hooks
  fastify.addHook = addHook
  fastify._hooks = new Hooks()
  fastify.close = close

  // custom parsers
  fastify.addContentTypeParser = addContentTypeParser
  fastify.hasContentTypeParser = hasContentTypeParser
  fastify._contentTypeParser = new ContentTypeParser()

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
  fastify.use = middie.use

  // exposes the routes map
  fastify[Symbol.iterator] = iterator

  // fake http injection (for testing purposes)
  fastify.inject = inject

  return fastify

  function fastify (req, res) {
    logger(req, res)

    // onRequest hook
    setImmediate(
      runHooks,
      new State(req, res),
      hookIterator,
      fastify._hooks.onRequest,
      middlewareCallback
    )
  }

  function _runMiddlewares (err, req, res) {
    if (err) {
      const reply = new Reply(req, res, null)
      reply.send(err)
      return
    }

    // preRouting hook
    setImmediate(
      runHooks,
      new State(req, res),
      hookIterator,
      fastify._hooks.preRouting,
      routeCallback
    )
  }

  function State (req, res) {
    this.req = req
    this.res = res
  }

  function hookIterator (fn, cb) {
    fn(this.req, this.res, cb)
  }

  function middlewareCallback (err, code) {
    if (err) {
      const reply = new Reply(this.req, this.res, null)
      if (code[0]) reply.code(code[0])
      reply.send(err)
      return
    }
    run(this.req, this.res)
  }

  function routeCallback (err, code) {
    if (err) {
      const reply = new Reply(this.req, this.res, null)
      if (code[0]) reply.code(code[0])
      reply.send(err)
      return
    }

    router.lookup(this.req, this.res)
  }

  function listen (port, address, cb) {
    const hasAddress = arguments.length === 3
    const _cb = (hasAddress) ? cb : address
    fastify.ready(function (err) {
      if (err) return _cb(err)
      if (hasAddress) {
        server.listen(port, address, _cb)
      } else {
        server.listen(port, _cb)
      }
    })
  }

  function override (instance, fn, opts) {
    if (fn[Symbol.for('skip-override')]) {
      return instance
    }

    instance = Object.create(instance)
    instance._Reply = Reply.buildReply(instance._Reply)
    instance._Request = Request.buildRequest(instance._Request)
    instance._contentTypeParser = ContentTypeParser.buildContentTypeParser(instance._contentTypeParser)
    instance._hooks = Hooks.buildHooks(instance._hooks)
    instance._RoutePrefix = buildRoutePrefix(instance._RoutePrefix, opts)

    return instance
  }

  function RoutePrefix () {
    this.prefix = ''
  }

  function buildRoutePrefix (r, opts) {
    function _RoutePrefix () {}
    const R = new _RoutePrefix()
    R.prefix = r.prefix
    if (typeof opts.prefix === 'string') {
      R.prefix += opts.prefix
    }
    return R
  }

  function close (cb) {
    runHooks(
      fastify,
      onCloseIterator,
      fastify._hooks.onClose,
      onCloseCallback(cb)
    )
  }

  function onCloseIterator (fn, cb) {
    fn(this, cb)
  }

  function onCloseCallback (cb) {
    return (err) => {
      if (err) {
        throw err
      }

      fastify.server.close(cb)
    }
  }

  // Shorthand methods
  function _delete (url, schema, handler) {
    return _route(this, 'DELETE', url, schema, handler)
  }

  function _get (url, schema, handler) {
    return _route(this, 'GET', url, schema, handler)
  }

  function _head (url, schema, handler) {
    return _route(this, 'HEAD', url, schema, handler)
  }

  function _patch (url, schema, handler) {
    return _route(this, 'PATCH', url, schema, handler)
  }

  function _post (url, schema, handler) {
    return _route(this, 'POST', url, schema, handler)
  }

  function _put (url, schema, handler) {
    return _route(this, 'PUT', url, schema, handler)
  }

  function _options (url, schema, handler) {
    return _route(this, 'OPTIONS', url, schema, handler)
  }

  function _route (self, method, url, schema, handler) {
    if (!handler && typeof schema === 'function') {
      handler = schema
      schema = {}
    }
    return route({
      method,
      url,
      schema,
      handler,
      Reply: self._Reply,
      Request: self._Request,
      contentTypeParser: self._contentTypeParser,
      hooks: self._hooks,
      RoutePrefix: self._RoutePrefix
    })
  }

  // Route management
  function route (opts) {
    if (supportedMethods.indexOf(opts.method) === -1) {
      throw new Error(`${opts.method} method is not supported!`)
    }

    if (!opts.handler) {
      throw new Error(`Missing handler function for ${opts.method}:${opts.url} route.`)
    }

    buildSchema(opts)

    opts.Reply = opts.Reply || this._Reply
    opts.Request = opts.Request || this._Request
    opts.contentTypeParser = opts.contentTypeParser || this._contentTypeParser
    opts.hooks = opts.hooks || this._hooks
    opts.RoutePrefix = opts.RoutePrefix || this._RoutePrefix

    const prefix = opts.RoutePrefix.prefix
    const url = prefix + (opts.url || opts.path)

    if (map.has(url)) {
      if (map.get(url)[opts.method]) {
        throw new Error(`${opts.method} already set for ${url}`)
      }

      map.get(url)[opts.method] = opts
      router.on(opts.method, url, handleRequest, opts)
    } else {
      const node = {}
      node[opts.method] = opts
      map.set(url, node)
      router.on(opts.method, url, handleRequest, opts)
    }

    // chainable api
    return fastify
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
      shot.inject(this, opts, cb)
      return
    }

    this.ready(err => {
      if (err) throw err
      shot.inject(this, opts, cb)
    })
  }

  function addHook (name, fn) {
    this._hooks.add(name, fn)
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
    logger.logger.error(e, 'client error')
    socket.end(`HTTP/1.1 400 Bad Request\r\nContent-Length: ${body.length}\r\nContent-Type: 'application/json'\r\n\r\n${body}`)
  }

  function defaultRoute (req, res, params) {
    const reply = new Reply(req, res, null)
    reply.code(404).send(new Error('Not found'))
  }
}

module.exports = build
