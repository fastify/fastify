'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../..')
const https = require('node:https')
const sget = require('simple-get').concat
const dns = require('node:dns').promises

const { buildCertificate } = require('../build-certificate')
t.before(buildCertificate)

test('Should support a custom https server', async t => {
  const localAddresses = await dns.lookup('localhost', { all: true })
  const minPlan = localAddresses.length - 1 || 1

  t.plan(minPlan + 3)

  const serverFactory = (handler, opts) => {
    t.ok(opts.serverFactory, 'it is called once for localhost')

    const options = {
      key: global.context.key,
      cert: global.context.cert
    }

    const server = https.createServer(options, (req, res) => {
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
      url: 'https://localhost:' + fastify.server.address().port,
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
