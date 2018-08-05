'use strict'

const sget = require('simple-get').concat
const stream = require('stream')

module.exports.payloadMethod = function (method, t) {
  const test = t.test
  const fastify = require('..')()
  const upMethod = method.toUpperCase()
  const loMethod = method.toLowerCase()

  const schema = {
    schema: {
      response: {
        '2xx': {
          type: 'object',
          properties: {
            hello: {
              type: 'string'
            }
          }
        }
      }
    }
  }

  test(`${upMethod} can be created`, t => {
    t.plan(1)
    try {
      fastify[loMethod]('/', schema, function (req, reply) {
        reply.code(200).send(req.body)
      })
      t.pass()
    } catch (e) {
      t.fail()
    }
  })

  test(`${upMethod} without schema can be created`, t => {
    t.plan(1)
    try {
      fastify[loMethod]('/missing', function (req, reply) {
        reply.code(200).send(req.body)
      })
      t.pass()
    } catch (e) {
      t.fail()
    }
  })

  test(`${upMethod} with body and querystring`, t => {
    t.plan(1)
    try {
      fastify[loMethod]('/with-query', function (req, reply) {
        req.body.hello = req.body.hello + req.query.foo
        reply.code(200).send(req.body)
      })
      t.pass()
    } catch (e) {
      t.fail()
    }
  })

  test(`${upMethod} with bodyLimit option`, t => {
    t.plan(1)
    try {
      fastify[loMethod]('/with-limit', { bodyLimit: 1 }, function (req, reply) {
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
      t.plan(3)
      sget({
        method: upMethod,
        url: 'http://localhost:' + fastify.server.address().port,
        body: {
          hello: 'world'
        },
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body, { hello: 'world' })
      })
    })

    test(`${upMethod} - correctly replies with very large body`, t => {
      t.plan(3)

      const largeString = 'world'.repeat(13200)
      sget({
        method: upMethod,
        url: 'http://localhost:' + fastify.server.address().port,
        body: { hello: largeString },
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body, { hello: largeString })
      })
    })

    test(`${upMethod} - correctly replies if the content type has the charset`, t => {
      t.plan(3)
      sget({
        method: upMethod,
        url: 'http://localhost:' + fastify.server.address().port,
        body: JSON.stringify({ hello: 'world' }),
        headers: {
          'content-type': 'application/json; charset=utf-8'
        }
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body.toString(), JSON.stringify({ hello: 'world' }))
      })
    })

    test(`${upMethod} without schema - correctly replies`, t => {
      t.plan(3)
      sget({
        method: upMethod,
        url: 'http://localhost:' + fastify.server.address().port + '/missing',
        body: {
          hello: 'world'
        },
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body, { hello: 'world' })
      })
    })

    test(`${upMethod} with body and querystring - correctly replies`, t => {
      t.plan(3)
      sget({
        method: upMethod,
        url: 'http://localhost:' + fastify.server.address().port + '/with-query?foo=hello',
        body: {
          hello: 'world'
        },
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body, { hello: 'worldhello' })
      })
    })

    test(`${upMethod} with no body - correctly replies`, t => {
      t.plan(6)

      sget({
        method: upMethod,
        url: 'http://localhost:' + fastify.server.address().port + '/missing',
        headers: { 'Content-Length': '0' },
        timeout: 500
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(JSON.parse(body.toString()), null)
      })

      // Must use inject to make a request without a Content-Length header
      fastify.inject({
        method: upMethod,
        url: '/missing'
      }, (err, res) => {
        t.error(err)
        t.strictEqual(res.statusCode, 200)
        t.strictEqual(JSON.parse(res.payload), null)
      })
    })

    test(`${upMethod} returns 415 - incorrect media type if body is not json`, t => {
      t.plan(2)
      sget({
        method: upMethod,
        url: 'http://localhost:' + fastify.server.address().port + '/missing',
        body: 'hello world',
        timeout: 500
      }, (err, response, body) => {
        t.error(err)
        if (upMethod === 'OPTIONS') {
          t.strictEqual(response.statusCode, 200)
        } else {
          t.strictEqual(response.statusCode, 415)
        }
      })
    })

    if (loMethod === 'options') {
      test(`OPTIONS returns 415 - should return 415 if Content-Type is not json`, t => {
        t.plan(2)
        sget({
          method: upMethod,
          url: 'http://localhost:' + fastify.server.address().port + '/missing',
          body: 'hello world',
          headers: {
            'Content-Type': 'text/plain'
          },
          timeout: 500
        }, (err, response, body) => {
          t.error(err)
          t.strictEqual(response.statusCode, 415)
        })
      })
    }

    test(`${upMethod} returns 400 - Bad Request`, t => {
      t.plan(4)

      sget({
        method: upMethod,
        url: 'http://localhost:' + fastify.server.address().port,
        body: 'hello world',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 500
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 400)
      })

      sget({
        method: upMethod,
        url: 'http://localhost:' + fastify.server.address().port,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': '0'
        },
        timeout: 500
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 400)
      })
    })

    test(`${upMethod} returns 413 - Payload Too Large`, t => {
      t.plan(upMethod === 'OPTIONS' ? 4 : 6)

      sget({
        method: upMethod,
        url: 'http://localhost:' + fastify.server.address().port,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': 1024 * 1024 + 1
        }
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 413)
      })

      // Node errors for OPTIONS requests with a stream body and no Content-Length header
      if (upMethod !== 'OPTIONS') {
        var chunk = Buffer.allocUnsafe(1024 * 1024 + 1)
        const largeStream = new stream.Readable({
          read () {
            this.push(chunk)
            chunk = null
          }
        })
        sget({
          method: upMethod,
          url: 'http://localhost:' + fastify.server.address().port,
          headers: { 'Content-Type': 'application/json' },
          body: largeStream,
          timeout: 500
        }, (err, response, body) => {
          t.error(err)
          t.strictEqual(response.statusCode, 413)
        })
      }

      sget({
        method: upMethod,
        url: `http://localhost:${fastify.server.address().port}/with-limit`,
        headers: { 'Content-Type': 'application/json' },
        body: {},
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 413)
      })
    })
  })
}
