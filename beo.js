'use strict'

const wayfarer = require('wayfarer')
const fastJsonStringify = require('fast-json-stringify')
const schema = Symbol('schema')

function build () {
  const router = wayfarer()
  const map = new Map()

  beo.route = route

  return beo

  function beo (req, res) {
    router(req.url, req, res)
  }

  function route (opts) {
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

  function createNode (url) {
    const node = {}

    router.on(url, function handle (params, req, res) {
      const handle = node[req.method]

      if (!handle) {
        res.statusCode = 404
        res.end()
      }

      const request = new Request(params, req)

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
    })

    return node
  }

  function Request (params, req) {
    this.params = params
    this.req = req
  }
}

module.exports = build
