'use strict'

const Fastify = require('..')
const http = require('http')
const t = require('tap')
const test = t.test

test('connectionTimeout', t => {
  t.plan(4)

  try {
    Fastify({ connectionTimeout: 1.3 })
    t.fail('option must be an integer')
  } catch (err) {
    t.ok(err)
  }

  try {
    Fastify({ connectionTimeout: [] })
    t.fail('option must be an integer')
  } catch (err) {
    t.ok(err)
  }

  const serverFactory = (handler, _) => {
    const server = http.createServer((req, res) => {
      handler(req, res)
    })
    server.setTimeout = () => {
      t.ok('called')
    }
    return server
  }

  const fastify = Fastify({ connectionTimeout: 50, serverFactory })

  fastify.listen(0, function (err) {
    t.error(err)
    fastify.server.unref()
  })
})
