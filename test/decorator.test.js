'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const fp = require('fastify-plugin')
const sget = require('simple-get').concat

test('server methods should exist', t => {
  t.plan(2)
  const fastify = Fastify()
  t.ok(fastify.decorate)
  t.ok(fastify.hasDecorator)
})

test('server methods should be incapsulated via .register', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.decorate('test', () => {})
    t.ok(instance.test)
    next()
  })

  fastify.ready(() => {
    t.notOk(fastify.test)
  })
})

test('hasServerMethod should check if the given method already exist', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.decorate('test', () => {})
    t.ok(instance.hasDecorator('test'))
    next()
  })

  fastify.ready(() => {
    t.notOk(fastify.hasDecorator('test'))
  })
})

test('decorate should throw if a declared dependency is not present', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    try {
      instance.decorate('test', () => {}, ['dependency'])
      t.fail()
    } catch (e) {
      t.is(e.message, 'Fastify decorator: missing dependency: \'dependency\'.')
    }
    next()
  })

  fastify.ready(() => t.pass())
})

// issue #777
test('should pass error for missing request decorator', t => {
  t.plan(2)
  const fastify = Fastify()

  const plugin = fp(function (instance, opts, next) {
    next()
  }, {
    decorators: {
      request: ['foo']
    }
  })
  fastify
    .register(plugin)
    .ready((err) => {
      t.type(err, Error)
      t.match(err, /The decorator 'foo'/)
    })
})

