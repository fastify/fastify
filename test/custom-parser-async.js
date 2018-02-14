'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('..')

test('contentTypeParser should add a custom async parser', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.options('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/jsoff', async function (req) {
    var res = await new Promise((resolve, reject) => resolve(req))
    return res
  })

  fastify.listen(0, err => {
    t.error(err)

    t.tearDown(() => fastify.close())

    t.test('in POST', t => {
      t.plan(3)

      sget({
        method: 'POST',
        url: 'http://localhost:' + fastify.server.address().port,
        body: '{"hello":"world"}',
        headers: {
          'Content-Type': 'application/jsoff'
        }
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body.toString(), JSON.stringify({ hello: 'world' }))
      })
    })

    t.test('in OPTIONS', t => {
      t.plan(3)

      sget({
        method: 'OPTIONS',
        url: 'http://localhost:' + fastify.server.address().port,
        body: '{"hello":"world"}',
        headers: {
          'Content-Type': 'application/jsoff'
        }
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body.toString(), JSON.stringify({ hello: 'world' }))
      })
    })
  })
})
