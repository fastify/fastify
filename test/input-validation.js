'use strict'

const request = require('request')

module.exports.payloadMethod = function (method, t) {
  const test = t.test
  const fastify = require('..')()
  const upMethod = method.toUpperCase()
  const loMethod = method.toLowerCase()

  const schema = {
    body: {
      type: 'object',
      properties: {
        hello: {
          type: 'integer'
        }
      }
    }
  }

  test(`${upMethod} can be created`, t => {
    t.plan(1)
    try {
      fastify[loMethod]('/', schema, function (req, reply) {
        reply.send(req.body)
      })
      t.pass()
    } catch (e) {
      t.fail()
    }
  })

  fastify.listen(0, function (err) {
    if (err) {
      t.error(err)
    }

    fastify.server.unref()

    test(`${upMethod} - correctly replies`, t => {
      if (upMethod === 'HEAD') {
        t.plan(2)
        request({
          method: upMethod,
          uri: 'http://localhost:' + fastify.server.address().port
        }, (err, response) => {
          t.error(err)
          t.strictEqual(response.statusCode, 200)
        })
      } else {
        t.plan(3)
        request({
          method: upMethod,
          uri: 'http://localhost:' + fastify.server.address().port,
          body: {
            hello: 42
          },
          json: true
        }, (err, response, body) => {
          t.error(err)
          t.strictEqual(response.statusCode, 200)
          t.deepEqual(body, { hello: 42 })
        })
      }
    })

    test(`${upMethod} - 400 on bad parameters`, t => {
      t.plan(3)
      request({
        method: upMethod,
        uri: 'http://localhost:' + fastify.server.address().port,
        body: {
          hello: 'world'
        },
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 400)
        t.deepEqual(body, {
          error: 'Bad Request',
          message: JSON.stringify([{
            keyword: 'type',
            dataPath: '.hello',
            schemaPath: '#/properties/hello/type',
            params: { type: 'integer' },
            message: 'should be integer'
          }]),
          statusCode: 400
        })
      })
    })

    test(`${upMethod} - input-validation coerce`, t => {
      t.plan(3)
      request({
        method: upMethod,
        uri: 'http://localhost:' + fastify.server.address().port,
        body: {
          hello: '42'
        },
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body, { hello: 42 })
      })
    })
  })
}
