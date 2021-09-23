'use strict'

const net = require('net')
const { test } = require('tap')
const semver = require('semver')
const Fastify = require('../fastify')
const proxyquire = require('proxyquire')

test('maxRequestsPerSocket on node version >= 16.10.0', { skip: semver.lt(process.versions.node, '16.10.0') }, t => {
  t.plan(8)

  const fastify = Fastify({ maxRequestsPerSocket: 2 })
  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen(0, function (err) {
    t.error(err)

    const port = fastify.server.address().port
    const client = net.createConnection({ port: port }, () => {
      client.write('GET / HTTP/1.1\r\n\r\n')

      client.once('data', data => {
        t.match(data.toString(), /Connection:\s*keep-alive/i)
        t.match(data.toString(), /Keep-Alive:\s*timeout=5/i)
        t.match(data.toString(), /200 OK/i)

        client.write('GET / HTTP/1.1\r\n\r\n')

        client.once('data', data => {
          t.match(data.toString(), /Connection:\s*close/i)
          t.match(data.toString(), /200 OK/i)

          client.write('GET / HTTP/1.1\r\n\r\n')

          client.once('data', data => {
            t.match(data.toString(), /Connection:\s*close/i)
            t.match(data.toString(), /503 Service Unavailable/i)
          })
        })
      })
    })
  })
})

test('maxRequestsPerSocket zero should behave same as null', { skip: semver.lt(process.versions.node, '16.10.0') }, t => {
  t.plan(10)

  const fastify = Fastify({ maxRequestsPerSocket: 0 })
  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen(0, function (err) {
    t.error(err)

    const port = fastify.server.address().port
    const client = net.createConnection({ port: port }, () => {
      client.write('GET / HTTP/1.1\r\n\r\n')

      client.once('data', data => {
        t.match(data.toString(), /Connection:\s*keep-alive/i)
        t.match(data.toString(), /Keep-Alive:\s*timeout=5/i)
        t.match(data.toString(), /200 OK/i)

        client.write('GET / HTTP/1.1\r\n\r\n')

        client.once('data', data => {
          t.match(data.toString(), /Connection:\s*keep-alive/i)
          t.match(data.toString(), /Keep-Alive:\s*timeout=5/i)
          t.match(data.toString(), /200 OK/i)

          client.write('GET / HTTP/1.1\r\n\r\n')

          client.once('data', data => {
            t.match(data.toString(), /Connection:\s*keep-alive/i)
            t.match(data.toString(), /Keep-Alive:\s*timeout=5/i)
            t.match(data.toString(), /200 OK/i)
          })
        })
      })
    })
  })
})

test('maxRequestsPerSocket should allowed on node >= 16.10.0', async (t) => {
  t.plan(1)
  const server = proxyquire('../lib/server', {
    process: {
      versions: {
        node: '16.10.0'
      }
    }
  })
  const Fastify = proxyquire('../fastify', {
    './lib/server.js': server
  })

  const initialConfig = Fastify({ maxRequestsPerSocket: 5 }).initialConfig
  t.same(initialConfig.maxRequestsPerSocket, 5)
})

test('maxRequestsPerSocket should allowed on node >= 16.10.0', async (t) => {
  t.plan(1)
  const server = proxyquire('../lib/server', {
    process: {
      versions: {
        node: '16.10.0'
      }
    }
  })
  const Fastify = proxyquire('../fastify', {
    './lib/server.js': server
  })

  const initialConfig = Fastify().initialConfig
  t.same(initialConfig.maxRequestsPerSocket, 0)
})

test('maxRequestsPerSocket should throw on node < 16.10.0', async (t) => {
  t.plan(2)
  const server = proxyquire('../lib/server', {
    process: {
      versions: {
        node: '16.9.1'
      }
    }
  })
  const Fastify = proxyquire('../fastify', {
    './lib/server.js': server
  })

  try {
    Fastify({ maxRequestsPerSocket: 5 })
  } catch (err) {
    t.same(err.code, 'FST_ERR_HTTP_MAX_REQUESTS_PER_SOCKET_INVALID_VERSION')
    t.same(err.message, '"maxRequestsPerSocket" is available only from node >= 16.10.0')
  }
})

test('maxRequestsPerSocket should not throw when default option applied for node < 16.10.0', async (t) => {
  const server = proxyquire('../lib/server', {
    process: {
      versions: {
        node: '16.9.1'
      }
    }
  })
  const Fastify = proxyquire('../fastify', {
    './lib/server.js': server
  })

  Fastify({ maxRequestsPerSocket: 0 })
  t.pass()
})
