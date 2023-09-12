'use strict'

const { Readable } = require('node:stream')
const { test } = require('tap')
const Fastify = require('..')

test('Should accept a custom genReqId function', t => {
  t.plan(4)

  const fastify = Fastify({
    genReqId: function (req) {
      return 'a'
    }
  })

  fastify.get('/', (req, reply) => {
    t.ok(req.id)
    reply.send({ id: req.id })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    fastify.inject({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.equal(payload.id, 'a')
      fastify.close()
    })
  })
})

test('Custom genReqId function gets raw request as argument', t => {
  t.plan(9)

  const REQUEST_ID = 'REQ-1234'

  const fastify = Fastify({
    genReqId: function (req) {
      t.notOk('id' in req)
      t.notOk('raw' in req)
      t.ok(req instanceof Readable)
      // http.IncomingMessage does have `rawHeaders` property, but FastifyRequest does not
      const index = req.rawHeaders.indexOf('x-request-id')
      const xReqId = req.rawHeaders[index + 1]
      t.equal(xReqId, REQUEST_ID)
      t.equal(req.headers['x-request-id'], REQUEST_ID)
      return xReqId
    }
  })

  fastify.get('/', (req, reply) => {
    t.equal(req.id, REQUEST_ID)
    reply.send({ id: req.id })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    fastify.inject({
      method: 'GET',
      headers: {
        'x-request-id': REQUEST_ID
      },
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.equal(payload.id, REQUEST_ID)
      fastify.close()
    })
  })
})
