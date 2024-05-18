'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../..')
const h2url = require('h2url')

const alpha = { res: 'alpha' }
const beta = { res: 'beta' }

const { buildCertificate } = require('../build-certificate')
t.before(buildCertificate)

test('A route supports host constraints under http2 protocol and secure connection', (t) => {
  t.plan(6)

  let fastify
  try {
    fastify = Fastify({
      http2: true,
      https: {
        key: global.context.key,
        cert: global.context.cert
      }
    })
    t.pass('Key/cert successfully loaded')
  } catch (e) {
    t.fail('Key/cert loading failed', e)
  }

  const constrain = 'fastify.dev'

  fastify.route({
    method: 'GET',
    url: '/',
    handler: function (_, reply) {
      reply.code(200).send(alpha)
    }
  })
  fastify.route({
    method: 'GET',
    url: '/beta',
    constraints: { host: constrain },
    handler: function (_, reply) {
      reply.code(200).send(beta)
    }
  })
  fastify.route({
    method: 'GET',
    url: '/hostname_port',
    constraints: { host: constrain },
    handler: function (req, reply) {
      reply.code(200).send({ ...beta, hostname: req.hostname })
    }
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    t.test('https get request - no constrain', async (t) => {
      t.plan(3)

      const url = `https://localhost:${fastify.server.address().port}`
      const res = await h2url.concat({ url })

      t.equal(res.headers[':status'], 200)
      t.equal(res.headers['content-length'], '' + JSON.stringify(alpha).length)
      t.same(JSON.parse(res.body), alpha)
    })

    t.test('https get request - constrain', async (t) => {
      t.plan(3)

      const url = `https://localhost:${fastify.server.address().port}/beta`
      const res = await h2url.concat({
        url,
        headers: {
          ':authority': constrain
        }
      })

      t.equal(res.headers[':status'], 200)
      t.equal(res.headers['content-length'], '' + JSON.stringify(beta).length)
      t.same(JSON.parse(res.body), beta)
    })

    t.test('https get request - constrain - not found', async (t) => {
      t.plan(1)

      const url = `https://localhost:${fastify.server.address().port}/beta`
      const res = await h2url.concat({
        url
      })

      t.equal(res.headers[':status'], 404)
    })
    t.test('https get request - constrain - verify hostname and port from request', async (t) => {
      t.plan(1)

      const url = `https://localhost:${fastify.server.address().port}/hostname_port`
      const res = await h2url.concat({
        url,
        headers: {
          ':authority': constrain
        }
      })
      const body = JSON.parse(res.body)
      t.equal(body.hostname, constrain)
    })
  })
})
