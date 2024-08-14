'use strict'

const test = require('node:test')
const assert = require('node:assert')
const Fastify = require('../..')
const https = require('node:https')
const dns = require('node:dns').promises
const sget = require('simple-get').concat
const { buildCertificate } = require('../build-certificate')

async function setup () {
  test.before(() => {
    buildCertificate()
  })

  const localAddresses = await dns.lookup('localhost', { all: true })

  test('Should support a custom https server', { skip: localAddresses.length < 1 }, async t => {
    const fastify = Fastify({
      serverFactory: (handler, opts) => {
        assert.ok(opts.serverFactory, 'it is called once for localhost')

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
    })

    t.after(() => fastify.close(() => {
      process.exit(0)
    }))

    fastify.get('/', (req, reply) => {
      assert.ok(req.raw.custom)
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
        assert.strictEqual(response.statusCode, 200)
        assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
        resolve()
      })
    })
  })
}

setup()