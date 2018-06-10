'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')
const fp = require('fastify-plugin')
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

test('cannot add middleware after binding', t => {
  t.plan(2)
  const instance = fastify()

  instance.get('/', function (request, reply) {
    reply.send({ hello: 'world' })
  })

  instance.listen(0, err => {
    t.error(err)
    t.tearDown(instance.server.close.bind(instance.server))

    try {
      instance.route({
        method: 'GET',
        url: '/another-get-route',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      })
      t.fail()
    } catch (e) {
      t.pass()
    }
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
  t.plan(8)

  const instance = fastify()

  instance.register((i, opts, done) => {
    t.ok(i._middlewares.length === 0)
    i.use(function (req, res, next) {
      t.fail('this should not be called')
      next()
    })
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

test('middlewares should support non-encapsulated plugins', t => {
  t.plan(6)

  const instance = fastify()

  instance.register(fp(function (i, opts, done) {
    i.use(function (req, res, next) {
      t.ok('middleware called')
      req.midval = 10
      next()
    })

    done()
  }))

  instance.get('/', function (request, reply) {
    t.strictEqual(request.raw.midval, 10)
    reply.send({ hello: 'world' })
  })

  instance.register(fp(function (i, opts, done) {
    i.use(function (req, res, next) {
      t.ok('middleware called')
      next()
    })

    done()
  }))

  instance.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
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

test('res.end should block middleware execution', t => {
  t.plan(5)

  const instance = fastify()

  instance.addHook('onRequest', (req, res, next) => {
    t.ok('called')
    next()
  })

  instance.use(function (req, res, next) {
    res.end('hello')
  })

  instance.use(function (req, res, next) {
    t.fail('we should not be here')
  })

  instance.addHook('preHandler', (req, reply, next) => {
    t.fail('this should not be called')
  })

  instance.addHook('onSend', (req, reply, payload, next) => {
    t.fail('this should not be called')
  })

  instance.addHook('onResponse', (res, next) => {
    t.ok('called')
    next()
  })

  instance.get('/', function (request, reply) {
    t.fail('we should no be here')
  })

  instance.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.is(res.statusCode, 200)
    t.is(res.payload, 'hello')
  })
})

test('middlewares should be able to respond with a stream', t => {
  t.plan(4)

  const instance = fastify()

  instance.addHook('onRequest', (req, res, next) => {
    t.ok('called')
    next()
  })

  instance.use(function (req, res, next) {
    const stream = fs.createReadStream(process.cwd() + '/test/middleware.test.js', 'utf8')
    stream.pipe(res)
    res.once('finish', next)
  })

  instance.use(function (req, res, next) {
    t.fail('we should not be here')
  })

  instance.addHook('preHandler', (req, reply, next) => {
    t.fail('this should not be called')
  })

  instance.addHook('onSend', (req, reply, payload, next) => {
    t.fail('this should not be called')
  })

  instance.addHook('onResponse', (res, next) => {
    t.ok('called')
    next()
  })

  instance.get('/', function (request, reply) {
    t.fail('we should no be here')
  })

  instance.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.is(res.statusCode, 200)
  })
})

test('Use a middleware inside a plugin after an encapsulated plugin', t => {
  t.plan(5)
  const f = fastify()

  f.register(function (instance, opts, next) {
    instance.use(function (req, res, next) {
      t.ok('first middleware called')
      next()
    })

    instance.get('/', function (request, reply) {
      reply.send({ hello: 'world' })
    })

    next()
  })

  f.register(fp(function (instance, opts, next) {
    instance.use(function (req, res, next) {
      t.ok('second middleware called')
      next()
    })

    next()
  }))

  f.inject('/', (err, res) => {
    t.error(err)
    t.is(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('middlewares should run in the order in which they are defined', t => {
  t.plan(9)
  const f = fastify()

  f.register(function (instance, opts, next) {
    instance.use(function (req, res, next) {
      t.strictEqual(req.previous, undefined)
      req.previous = 1
      next()
    })

    instance.get('/', function (request, reply) {
      t.strictEqual(request.req.previous, 5)
      reply.send({ hello: 'world' })
    })

    instance.register(fp(function (i, opts, next) {
      i.use(function (req, res, next) {
        t.strictEqual(req.previous, 1)
        req.previous = 2
        next()
      })
      next()
    }))

    next()
  })

  f.register(fp(function (instance, opts, next) {
    instance.use(function (req, res, next) {
      t.strictEqual(req.previous, 2)
      req.previous = 3
      next()
    })

    instance.register(fp(function (i, opts, next) {
      i.use(function (req, res, next) {
        t.strictEqual(req.previous, 3)
        req.previous = 4
        next()
      })
      next()
    }))

    instance.use(function (req, res, next) {
      t.strictEqual(req.previous, 4)
      req.previous = 5
      next()
    })

    next()
  }))

  f.inject('/', (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
  })
})
