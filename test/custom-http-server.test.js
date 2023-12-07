'use strict'

const t = require('tap')
const test = t.test
const http = require('node:http')
const dns = require('node:dns').promises
const sget = require('simple-get').concat
const Fastify = require('..')
const { FST_ERR_FORCE_CLOSE_CONNECTIONS_IDLE_NOT_AVAILABLE } = require('../lib/errors')

async function setup () {
  const localAddresses = await dns.lookup('localhost', { all: true })

  test('Should support a custom http server', { skip: localAddresses.length < 1 }, async t => {
    t.plan(4)

    const fastify = Fastify({
      serverFactory: (handler, opts) => {
        t.ok(opts.serverFactory, 'it is called once for localhost')

        const server = http.createServer((req, res) => {
          req.custom = true
          handler(req, res)
        })

        return server
      }
    })

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

  test('Should accept user defined serverFactory and ignore secondary server creation', async t => {
    const server = http.createServer(() => { })
    t.teardown(() => new Promise(resolve => server.close(resolve)))
    const app = await Fastify({
      serverFactory: () => server
    })
    t.resolves(async () => {
      await app.listen({ port: 0 })
    })
  })

  test('Should not call close on the server if it has not created it', async t => {
    const server = http.createServer()

    const serverFactory = (handler, opts) => {
      server.on('request', handler)
      return server
    }

    const fastify = Fastify({ serverFactory })

    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    await fastify.ready()

    await new Promise((resolve, reject) => {
      server.listen(0)
      server.on('listening', resolve)
      server.on('error', reject)
    })

    const address = server.address()
    t.equal(server.listening, true)
    await fastify.close()

    t.equal(server.listening, true)
    t.same(server.address(), address)
    t.same(fastify.addresses(), [address])

    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
    t.equal(server.listening, false)
    t.same(server.address(), null)
  })
}

setup()
