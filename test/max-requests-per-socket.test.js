'use strict'

const net = require('net')
const { test } = require('tap')
const semver = require('semver')
const Fastify = require('..')

test('maxRequestsPerSocket on node version greater than 16.10.0', { skip: semver.lt(process.versions.node, '16.10.0') }, t => {
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

test('maxRequestsPerSocket on node version smaller than 16.10.0', { skip: semver.gte(process.versions.node, '16.10.0') }, async (t) => {
  t.plan(2)
  try {
    Fastify({ maxRequestsPerSocket: 5 })
  } catch (err) {
    t.same(err.code, 'FST_ERR_HTTP_MAX_REQUESTS_PER_SOCKET_INVALID_VERSION')
    t.same(err.message, '"maxRequestsPerSocket" is available only from node >= 16.10.0')
  }
})
