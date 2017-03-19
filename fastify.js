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
const serverMethods = require('./lib/serverMethods')

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

  const app = avvio(fastify, {})
  // Override to allow the plugin incapsulation
  app.override = function (s) {
    return Object.create(s)
  }
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

  // plugin
  fastify.register = fastify.use
  fastify.listen = listen
  fastify.server = server

  // extend server methods
  fastify.plugin = plugin
  fastify.addServerMethod = serverMethods.add
  fastify.hasServerMethod = serverMethods.exist

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
      const reply = new Reply(req, res, null)
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
      const reply = new Reply(this.req, this.res, null)
      reply.send(err)
      return
    }
    run(this.req, this.res)
  }

  function routeCallback (err) {
    if (err) {
      const reply = new Reply(this.req, this.res, null)
      reply.send(err)
      return
    }

    router(stripUrl(this.req.url), this.req, this.res)
  }

  function plugin (func, opts, cb) {
    func[Symbol.for('skip-override')] = true
    return fastify.register(func, opts, cb)
  }

  function listen (port, cb) {
    fastify.ready(function () {
      server.listen(port, cb)
    })
  }

  // Shorthand methods
  function _delete (url, schema, handler) {
    return _route('DELETE', url, schema, handler)
  }

  function _get (url, schema, handler) {
    return _route('GET', url, schema, handler)
  }

  function _head (url, schema, handler) {
    return _route('HEAD', url, schema, handler)
  }

  function _patch (url, schema, handler) {
    return _route('PATCH', url, schema, handler)
  }

  function _post (url, schema, handler) {
    return _route('POST', url, schema, handler)
  }

  function _put (url, schema, handler) {
    return _route('PUT', url, schema, handler)
  }

  function _options (url, schema, handler) {
    return _route('OPTIONS', url, schema, handler)
  }

  function _route (method, url, schema, handler) {
    if (!handler && typeof schema === 'function') {
      handler = schema
      schema = {}
    }
    return route({ method, url, schema, handler })
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

  function defaultRoute (params, req, res) {
    res.statusCode = 404
    res.end()
  }
}

module.exports = build
