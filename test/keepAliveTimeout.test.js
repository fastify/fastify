'use strict'

const Fastify = require('..')
const http = require('http')
const t = require('tap')
const test = t.test

test('keepAliveTimeout', t => {
  t.plan(6)

  try {
    Fastify({ keepAliveTimeout: 1.3 })
    t.fail('option must be an integer')
  } catch (err) {
    t.ok(err)
  }

  try {
    Fastify({ keepAliveTimeout: [] })
    t.fail('option must be an integer')
  } catch (err) {
    t.ok(err)
  }

  const httpServer = Fastify({ keepAliveTimeout: 1 }).server
  t.equal(httpServer.keepAliveTimeout, 1)

  const httpsServer = Fastify({ keepAliveTimeout: 2, https: {} }).server
  t.equal(httpsServer.keepAliveTimeout, 2)

  const http2Server = Fastify({ keepAliveTimeout: 3, http2: true }).server
  t.not(http2Server.keepAliveTimeout, 3)

  const serverFactory = (handler, _) => {
    const server = http.createServer((req, res) => {
      handler(req, res)
    })
    server.keepAliveTimeout = 5
    return server
  }
  const customServer = Fastify({ keepAliveTimeout: 4, serverFactory }).server
  t.equal(customServer.keepAliveTimeout, 5)
})
