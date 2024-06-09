'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')()

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
  t.error(err)
  t.teardown(() => { fastify.close() })

  test('shorthand - sget return promise es6 get', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/return'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })

  test('shorthand - sget promise es6 get return error', t => {
    t.plan(2)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/return-error'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 500)
    })
  })

  test('sget promise double send', t => {
    t.plan(3)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/double'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), { hello: '42' })
    })
  })

  test('thenable', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/thenable'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })

  test('thenable (error)', t => {
    t.plan(2)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/thenable-error'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 500)
    })
  })

  test('return-reply', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/return-reply'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})
