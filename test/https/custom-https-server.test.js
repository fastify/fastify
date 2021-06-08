'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../..')
const https = require('https')
const sget = require('simple-get').concat

const { buildCertificate } = require('../build-certificate')
t.before(buildCertificate)

test('Should support a custom https server', t => {
  t.plan(6)

  const serverFactory = (handler, opts) => {
    t.ok(opts.serverFactory)

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

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'https://localhost:' + fastify.server.address().port,
      rejectUnauthorized: false
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})
