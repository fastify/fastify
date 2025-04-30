'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const sget = require('simple-get').concat
const fastify = require('..')()

test.after(() => fastify.close())

const opts = {
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

fastify.get('/return', opts, function (req, reply) {
  const promise = new Promise((resolve, reject) => {
    resolve({ hello: 'world' })
  })
  return promise
})

fastify.get('/return-error', opts, function (req, reply) {
  const promise = new Promise((resolve, reject) => {
    reject(new Error('some error'))
  })
  return promise
})

fastify.get('/double', function (req, reply) {
  setTimeout(function () {
    // this should not throw
    reply.send({ hello: 'world' })
  }, 20)
  return Promise.resolve({ hello: '42' })
})

fastify.get('/thenable', opts, function (req, reply) {
  setImmediate(function () {
    reply.send({ hello: 'world' })
  })
  return reply
})

fastify.get('/thenable-error', opts, function (req, reply) {
  setImmediate(function () {
    reply.send(new Error('kaboom'))
  })
  return reply
})

fastify.get('/return-reply', opts, function (req, reply) {
  return reply.send({ hello: 'world' })
})

fastify.listen({ port: 0 }, err => {
  assert.ifError(err)

  test('shorthand - sget return promise es6 get', (t, testDone) => {
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/return'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
      testDone()
    })
  })

  test('shorthand - sget promise es6 get return error', (t, testDone) => {
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/return-error'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 500)
      testDone()
    })
  })

  test('sget promise double send', (t, testDone) => {
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/double'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(JSON.parse(body), { hello: '42' })
      testDone()
    })
  })

  test('thenable', (t, testDone) => {
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/thenable'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
      testDone()
    })
  })

  test('thenable (error)', (t, testDone) => {
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/thenable-error'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 500)
      testDone()
    })
  })

  test('return-reply', (t, testDone) => {
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/return-reply'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
      testDone()
    })
  })
})
