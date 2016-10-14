'use strict'

const request = require('request')
const http = require('http')

module.exports.payloadMethod = function (method, t) {
  const test = t.test
  const fastify = require('..')()
  const server = http.createServer(fastify)
  const upMethod = method.toUpperCase()
  const loMethod = method.toLowerCase()

  const schema = {
    payload: {
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
        reply(null, 200, req.body)
      })
      t.pass()
    } catch (e) {
      t.fail()
    }
  })

  server.listen(0, function (err) {
    if (err) {
      t.error(err)
    }

    server.unref()

    test(`${upMethod} - correctly replies`, t => {
      t.plan(3)
      request({
        method: upMethod,
        uri: 'http://localhost:' + server.address().port,
        body: {
          hello: 42
        },
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body, { hello: 42 })
      })
    })

    test(`${upMethod} - 400 on bad parameters`, t => {
      t.plan(3)
      request({
        method: upMethod,
        uri: 'http://localhost:' + server.address().port,
        body: {
          hello: 'world'
        },
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 400)
        t.deepEqual(body[0], {
          keyword: 'type',
          dataPath: '.hello',
          schemaPath: '#/properties/hello/type',
          params: { type: 'integer' },
          message: 'should be integer'
        })
      })
    })

    test(`${upMethod} - input-validation coerce`, t => {
      t.plan(3)
      request({
        method: upMethod,
        uri: 'http://localhost:' + server.address().port,
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
