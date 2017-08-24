'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const fastify = require('..')
const cors = require('cors')
const helmet = require('helmet')

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

test('use cors', t => {
  t.plan(3)

  const instance = fastify()

  instance.use(cors())

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
      t.equal(response.headers['access-control-allow-origin'], '*')
    })
  })
})

test('use helmet', t => {
  t.plan(3)

  const instance = fastify()

  instance.use(helmet())

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
      t.ok(response.headers['x-xss-protection'])
    })
  })
})

test('use helmet and cors', t => {
  t.plan(4)

  const instance = fastify()

  instance.use(cors())
  instance.use(helmet())

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
      t.ok(response.headers['x-xss-protection'])
      t.equal(response.headers['access-control-allow-origin'], '*')
    })
  })
})

test('middlewares should support encapsulation / 1', t => {
  t.plan(9)

  const instance = fastify()

  instance.register((i, opts, done) => {
    t.ok(i._middlewares.length === 0)
    i.use(function (req, res, next) {
      t.fail('this should not be called')
      next()
    })
    t.ok(i._middlewares.length > 0)
    done()
  })

  instance.get('/', function (request, reply) {
    t.ok(instance._middlewares.length === 0)
    reply.send({ hello: 'world' })
  })

  instance.listen(0, err => {
    t.error(err)
    t.ok(instance._middlewares.length === 0)
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

test('middlewares should support encapsulation / 2', t => {
  t.plan(13)

  const instance = fastify()

  instance.use(function (req, res, next) {
    req.global = true
    next()
  })

  instance.register((i, opts, done) => {
    i.use(function (req, res, next) {
      req.local = true
      next()
    })

    i.get('/local', function (request, reply) {
      t.ok(request.req.global)
      t.ok(request.req.local)
      reply.send({ hello: 'world' })
    })

    done()
  })

  instance.get('/global', function (request, reply) {
    t.ok(request.req.global)
    t.notOk(request.req.local)
    reply.send({ hello: 'world' })
  })

  instance.listen(0, err => {
    t.error(err)
    t.tearDown(instance.server.close.bind(instance.server))

    request({
      method: 'GET',
      uri: 'http://localhost:' + instance.server.address().port + '/global'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      request({
        method: 'GET',
        uri: 'http://localhost:' + instance.server.address().port + '/local'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(response.headers['content-length'], '' + body.length)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })
    })
  })
})
