'use strict'

const wayfarer = require('wayfarer')
const urlUtil = require('url')
const stripUrl = require('pathname-match')
const jsonParser = require('body/json')
const pluginLoader = require('boot-in-the-arse')

const supportedMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT']
const validation = require('./lib/validation')
const buildSchema = validation.buildSchema
const validateSchema = validation.validateSchema
const serialize = validation.serialize

function build () {
  const router = wayfarer('/404')
  const map = new Map()
  pluginLoader(fastify, {})
  router.on('/404', defaultRoute)

  // shorthand methods
  fastify.delete = delete_
  fastify.get = get
  fastify.head = head
  fastify.patch = patch
  fastify.post = post
  fastify.put = put
  // extended route
  fastify.route = route
  // plugin
  fastify.register = fastify.use

  return fastify

  function fastify (req, res) {
    router(stripUrl(req.url), req, res)
  }

  function delete_ (url, schema, handler) {
    return _route('DELETE', url, schema, handler)
  }

  function get (url, schema, handler) {
    return _route('GET', url, schema, handler)
  }

  function head (url, schema, handler) {
    return _route('HEAD', url, schema, handler)
  }

  function patch (url, schema, handler) {
    return _route('PATCH', url, schema, handler)
  }

  function post (url, schema, handler) {
    return _route('POST', url, schema, handler)
  }

  function put (url, schema, handler) {
    return _route('PUT', url, schema, handler)
  }

  function _route (method, url, schema, handler) {
    if (!handler && typeof schema === 'function') {
      handler = schema
      schema = {}
    }
    return route({ method, url, schema, handler })
  }

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
      const node = createNode(opts.url)
      node[opts.method] = opts
      map.set(opts.url, node)
    }
    return fastify
  }

  function bodyParsed (handle, params, req, res) {
    function parsed (err, body) {
      if (err) {
        res.statusCode = 422
        res.end()
        return
      }
      handleNode(handle, params, req, res, body, null)
    }
    return parsed
  }

  function createNode (url) {
    const node = {}

    router.on(url, function handle (params, req, res) {
      const handle = node[req.method]

      if (handle) {
        switch (req.method) {
          case 'GET':
          case 'HEAD':
            handleNode(handle, params, req, res, null, urlUtil.parse(req.url, true).query)
            break
          case 'PATCH':
            if (req.headers['content-type'] === 'application/json') {
              jsonParser(req, bodyParsed(handle, params, req, res))
            } else {
              res.statusCode = 415
              res.end()
            }
            break
          case 'POST':
          case 'PUT':
          case 'DELETE':
            if (req.headers['content-type'] === 'application/json') {
              jsonParser(req, bodyParsed(handle, params, req, res))
            } else {
              res.statusCode = 415
              res.end()
            }
            break
          default:
            throw Error(`Invalid method: ${req.method}`)
        }
      } else {
        res.statusCode = 404
        res.end()
      }
    })

    return node
  }

  function handleNode (handle, params, req, res, body, query) {
    if (!handle) {
      res.statusCode = 404
      res.end()
    }

    const valid = validateSchema(handle, params, body, query)
    if (valid !== true) {
      res.statusCode = 400
      res.end(valid)
      return
    }

    const request = new Request(params, req, body, query)
    handle.handler(request, reply)

    function reply (err, statusCode, data) {
      if (err) {
        res.statusCode = 500
        res.end()
      }

      if (!data) {
        data = statusCode
        statusCode = 200
      }

      res.statusCode = statusCode
      res.end(serialize(handle, data))
    }
  }

  function defaultRoute (params, req, res) {
    res.statusCode = 404
    res.end()
  }

  function Request (params, req, body, query) {
    this.params = params
    this.req = req
    this.body = body
    this.query = query
  }
}

module.exports = build
