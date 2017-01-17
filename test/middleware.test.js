'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const fastify = require('..')

test('use a middleware', t => {
  t.plan(7)

  const instance = fastify()

  const useRes = instance.use(function (req, res, next) {
    t.pass('middleware called')
    next()
  })

  t.equal(useRes, instance)

  instance.get('/', function (request, reply) {
    reply.send({ hello: 'world' })
  })

  instance.listen(0, err => {
    t.error(err)

    t.tearDown(instance.server.close.bind(instance.server))

    request({
      method: 'GET',
      uri: 'http://localhost:' + instance.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})