test('decorateReply inside register', t => {
  t.plan(12)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.decorateReply('test', 'test')
    t.ok(instance._Reply.prototype.test)

    instance.get('/yes', (req, reply) => {
      t.ok(reply.test, 'test exists')
      reply.send({ hello: 'world' })
    })

    next()
  })

  fastify.get('/no', (req, reply) => {
    t.notOk(reply.test)
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/yes'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/no'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('decorateReply as plugin (inside .after)', t => {
  t.plan(11)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.register(fp((i, o, n) => {
      instance.decorateReply('test', 'test')
      n()
    })).after(() => {
      instance.get('/yes', (req, reply) => {
        t.ok(reply.test)
        reply.send({ hello: 'world' })
      })
    })
    next()
  })

  fastify.get('/no', (req, reply) => {
    t.notOk(reply.test)
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/yes'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/no'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('decorateReply as plugin (outside .after)', t => {
  t.plan(11)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.register(fp((i, o, n) => {
      instance.decorateReply('test', 'test')
      n()
    }))

    instance.get('/yes', (req, reply) => {
      t.ok(reply.test)
      reply.send({ hello: 'world' })
    })
    next()
  })

  fastify.get('/no', (req, reply) => {
    t.notOk(reply.test)
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/yes'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/no'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('decorateRequest inside register', t => {
  t.plan(12)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.decorateRequest('test', 'test')
    t.ok(instance._Request.prototype.test)

    instance.get('/yes', (req, reply) => {
      t.ok(req.test, 'test exists')
      reply.send({ hello: 'world' })
    })

    next()
  })

  fastify.get('/no', (req, reply) => {
    t.notOk(req.test)
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/yes'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/no'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('decorateRequest as plugin (inside .after)', t => {
  t.plan(11)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.register(fp((i, o, n) => {
      instance.decorateRequest('test', 'test')
      n()
    })).after(() => {
      instance.get('/yes', (req, reply) => {
        t.ok(req.test)
        reply.send({ hello: 'world' })
      })
    })
    next()
  })

  fastify.get('/no', (req, reply) => {
    t.notOk(req.test)
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/yes'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/no'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('decorateRequest as plugin (outside .after)', t => {
  t.plan(11)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.register(fp((i, o, n) => {
      instance.decorateRequest('test', 'test')
      n()
    }))

    instance.get('/yes', (req, reply) => {
      t.ok(req.test)
      reply.send({ hello: 'world' })
    })
    next()
  })

  fastify.get('/no', (req, reply) => {
    t.notOk(req.test)
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/yes'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/no'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('decorators should be instance separated', t => {
  t.plan(1)

  const fastify1 = Fastify()
  const fastify2 = Fastify()

  fastify1.decorate('test', 'foo')
  fastify2.decorate('test', 'foo')

  fastify1.decorateRequest('test', 'foo')
  fastify2.decorateRequest('test', 'foo')

  fastify1.decorateReply('test', 'foo')
  fastify2.decorateReply('test', 'foo')

  t.pass()
})

test('hasRequestDecorator', t => {
  const requestDecoratorName = 'my-decorator-name'

  t.test('is a function', t => {
    t.plan(1)
    const fastify = Fastify()
    t.ok(fastify.hasRequestDecorator)
  })

  t.test('should check if the given request decoration already exist', t => {
    t.plan(2)
    const fastify = Fastify()

    t.notOk(fastify.hasRequestDecorator(requestDecoratorName))
    fastify.decorateRequest(requestDecoratorName, 42)
    t.ok(fastify.hasRequestDecorator(requestDecoratorName))
  })

  t.test('should be plugin encapsulable', t => {
    t.plan(4)
    const fastify = Fastify()

    t.notOk(fastify.hasRequestDecorator(requestDecoratorName))

    fastify.register(function (fastify2, opts, next) {
      fastify2.decorateRequest(requestDecoratorName, 42)
      t.ok(fastify2.hasRequestDecorator(requestDecoratorName))
      next()
    })

    t.notOk(fastify.hasRequestDecorator(requestDecoratorName))

    fastify.ready(function () {
      t.notOk(fastify.hasRequestDecorator(requestDecoratorName))
    })
  })

  t.test('should be inherited', t => {
    t.plan(2)
    const fastify = Fastify()

    fastify.decorateRequest(requestDecoratorName, 42)

    fastify.register(function (fastify2, opts, next) {
      t.ok(fastify2.hasRequestDecorator(requestDecoratorName))
      next()
    })

    fastify.ready(function () {
      t.ok(fastify.hasRequestDecorator(requestDecoratorName))
    })
  })

  t.end()
})

test('hasReplyDecorator', t => {
  const replyDecoratorName = 'my-decorator-name'

  t.test('is a function', t => {
    t.plan(1)
    const fastify = Fastify()
    t.ok(fastify.hasReplyDecorator)
  })

  t.test('should check if the given reply decoration already exist', t => {
    t.plan(2)
    const fastify = Fastify()

    t.notOk(fastify.hasReplyDecorator(replyDecoratorName))
    fastify.decorateReply(replyDecoratorName, 42)
    t.ok(fastify.hasReplyDecorator(replyDecoratorName))
  })

  t.test('should be plugin encapsulable', t => {
    t.plan(4)
    const fastify = Fastify()

    t.notOk(fastify.hasReplyDecorator(replyDecoratorName))

    fastify.register(function (fastify2, opts, next) {
      fastify2.decorateReply(replyDecoratorName, 42)
      t.ok(fastify2.hasReplyDecorator(replyDecoratorName))
      next()
    })

    t.notOk(fastify.hasReplyDecorator(replyDecoratorName))

    fastify.ready(function () {
      t.notOk(fastify.hasReplyDecorator(replyDecoratorName))
    })
  })

  t.test('should be inherited', t => {
    t.plan(2)
    const fastify = Fastify()

    fastify.decorateReply(replyDecoratorName, 42)

    fastify.register(function (fastify2, opts, next) {
      t.ok(fastify2.hasReplyDecorator(replyDecoratorName))
      next()
    })

    fastify.ready(function () {
      t.ok(fastify.hasReplyDecorator(replyDecoratorName))
    })
  })

  t.end()
})

test('should register properties via getter/setter objects', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.decorate('test', {
      getter () {
        return 'a getter'
      }
    })
    t.ok(instance.test)
    t.is(instance.test, 'a getter')
    next()
  })

  fastify.ready(() => {
    t.notOk(fastify.test)
  })
})

test('decorateRequest should work with getter/setter', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.decorateRequest('test', {
      getter () {
        return 'a getter'
      }
    })

    instance.get('/req-decorated-get-set', (req, res) => {
      res.send({ test: req.test })
    })

    next()
  })

  fastify.get('/not-decorated', (req, res) => {
    t.notOk(req.test)
    res.send()
  })

  fastify.ready(() => {
    fastify.inject({ url: '/req-decorated-get-set' }, (err, res) => {
      t.error(err)
      t.deepEqual(JSON.parse(res.payload), { test: 'a getter' })
    })

    fastify.inject({ url: '/not-decorated' }, (err, res) => {
      t.error(err)
      t.pass()
    })
  })
})

test('decorateReply should work with getter/setter', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.decorateReply('test', {
      getter () {
        return 'a getter'
      }
    })

    instance.get('/res-decorated-get-set', (req, res) => {
      res.send({ test: res.test })
    })

    next()
  })

  fastify.get('/not-decorated', (req, res) => {
    t.notOk(res.test)
    res.send()
  })

  fastify.ready(() => {
    fastify.inject({ url: '/res-decorated-get-set' }, (err, res) => {
      t.error(err)
      t.deepEqual(JSON.parse(res.payload), { test: 'a getter' })
    })

    fastify.inject({ url: '/not-decorated' }, (err, res) => {
      t.error(err)
      t.pass()
    })
  })
})

test('should register empty values', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.decorate('test', null)
    t.true(instance.hasOwnProperty('test'))
    next()
  })

  fastify.ready(() => {
    t.notOk(fastify.test)
  })
})
