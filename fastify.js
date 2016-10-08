'use strict'

const wayfarer = require('wayfarer')
const fastJsonStringify = require('fast-json-stringify')
const jsonParser = require('body/json')
const schema = Symbol('schema')
const supportedMethods = ['GET', 'POST']

function build () {
  const router = wayfarer()
  const map = new Map()

  // shorthand methods
  fastify.get = get
  fastify.post = post
  // extended route
  fastify.route = route

  return fastify

  function fastify (req, res) {
    router(req.url, req, res)
  }

  function get (url, schema, handler) {
    return route({
      method: 'GET',
      url: url,
      schema: schema,
      handler: handler
    })
  }

  function post (url, schema, handler) {
    return route({
      method: 'POST',
      url: url,
      schema: schema,
      handler: handler
    })
  }

  function route (opts) {
    if (supportedMethods.indexOf(opts.method) === -1) {
      throw new Error(`${opts.method} method is not supported!`)
    }

    opts[schema] = fastJsonStringify(opts.schema.out)

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
  }

  function bodyParsed (handle, params, req, res) {
    function parsed (err, body) {
      if (err) {
        res.statusCode = 422
        res.end()
        return
      }
      handleNode(handle, params, req, res, body)
    }
    return parsed
  }

  function createNode (url) {
    const node = {}

    router.on(url, function handle (params, req, res) {
      const handle = node[req.method]

      if (req.method === 'GET') {
        handleNode(handle, params, req, res, null)
      } else if (req.method === 'POST') {
        if (req.headers['content-type'] === 'application/json') {
          jsonParser(req, bodyParsed(handle, params, req, res))
        } else {
          res.statusCode = 415
          res.end()
        }
      } else {
        res.statusCode = 404
        res.end()
      }
    })

    return node
  }

  function handleNode (handle, params, req, res, body) {
    if (!handle) {
      res.statusCode = 404
      res.end()
    }

    const request = new Request(params, req, body)

    handle.handler(request, function reply (err, statusCode, data) {
      if (err) {
        res.statusCode = 500
        res.end()
      }

      if (!data) {
        data = statusCode
        statusCode = 200
      }

      res.statusCode = statusCode
      res.end(handle[schema](data))
    })
  }

  function Request (params, req, body) {
    this.params = params
    this.req = req
    this.body = body
  }
}

module.exports = build
