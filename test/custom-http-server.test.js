'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const http = require('http')
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

  await fastify.listen(0)

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
