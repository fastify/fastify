'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const Bluebird = require('bluebird')
const fastify = require('..')()

const schema = {
  out: {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    }
  }
}

test('shorthand - promise es6 get', t => {
  t.plan(1)
  try {
    fastify.get('/', schema, function (req, reply) {
      const promise = new Promise((resolve, reject) => {
        resolve({ hello: 'world' })
      })
      reply.header('content-type', 'application/json').code(200).send(promise)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - return promise es6 get', t => {
  t.plan(1)
  try {
    fastify.get('/return', schema, function (req, reply) {
      const promise = new Promise((resolve, reject) => {
        resolve({ hello: 'world' })
      })
      return promise
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - promise es6 get error', t => {
  t.plan(1)
  try {
    fastify.get('/error', schema, function (req, reply) {
      const promise = new Promise((resolve, reject) => {
        reject(new Error('some error'))
      })
      reply.send(promise)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - promise bluebird get', t => {
  t.plan(1)
  try {
    fastify.get('/bluebird', schema, function (req, reply) {
      const promise = new Bluebird((resolve, reject) => {
        resolve({ hello: 'world' })
      })
      reply.header('content-type', 'application/json').code(200).send(promise)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - promise bluebird get error', t => {
  t.plan(1)
  try {
    fastify.get('/bluebird-error', schema, function (req, reply) {
      const promise = new Bluebird((resolve, reject) => {
        reject(new Error('some error'))
      })
      reply.send(promise)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('shorthand - request promise es6 get', t => {
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

  test('shorthand - request return promise es6 get', t => {
    t.plan(4)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/return'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })

  test('shorthand - request promise es6 get error', t => {
    t.plan(2)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/error'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 500)
    })
  })

  test('shorthand - request promise bluebird get', t => {
    t.plan(4)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/bluebird'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })

  test('shorthand - request promise bluebird get error', t => {
    t.plan(2)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/bluebird-error'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 500)
    })
  })

  test('request promise double send', t => {
    t.plan(4)
    fastify.get('/kaboom', function (req, reply) {
      setTimeout(function () {
        t.throws(function () {
          reply.send(Promise.resolve({ hello: 'world' }))
        }, 'double send throws')
      }, 20)
      return Promise.resolve({ hello: '42' })
    })

    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/kaboom'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(JSON.parse(body), { hello: '42' })
    })
  })
})
