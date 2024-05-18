'use strict'

/* eslint no-prototype-builtins: 0 */

const t = require('tap')
const test = t.test
const Fastify = require('..')
const fp = require('fastify-plugin')
const sget = require('simple-get').concat
const symbols = require('../lib/symbols.js')
const proxyquire = require('proxyquire')

test('server methods should exist', t => {
  t.plan(2)
  const fastify = Fastify()
  t.ok(fastify.decorate)
  t.ok(fastify.hasDecorator)
})

test('should check if the given decoration already exist when null', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.decorate('null', null)
  fastify.ready(() => {
    t.ok(fastify.hasDecorator('null'))
  })
})

test('server methods should be encapsulated via .register', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.decorate('test', () => {})
    t.ok(instance.test)
    done()
  })

  fastify.ready(() => {
    t.notOk(fastify.test)
  })
})

test('hasServerMethod should check if the given method already exist', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.decorate('test', () => {})
    t.ok(instance.hasDecorator('test'))
    done()
  })

  fastify.ready(() => {
    t.notOk(fastify.hasDecorator('test'))
  })
})

test('decorate should throw if a declared dependency is not present', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    try {
      instance.decorate('test', () => {}, ['dependency'])
      t.fail()
    } catch (e) {
      t.same(e.code, 'FST_ERR_DEC_MISSING_DEPENDENCY')
      t.same(e.message, 'The decorator is missing dependency \'dependency\'.')
    }
    done()
  })

  fastify.ready(() => t.pass())
})

test('decorate should throw if declared dependency is not array', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    try {
      instance.decorate('test', () => {}, {})
      t.fail()
    } catch (e) {
      t.same(e.code, 'FST_ERR_DEC_DEPENDENCY_INVALID_TYPE')
      t.same(e.message, 'The dependencies of decorator \'test\' must be of type Array.')
    }
    done()
  })

  fastify.ready(() => t.pass())
})

