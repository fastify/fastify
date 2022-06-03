'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const http = require('http')
const { FST_ERR_FORCE_CLOSE_CONNECTIONS_IDLE_NOT_AVAILABLE } = require('../lib/errors')
const sget = require('simple-get').concat
const dns = require('dns').promises

test('Should support a custom http server', async t => {
  const localAddresses = await dns.lookup('localhost', { all: true })

  t.plan(localAddresses.length + 3)

  const serverFactory = (handler, opts) => {
    t.ok(opts.serverFactory, 'it is called twice for every HOST interface')

    const server = http.createServer((req, res) => {
      req.custom = true
      handler(req, res)
    })

    return server
  }

  const fastify = Fastify({ serverFactory })

  t.teardown(fastify.close.bind(fastify))

  fastify.get('/', (req, reply) => {
    t.ok(req.raw.custom)
    reply.send({ hello: 'world' })
  })

  await fastify.listen({ port: 0 })

  await new Promise((resolve, reject) => {
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port,
      rejectUnauthorized: false
    }, (err, response, body) => {
      if (err) {
        return reject(err)
      }
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), { hello: 'world' })
      resolve()
    })
  })
})

test('Should not allow forceCloseConnection=idle if the server does not support closeIdleConnections', t => {
  t.plan(1)

  t.throws(
    () => {
      Fastify({
        forceCloseConnections: 'idle',
        serverFactory (handler, opts) {
          return {
            on () {

            }
          }
        }
      })
    },
    FST_ERR_FORCE_CLOSE_CONNECTIONS_IDLE_NOT_AVAILABLE,
    "Cannot set forceCloseConnections to 'idle' as your HTTP server does not support closeIdleConnections method"
  )
})
