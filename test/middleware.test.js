'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')
const cors = require('cors')
const helmet = require('helmet')
const serveStatic = require('serve-static')
const fs = require('fs')
const path = require('path')

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

    sget({
      method: 'GET',
      url: 'http://localhost:' + instance.server.address().port
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

    sget({
      method: 'GET',
      url: 'http://localhost:' + instance.server.address().port
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

    sget({
      method: 'GET',
      url: 'http://localhost:' + instance.server.address().port
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

    sget({
      method: 'GET',
      url: 'http://localhost:' + instance.server.address().port
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

    sget({
      method: 'GET',
      url: 'http://localhost:' + instance.server.address().port
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
      t.ok(request.raw.global)
      t.ok(request.raw.local)
      reply.send({ hello: 'world' })
    })

    done()
  })

  instance.get('/global', function (request, reply) {
    t.ok(request.raw.global)
    t.notOk(request.raw.local)
    reply.send({ hello: 'world' })
  })

  instance.listen(0, err => {
    t.error(err)
    t.tearDown(instance.server.close.bind(instance.server))

    sget({
      method: 'GET',
      url: 'http://localhost:' + instance.server.address().port + '/global'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      sget({
        method: 'GET',
        url: 'http://localhost:' + instance.server.address().port + '/local'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(response.headers['content-length'], '' + body.length)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })
    })
  })
})

test('middlewares should support encapsulation / 3', t => {
  t.plan(15)

  const instance = fastify()

  instance.use(function (req, res, next) {
    req.global = true
    next()
  })

  instance.register((i, opts, done) => {
    i.use(function (req, res, next) {
      req.firstLocal = true
      next()
    })

    i.use(function (req, res, next) {
      req.secondLocal = true
      next()
    })

    i.get('/local', function (request, reply) {
      t.ok(request.raw.global)
      t.ok(request.raw.firstLocal)
      t.ok(request.raw.secondLocal)
      reply.send({ hello: 'world' })
    })

    done()
  })

  instance.get('/global', function (request, reply) {
    t.ok(request.raw.global)
    t.notOk(request.raw.firstLocal)
    t.notOk(request.raw.secondLocal)
    reply.send({ hello: 'world' })
  })

  instance.listen(0, err => {
    t.error(err)
    t.tearDown(instance.server.close.bind(instance.server))

    sget({
      method: 'GET',
      url: 'http://localhost:' + instance.server.address().port + '/global'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      sget({
        method: 'GET',
        url: 'http://localhost:' + instance.server.address().port + '/local'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(response.headers['content-length'], '' + body.length)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })
    })
  })
})

test('middlewares should support encapsulation / 4', t => {
  t.plan(25)

  const instance = fastify()

  instance.use(function (req, res, next) {
    req.global = true
    next()
  })

  instance.register((i, opts, done) => {
    i.use(function (req, res, next) {
      req.firstLocal = true
      next()
    })

    i.register((f, opts, d) => {
      f.use(function (req, res, next) {
        req.secondLocal = true
        next()
      })

      f.get('/secondLocal', function (request, reply) {
        t.ok(request.raw.global)
        t.ok(request.raw.firstLocal)
        t.ok(request.raw.secondLocal)
        t.ok(request.raw.thirdLocal)
        reply.send({ hello: 'world' })
      })

      f.use(function (req, res, next) {
        req.thirdLocal = true
        next()
      })

      d()
    })

    i.get('/firstLocal', function (request, reply) {
      t.ok(request.raw.global)
      t.ok(request.raw.firstLocal)
      t.notOk(request.raw.secondLocal)
      t.notOk(request.raw.thirdLocal)
      reply.send({ hello: 'world' })
    })

    done()
  })

  instance.get('/global', function (request, reply) {
    t.ok(request.raw.global)
    t.notOk(request.raw.firstLocal)
    t.notOk(request.raw.secondLocal)
    t.notOk(request.raw.thirdLocal)
    reply.send({ hello: 'world' })
  })

  instance.listen(0, err => {
    t.error(err)
    t.tearDown(instance.server.close.bind(instance.server))

    sget({
      method: 'GET',
      url: 'http://localhost:' + instance.server.address().port + '/global'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      sget({
        method: 'GET',
        url: 'http://localhost:' + instance.server.address().port + '/firstLocal'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(response.headers['content-length'], '' + body.length)
        t.deepEqual(JSON.parse(body), { hello: 'world' })

        sget({
          method: 'GET',
          url: 'http://localhost:' + instance.server.address().port + '/secondLocal'
        }, (err, response, body) => {
          t.error(err)
          t.strictEqual(response.statusCode, 200)
          t.strictEqual(response.headers['content-length'], '' + body.length)
          t.deepEqual(JSON.parse(body), { hello: 'world' })
        })
      })
    })
  })
})

test('middlewares should support encapsulation / 5', t => {
  t.plan(9)

  const instance = fastify()

  instance.use(function (req, res, next) {
    req.global = true
    next()
  })

  instance.register((i, opts, done) => {
    i.use(function (req, res, next) {
      next(new Error('kaboom!'))
    })

    i.get('/local', function (request, reply) {
      t.fail('this should not be called')
    })

    done()
  })

  instance.get('/global', function (request, reply) {
    t.ok(request.raw.global)
    reply.send({ hello: 'world' })
  })

  instance.listen(0, err => {
    t.error(err)
    t.tearDown(instance.server.close.bind(instance.server))

    sget({
      method: 'GET',
      url: 'http://localhost:' + instance.server.address().port + '/global'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      sget({
        method: 'GET',
        url: 'http://localhost:' + instance.server.address().port + '/local'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 500)
        t.deepEqual(JSON.parse(body), {
          error: 'Internal Server Error',
          message: 'kaboom!',
          statusCode: 500
        })
      })
    })
  })
})

test('middlewares should support encapsulation with prefix', t => {
  t.plan(9)

  const instance = fastify()

  instance.use(function (req, res, next) {
    req.global = true
    next()
  })

  instance.register((i, opts, done) => {
    i.use(function (req, res, next) {
      next(new Error('kaboom!'))
    })

    i.get('/', function (request, reply) {
      t.fail('this should not be called')
    })

    done()
  }, { prefix: '/local' })

  instance.get('/global', function (request, reply) {
    t.ok(request.raw.global)
    reply.send({ hello: 'world' })
  })

  instance.listen(0, err => {
    t.error(err)
    t.tearDown(instance.server.close.bind(instance.server))

    sget({
      method: 'GET',
      url: 'http://localhost:' + instance.server.address().port + '/global'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })

      sget({
        method: 'GET',
        url: 'http://localhost:' + instance.server.address().port + '/local'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 500)
        t.deepEqual(JSON.parse(body), {
          error: 'Internal Server Error',
          message: 'kaboom!',
          statusCode: 500
        })
      })
    })
  })
})

