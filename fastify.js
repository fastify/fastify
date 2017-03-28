'use strict'

const wayfarer = require('wayfarer')
const stripUrl = require('pathname-match')
const avvio = require('avvio')
const http = require('http')
const https = require('https')
const pinoHttp = require('pino-http')
const Middie = require('middie')
const fastseries = require('fastseries')

const Reply = require('./lib/reply')
const supportedMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS']
const buildSchema = require('./lib/validation').build
const buildNode = require('./lib/tier-node')
const hooksManager = require('./lib/hooks')
const isValidLogger = require('./lib/validation').isValidLogger
const decorator = require('./lib/decorate')

function build (options) {
  options = options || {}
  if (typeof options !== 'object') {
    throw new TypeError('Options must be an object')
  }

  var logger
  if (options.logger && isValidLogger(options.logger)) {
    logger = pinoHttp({logger: options.logger})
  } else {
    options.logger = options.logger || {}
    options.logger.level = options.logger.level || 'fatal'
    logger = pinoHttp(options.logger)
  }

  const router = wayfarer('/404')
  const middie = Middie(_runMiddlewares)
  const run = middie.run
  const map = new Map()
  const runHooks = fastseries()

  const hooks = hooksManager()
  const onRequest = hooks.get.onRequest
  const preRouting = hooks.get.preRouting
  const onClose = hooks.get.onClose

  const app = avvio(fastify, {})
  // Override to allow the plugin incapsulation
  app.override = override
  router.on('/404', defaultRoute)

  var server
  if (options.https) {
    server = https.createServer(options.https, fastify)
  } else {
    server = http.createServer(fastify)
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

  // hooks
  fastify.addHook = hooks.add
  fastify.close = close

  // plugin
  fastify.register = fastify.use
  fastify.listen = listen
  fastify.server = server

  // extend server methods
  fastify.decorate = decorator.add
  fastify.hasDecorator = decorator.exist
  fastify.decorateReply = decorator.decorateReply
  fastify._Reply = Reply

  // middleware support
  fastify.use = middie.use

  return fastify

  function fastify (req, res) {
    logger(req, res)

    // onRequest hook
    runHooks(
      new State(req, res),
      hookIterator,
      onRequest(),
      middlewareCallback
    )
  }

  function _runMiddlewares (err, req, res) {
    if (err) {
      const reply = new fastify._Reply(req, res, null)
      reply.send(err)
      return
    }

    // preRouting hook
    runHooks(
      new State(req, res),
      hookIterator,
      preRouting(),
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

  function middlewareCallback (err) {
    if (err) {
      const reply = new fastify._Reply(this.req, this.res, null)
      reply.send(err)
      return
    }
    run(this.req, this.res)
  }

  function routeCallback (err) {
    if (err) {
      const reply = new fastify._Reply(this.req, this.res, null)
      reply.send(err)
      return
    }

    router(stripUrl(this.req.url), this.req, this.res)
  }

  function listen (port, cb) {
    fastify.ready(function () {
      server.listen(port, cb)
    })
  }

  function override (server, fn) {
    if (fn[Symbol.for('skip-override')]) {
      return server
    }

    server = Object.create(server)
    server._Reply = buildReply(server._Reply)

    return server
  }

  function close (cb) {
    runHooks(
      fastify,
      onCloseIterator,
      onClose(),
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
    return route({ method, url, schema, handler, Reply: self._Reply })
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

    if (map.has(opts.url)) {
      if (map.get(opts.url)[opts.method]) {
        throw new Error(`${opts.method} already set for ${opts.url}`)
      }

      map.get(opts.url)[opts.method] = opts
    } else {
      const node = buildNode(opts.url, router, hooks.get)
      node[opts.method] = opts
      map.set(opts.url, node)
    }

    // chainable api
    return fastify
  }

  function buildReply (R) {
    function _Reply (req, res, handle) {
      R.call(this, req, res, handle)
    }
    _Reply.prototype = new R()
    return _Reply
  }

  function defaultRoute (params, req, res) {
    res.statusCode = 404
    res.end()
  }
}

module.exports = build
