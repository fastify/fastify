'use strict'

const Fastify = require('..')
const http = require('node:http')
const t = require('tap')
const test = t.test

test('connectionTimeout', t => {
  t.plan(6)

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

  const httpServer = Fastify({ connectionTimeout: 1 }).server
  t.equal(httpServer.timeout, 1)

  const httpsServer = Fastify({ connectionTimeout: 2, https: {} }).server
  t.equal(httpsServer.timeout, 2)

  const http2Server = Fastify({ connectionTimeout: 3, http2: true }).server
  t.equal(http2Server.timeout, 3)

  const serverFactory = (handler, _) => {
    const server = http.createServer((req, res) => {
      handler(req, res)
    })
    server.setTimeout(5)
    return server
  }
  const customServer = Fastify({ connectionTimeout: 4, serverFactory }).server
  t.equal(customServer.timeout, 5)
})
