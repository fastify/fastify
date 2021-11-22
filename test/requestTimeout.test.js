'use strict'

const http = require('http')
const { test } = require('tap')
const Fastify = require('../fastify')

test('requestTimeout passed to server', t => {
  t.plan(5)

  try {
    Fastify({ requestTimeout: 500.1 })
    t.fail('option must be an integer')
  } catch (err) {
    t.ok(err)
  }

  try {
    Fastify({ requestTimeout: [] })
    t.fail('option must be an integer')
  } catch (err) {
    t.ok(err)
  }

  const httpServer = Fastify({ requestTimeout: 1000 }).server
  t.equal(httpServer.requestTimeout, 1000)

  const httpsServer = Fastify({ requestTimeout: 1000, https: true }).server
  t.equal(httpsServer.requestTimeout, 1000)

  const serverFactory = (handler, _) => {
    const server = http.createServer((req, res) => {
      handler(req, res)
    })
    server.requestTimeout = 5000
    return server
  }
  const customServer = Fastify({ requestTimeout: 4000, serverFactory }).server
  t.equal(customServer.requestTimeout, 5000)
})

test('requestTimeout should be set', async (t) => {
  t.plan(1)

  const initialConfig = Fastify({ requestTimeout: 5000 }).initialConfig
  t.same(initialConfig.requestTimeout, 5000)
})

test('requestTimeout should 0', async (t) => {
  t.plan(1)

  const initialConfig = Fastify().initialConfig
  t.same(initialConfig.requestTimeout, 0)
})
