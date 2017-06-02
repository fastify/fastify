'use strict'

const request = require('request')
const fastify = require('..')()
const sleep = require('then-sleep')

const schema = {
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

function asyncTest (t) {
  const test = t.test

  test('shorthand - async await get', t => {
    t.plan(1)
    try {
      fastify.get('/', schema, async function awaitMyFunc (req, reply) {
        await sleep(200)
        return { hello: 'world' }
      })
      t.pass()
    } catch (e) {
      t.fail()
    }
  })

  test('shorthand - async await get', t => {
    t.plan(1)
    try {
      fastify.get('/no-await', schema, async function (req, reply) {
        return { hello: 'world' }
      })
      t.pass()
    } catch (e) {
      t.fail()
    }
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    test('shorthand - request async await test', t => {
      t.plan(4)
      request({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(response.headers['content-length'], '' + body.length)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })
    })

    test('shorthand - request async test', t => {
      t.plan(4)
      request({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port + '/no-await'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(response.headers['content-length'], '' + body.length)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })
    })
  })
}

module.exports = asyncTest

if (require.main === module) {
  asyncTest(require('tap'))
}