// issue #777
test('should pass error for missing request decorator', t => {
  t.plan(2)
  const fastify = Fastify()

  const plugin = fp(function (instance, opts, done) {
    done()
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
  t.plan(11)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.decorateReply('test', 'test')

    instance.get('/yes', (req, reply) => {
      t.ok(reply.test, 'test exists')
      reply.send({ hello: 'world' })
    })

    done()
  })

  fastify.get('/no', (req, reply) => {
    t.notOk(reply.test)
    reply.send({ hello: 'world' })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/yes'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/no'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('decorateReply as plugin (inside .after)', t => {
  t.plan(11)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.register(fp((i, o, n) => {
      instance.decorateReply('test', 'test')
      n()
    })).after(() => {
      instance.get('/yes', (req, reply) => {
        t.ok(reply.test)
        reply.send({ hello: 'world' })
      })
    })
    done()
  })

  fastify.get('/no', (req, reply) => {
    t.notOk(reply.test)
    reply.send({ hello: 'world' })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/yes'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/no'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('decorateReply as plugin (outside .after)', t => {
  t.plan(11)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.register(fp((i, o, n) => {
      instance.decorateReply('test', 'test')
      n()
    }))

    instance.get('/yes', (req, reply) => {
      t.ok(reply.test)
      reply.send({ hello: 'world' })
    })
    done()
  })

  fastify.get('/no', (req, reply) => {
    t.notOk(reply.test)
    reply.send({ hello: 'world' })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/yes'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/no'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('decorateRequest inside register', t => {
  t.plan(11)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.decorateRequest('test', 'test')

    instance.get('/yes', (req, reply) => {
      t.ok(req.test, 'test exists')
      reply.send({ hello: 'world' })
    })

    done()
  })

  fastify.get('/no', (req, reply) => {
    t.notOk(req.test)
    reply.send({ hello: 'world' })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/yes'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/no'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('decorateRequest as plugin (inside .after)', t => {
  t.plan(11)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.register(fp((i, o, n) => {
      instance.decorateRequest('test', 'test')
      n()
    })).after(() => {
      instance.get('/yes', (req, reply) => {
        t.ok(req.test)
        reply.send({ hello: 'world' })
      })
    })
    done()
  })

  fastify.get('/no', (req, reply) => {
    t.notOk(req.test)
    reply.send({ hello: 'world' })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/yes'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/no'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('decorateRequest as plugin (outside .after)', t => {
  t.plan(11)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.register(fp((i, o, n) => {
      instance.decorateRequest('test', 'test')
      n()
    }))

    instance.get('/yes', (req, reply) => {
      t.ok(req.test)
      reply.send({ hello: 'world' })
    })
    done()
  })

  fastify.get('/no', (req, reply) => {
    t.notOk(req.test)
    reply.send({ hello: 'world' })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/yes'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/no'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
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

  t.test('should check if the given request decoration already exist when null', t => {
    t.plan(2)
    const fastify = Fastify()

    t.notOk(fastify.hasRequestDecorator(requestDecoratorName))
    fastify.decorateRequest(requestDecoratorName, null)
    t.ok(fastify.hasRequestDecorator(requestDecoratorName))
  })

  t.test('should be plugin encapsulable', t => {
    t.plan(4)
    const fastify = Fastify()

    t.notOk(fastify.hasRequestDecorator(requestDecoratorName))

    fastify.register(function (fastify2, opts, done) {
      fastify2.decorateRequest(requestDecoratorName, 42)
      t.ok(fastify2.hasRequestDecorator(requestDecoratorName))
      done()
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

    fastify.register(function (fastify2, opts, done) {
      t.ok(fastify2.hasRequestDecorator(requestDecoratorName))
      done()
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

  t.test('should check if the given reply decoration already exist when null', t => {
    t.plan(2)
    const fastify = Fastify()

    t.notOk(fastify.hasReplyDecorator(replyDecoratorName))
    fastify.decorateReply(replyDecoratorName, null)
    t.ok(fastify.hasReplyDecorator(replyDecoratorName))
  })

  t.test('should be plugin encapsulable', t => {
    t.plan(4)
    const fastify = Fastify()

    t.notOk(fastify.hasReplyDecorator(replyDecoratorName))

    fastify.register(function (fastify2, opts, done) {
      fastify2.decorateReply(replyDecoratorName, 42)
      t.ok(fastify2.hasReplyDecorator(replyDecoratorName))
      done()
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

    fastify.register(function (fastify2, opts, done) {
      t.ok(fastify2.hasReplyDecorator(replyDecoratorName))
      done()
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

  fastify.register((instance, opts, done) => {
    instance.decorate('test', {
      getter () {
        return 'a getter'
      }
    })
    t.ok(instance.test)
    t.ok(instance.test, 'a getter')
    done()
  })

  fastify.ready(() => {
    t.notOk(fastify.test)
  })
})

test('decorateRequest should work with getter/setter', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.decorateRequest('test', {
      getter () {
        return 'a getter'
      }
    })

    instance.get('/req-decorated-get-set', (req, res) => {
      res.send({ test: req.test })
    })

    done()
  })

  fastify.get('/not-decorated', (req, res) => {
    t.notOk(req.test)
    res.send()
  })

  fastify.ready(() => {
    fastify.inject({ url: '/req-decorated-get-set' }, (err, res) => {
      t.error(err)
      t.same(JSON.parse(res.payload), { test: 'a getter' })
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

  fastify.register((instance, opts, done) => {
    instance.decorateReply('test', {
      getter () {
        return 'a getter'
      }
    })

    instance.get('/res-decorated-get-set', (req, res) => {
      res.send({ test: res.test })
    })

    done()
  })

  fastify.get('/not-decorated', (req, res) => {
    t.notOk(res.test)
    res.send()
  })

  fastify.ready(() => {
    fastify.inject({ url: '/res-decorated-get-set' }, (err, res) => {
      t.error(err)
      t.same(JSON.parse(res.payload), { test: 'a getter' })
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

  fastify.register((instance, opts, done) => {
    instance.decorate('test', null)
    t.ok(Object.prototype.hasOwnProperty.call(instance, 'test'))
    done()
  })

  fastify.ready(() => {
    t.notOk(fastify.test)
  })
})

test('nested plugins can override things', t => {
  t.plan(6)
  const fastify = Fastify()

  const rootFunc = () => {}
  fastify.decorate('test', rootFunc)
  fastify.decorateRequest('test', rootFunc)
  fastify.decorateReply('test', rootFunc)

  fastify.register((instance, opts, done) => {
    const func = () => {}
    instance.decorate('test', func)
    instance.decorateRequest('test', func)
    instance.decorateReply('test', func)

    t.equal(instance.test, func)
    t.equal(instance[symbols.kRequest].prototype.test, func)
    t.equal(instance[symbols.kReply].prototype.test, func)
    done()
  })

  fastify.ready(() => {
    t.equal(fastify.test, rootFunc)
    t.equal(fastify[symbols.kRequest].prototype.test, rootFunc)
    t.equal(fastify[symbols.kReply].prototype.test, rootFunc)
  })
})

test('a decorator should addSchema to all the encapsulated tree', t => {
  t.plan(1)
  const fastify = Fastify()

  const decorator = function (instance, opts, done) {
    instance.decorate('decoratorAddSchema', function (whereAddTheSchema) {
      instance.addSchema({
        $id: 'schema',
        type: 'string'
      })
    })
    done()
  }

  fastify.register(fp(decorator))

  fastify.register(function (instance, opts, done) {
    instance.register((subInstance, opts, done) => {
      subInstance.decoratorAddSchema()
      done()
    })
    done()
  })

  fastify.ready(t.error)
})

test('after can access to a decorated instance and previous plugin decoration', t => {
  t.plan(11)
  const TEST_VALUE = {}
  const OTHER_TEST_VALUE = {}
  const NEW_TEST_VALUE = {}

  const fastify = Fastify()

  fastify.register(fp(function (instance, options, done) {
    instance.decorate('test', TEST_VALUE)

    done()
  })).after(function (err, instance, done) {
    t.error(err)
    t.equal(instance.test, TEST_VALUE)

    instance.decorate('test2', OTHER_TEST_VALUE)
    done()
  })

  fastify.register(fp(function (instance, options, done) {
    t.equal(instance.test, TEST_VALUE)
    t.equal(instance.test2, OTHER_TEST_VALUE)

    instance.decorate('test3', NEW_TEST_VALUE)

    done()
  })).after(function (err, instance, done) {
    t.error(err)
    t.equal(instance.test, TEST_VALUE)
    t.equal(instance.test2, OTHER_TEST_VALUE)
    t.equal(instance.test3, NEW_TEST_VALUE)

    done()
  })

  fastify.get('/', function (req, res) {
    t.equal(this.test, TEST_VALUE)
    t.equal(this.test2, OTHER_TEST_VALUE)
    res.send({})
  })

  fastify.inject('/')
    .then(response => {
      t.equal(response.statusCode, 200)
    })
})

test('decorate* should throw if called after ready', async t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.get('/', (request, reply) => {
    reply.send({
      hello: 'world'
    })
  })

  await fastify.listen({ port: 0 })
  try {
    fastify.decorate('test', true)
    t.fail('should not decorate')
  } catch (err) {
    t.same(err.code, 'FST_ERR_DEC_AFTER_START')
    t.same(err.message, "The decorator 'test' has been added after start!")
  }
  try {
    fastify.decorateRequest('test', true)
    t.fail('should not decorate')
  } catch (e) {
    t.same(e.code, 'FST_ERR_DEC_AFTER_START')
    t.same(e.message, "The decorator 'test' has been added after start!")
  }
  try {
    fastify.decorateReply('test', true)
    t.fail('should not decorate')
  } catch (e) {
    t.same(e.code, 'FST_ERR_DEC_AFTER_START')
    t.same(e.message, "The decorator 'test' has been added after start!")
  }
  await fastify.close()
})

test('decorate* should emit warning if an array is passed', t => {
  t.plan(1)

  function onWarning (name) {
    t.equal(name, 'test_array')
  }

  const decorate = proxyquire('../lib/decorate', {
    './warnings': {
      FSTDEP006: onWarning
    }
  })
  const fastify = proxyquire('..', { './lib/decorate.js': decorate })()
  fastify.decorateRequest('test_array', [])
})

test('decorate* should emit warning if object type is passed', t => {
  t.plan(1)

  function onWarning (name) {
    t.equal(name, 'test_object')
  }

  const decorate = proxyquire('../lib/decorate', {
    './warnings': {
      FSTDEP006: onWarning
    }
  })
  const fastify = proxyquire('..', { './lib/decorate.js': decorate })()
  fastify.decorateRequest('test_object', { foo: 'bar' })
})

test('decorate* should not emit warning if object with getter/setter is passed', t => {
  function onWarning (warning) {
    t.fail('Should not call a warn')
  }

  const decorate = proxyquire('../lib/decorate', {
    './warnings': {
      FSTDEP006: onWarning
    }
  })
  const fastify = proxyquire('..', { './lib/decorate.js': decorate })()

  fastify.decorateRequest('test_getter_setter', {
    setter (val) {
      this._ = val
    },
    getter () {
      return 'a getter'
    }
  })
  t.end('Done')
})

test('decorate* should not emit warning if string,bool,numbers are passed', t => {
  function onWarning (warning) {
    t.fail('Should not call a warn')
  }

  const decorate = proxyquire('../lib/decorate', {
    './warnings': {
      FSTDEP006: onWarning
    }
  })
  const fastify = proxyquire('..', { './lib/decorate.js': decorate })()

  fastify.decorateRequest('test_str', 'foo')
  fastify.decorateRequest('test_bool', true)
  fastify.decorateRequest('test_number', 42)
  fastify.decorateRequest('test_null', null)
  fastify.decorateRequest('test_undefined', undefined)
  fastify.decorateReply('test_str', 'foo')
  fastify.decorateReply('test_bool', true)
  fastify.decorateReply('test_number', 42)
  fastify.decorateReply('test_null', null)
  fastify.decorateReply('test_undefined', undefined)
  t.end('Done')
})

test('Request/reply decorators should be able to access the server instance', async t => {
  t.plan(6)

  const server = require('..')({ logger: false })
  server.decorateRequest('assert', rootAssert)
  server.decorateReply('assert', rootAssert)

  server.get('/root-assert', async (req, rep) => {
    req.assert()
    rep.assert()
    return 'done'
  })

  server.register(async instance => {
    instance.decorateRequest('assert', nestedAssert)
    instance.decorateReply('assert', nestedAssert)
    instance.decorate('foo', 'bar')

    instance.get('/nested-assert', async (req, rep) => {
      req.assert()
      rep.assert()
      return 'done'
    })
  })

  await server.inject({ method: 'GET', url: '/root-assert' })
  await server.inject({ method: 'GET', url: '/nested-assert' })

  // ----
  function rootAssert () {
    t.equal(this.server, server)
  }

  function nestedAssert () {
    t.not(this.server, server)
    t.equal(this.server.foo, 'bar')
  }
})

test('plugin required decorators', async t => {
  const plugin1 = fp(
    async (instance) => {
      instance.decorateRequest('someThing', null)

      instance.addHook('onRequest', async (request, reply) => {
        request.someThing = 'hello'
      })
    },
    {
      name: 'custom-plugin-one'
    }
  )

  const plugin2 = fp(
    async () => {
      // nothing
    },
    {
      name: 'custom-plugin-two',
      dependencies: ['custom-plugin-one'],
      decorators: {
        request: ['someThing']
      }
    }
  )

  const app = Fastify()
  app.register(plugin1)
  app.register(plugin2)
  await app.ready()
})

test('decorateRequest/decorateReply empty string', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.decorateRequest('test', '')
  fastify.decorateReply('test2', '')
  fastify.get('/yes', (req, reply) => {
    t.equal(req.test, '')
    t.equal(reply.test2, '')
    reply.send({ hello: 'world' })
  })
  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/yes'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('decorateRequest/decorateReply is undefined', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.decorateRequest('test', undefined)
  fastify.decorateReply('test2', undefined)
  fastify.get('/yes', (req, reply) => {
    t.equal(req.test, undefined)
    t.equal(reply.test2, undefined)
    reply.send({ hello: 'world' })
  })
  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/yes'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('decorateRequest/decorateReply is not set to a value', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.decorateRequest('test')
  fastify.decorateReply('test2')
  fastify.get('/yes', (req, reply) => {
    t.equal(req.test, undefined)
    t.equal(reply.test2, undefined)
    reply.send({ hello: 'world' })
  })
  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/yes'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('decorateRequest with dependencies', (t) => {
  t.plan(2)
  const app = Fastify()

  const decorator1 = 'bar'
  const decorator2 = 'foo'

  app.decorate('decorator1', decorator1)
  app.decorateRequest('decorator1', decorator1)

  if (
    app.hasDecorator('decorator1') &&
    app.hasRequestDecorator('decorator1')
  ) {
    t.doesNotThrow(() => app.decorateRequest('decorator2', decorator2, ['decorator1']))
    t.ok(app.hasRequestDecorator('decorator2'))
  }
})

test('decorateRequest with dependencies (functions)', (t) => {
  t.plan(2)
  const app = Fastify()

  const decorator1 = () => 'bar'
  const decorator2 = () => 'foo'

  app.decorate('decorator1', decorator1)
  app.decorateRequest('decorator1', decorator1)

  if (
    app.hasDecorator('decorator1') &&
    app.hasRequestDecorator('decorator1')
  ) {
    t.doesNotThrow(() => app.decorateRequest('decorator2', decorator2, ['decorator1']))
    t.ok(app.hasRequestDecorator('decorator2'))
  }
})

test('chain of decorators on Request', async (t) => {
  const fastify = Fastify()
  fastify.register(fp(async function (fastify) {
    fastify.decorateRequest('foo', 'toto')
    fastify.decorateRequest('bar', () => 'tata')
  }, {
    name: 'first'
  }))

  fastify.get('/foo', async function (request, reply) {
    return request.foo
  })
  fastify.get('/bar', function (request, reply) {
    return request.bar()
  })
  fastify.register(async function second (fastify) {
    fastify.get('/foo', async function (request, reply) {
      return request.foo
    })
    fastify.get('/bar', async function (request, reply) {
      return request.bar()
    })
    fastify.register(async function fourth (fastify) {
      fastify.get('/plugin3/foo', async function (request, reply) {
        return request.foo
      })
      fastify.get('/plugin3/bar', function (request, reply) {
        return request.bar()
      })
    })
    fastify.register(fp(async function (fastify) {
      fastify.decorateRequest('fooB', 'toto')
      fastify.decorateRequest('barB', () => 'tata')
    }, {
      name: 'third'
    }))
  },
  { prefix: '/plugin2', name: 'plugin2' }
  )

  await fastify.ready()

  {
    const response = await fastify.inject('/foo')
    t.equal(response.body, 'toto')
  }

  {
    const response = await fastify.inject('/bar')
    t.equal(response.body, 'tata')
  }

  {
    const response = await fastify.inject('/plugin2/foo')
    t.equal(response.body, 'toto')
  }

  {
    const response = await fastify.inject('/plugin2/bar')
    t.equal(response.body, 'tata')
  }

  {
    const response = await fastify.inject('/plugin2/plugin3/foo')
    t.equal(response.body, 'toto')
  }

  {
    const response = await fastify.inject('/plugin2/plugin3/bar')
    t.equal(response.body, 'tata')
  }
})

test('chain of decorators on Reply', async (t) => {
  const fastify = Fastify()
  fastify.register(fp(async function (fastify) {
    fastify.decorateReply('foo', 'toto')
    fastify.decorateReply('bar', () => 'tata')
  }, {
    name: 'first'
  }))

  fastify.get('/foo', async function (request, reply) {
    return reply.foo
  })
  fastify.get('/bar', function (request, reply) {
    return reply.bar()
  })
  fastify.register(async function second (fastify) {
    fastify.get('/foo', async function (request, reply) {
      return reply.foo
    })
    fastify.get('/bar', async function (request, reply) {
      return reply.bar()
    })
    fastify.register(async function fourth (fastify) {
      fastify.get('/plugin3/foo', async function (request, reply) {
        return reply.foo
      })
      fastify.get('/plugin3/bar', function (request, reply) {
        return reply.bar()
      })
    })
    fastify.register(fp(async function (fastify) {
      fastify.decorateReply('fooB', 'toto')
      fastify.decorateReply('barB', () => 'tata')
    }, {
      name: 'third'
    }))
  },
  { prefix: '/plugin2', name: 'plugin2' }
  )

  await fastify.ready()

  {
    const response = await fastify.inject('/foo')
    t.equal(response.body, 'toto')
  }

  {
    const response = await fastify.inject('/bar')
    t.equal(response.body, 'tata')
  }

  {
    const response = await fastify.inject('/plugin2/foo')
    t.equal(response.body, 'toto')
  }

  {
    const response = await fastify.inject('/plugin2/bar')
    t.equal(response.body, 'tata')
  }

  {
    const response = await fastify.inject('/plugin2/plugin3/foo')
    t.equal(response.body, 'toto')
  }

  {
    const response = await fastify.inject('/plugin2/plugin3/bar')
    t.equal(response.body, 'tata')
  }
})
