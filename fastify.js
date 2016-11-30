'use strict'

const wayfarer = require('wayfarer')
const stripUrl = require('pathname-match')
const pluginLoader = require('boot-in-the-arse')
const http = require('http')
const https = require('https')
const pinoHttp = require('pino-http')

const supportedMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS']
const buildSchema = require('./lib/validation').build
const buildNode = require('./lib/tier-node')

function build (options) {
  options = options || {}
  if (typeof options !== 'object') {
    throw new TypeError('Options must be an object')
  }

  options.logger = options.logger || {}
  options.logger.level = options.logger.level || 'fatal'
  const logger = pinoHttp(options.logger)

  const router = wayfarer('/404')
  const map = new Map()
  pluginLoader(fastify, {})
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

  // plugin
  fastify.register = fastify.use
  fastify.listen = listen
  fastify.server = server

  return fastify

  function fastify (req, res) {
    logger(req, res)
    router(stripUrl(req.url), req, res)
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
      const node = buildNode(opts.url, router)
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
