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
  t.plan(5)

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

  const constrain = 'fastify.io'

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

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

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
  })
})