test('use serve-static', t => {
  t.plan(2)

  const instance = fastify()

  instance.use(serveStatic(__dirname))

  const basename = path.basename(__filename)

  instance.inject({
    method: 'GET',
    url: '/' + basename
  }, (err, res) => {
    t.error(err)
    t.deepEqual(res.payload, fs.readFileSync(__filename, 'utf8'))
  })
})

test('middlewares with prefix', t => {
  t.plan(5)

  const instance = fastify()

  instance.use(function (req, res, next) {
    req.global = true
    next()
  })
  instance.use('', function (req, res, next) {
    req.global2 = true
    next()
  })
  instance.use('/', function (req, res, next) {
    req.root = true
    next()
  })
  instance.use('/prefix', function (req, res, next) {
    req.prefixed = true
    next()
  })
  instance.use('/prefix/', function (req, res, next) {
    req.slashed = true
    next()
  })

  function handler (request, reply) {
    reply.send({
      prefixed: request.raw.prefixed,
      slashed: request.raw.slashed,
      global: request.raw.global,
      global2: request.raw.global2,
      root: request.raw.root
    })
  }

  instance.get('/', handler)
  instance.get('/prefix', handler)
  instance.get('/prefix/', handler)
  instance.get('/prefix/inner', handler)

  instance.listen(0, err => {
    t.error(err)
    t.tearDown(instance.server.close.bind(instance.server))

    t.test('/', t => {
      t.plan(2)
      sget({
        method: 'GET',
        url: 'http://localhost:' + instance.server.address().port + '/',
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.deepEqual(body, {
          global: true,
          global2: true,
          root: true
        })
      })
    })

    t.test('/prefix', t => {
      t.plan(2)
      sget({
        method: 'GET',
        url: 'http://localhost:' + instance.server.address().port + '/prefix',
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.deepEqual(body, {
          prefixed: true,
          global: true,
          global2: true,
          root: true,
          slashed: true
        })
      })
    })

    t.test('/prefix/', t => {
      t.plan(2)
      sget({
        method: 'GET',
        url: 'http://localhost:' + instance.server.address().port + '/prefix/',
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.deepEqual(body, {
          prefixed: true,
          slashed: true,
          global: true,
          global2: true,
          root: true
        })
      })
    })

    t.test('/prefix/inner', t => {
      t.plan(2)
      sget({
        method: 'GET',
        url: 'http://localhost:' + instance.server.address().port + '/prefix/inner',
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.deepEqual(body, {
          prefixed: true,
          slashed: true,
          global: true,
          global2: true,
          root: true
        })
      })
    })
  })
})
