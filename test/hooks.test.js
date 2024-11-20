'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const stream = require('node:stream')
const Fastify = require('..')
const fp = require('fastify-plugin')
const fs = require('node:fs')
const split = require('split2')
const symbols = require('../lib/symbols.js')
const payload = { hello: 'world' }
const proxyquire = require('proxyquire')
const { connect } = require('node:net')
const { sleep, getServerUrl } = require('./helper')

process.removeAllListeners('warning')

test('hooks', t => {
  t.plan(49)
  const fastify = Fastify({ exposeHeadRoutes: false })

  try {
    fastify.addHook('preHandler', function (request, reply, done) {
      t.equal(request.test, 'the request is coming')
      t.equal(reply.test, 'the reply has come')
      if (request.raw.method === 'HEAD') {
        done(new Error('some error'))
      } else {
        done()
      }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }

  try {
    fastify.addHook('preHandler', null)
  } catch (e) {
    t.equal(e.code, 'FST_ERR_HOOK_INVALID_HANDLER')
    t.equal(e.message, 'preHandler hook should be a function, instead got null')
    t.pass()
  }

  try {
    fastify.addHook('preParsing')
  } catch (e) {
    t.equal(e.code, 'FST_ERR_HOOK_INVALID_HANDLER')
    t.equal(e.message, 'preParsing hook should be a function, instead got undefined')
    t.pass()
  }

  try {
    fastify.addHook('preParsing', function (request, reply, payload, done) {
      request.preParsing = true
      t.equal(request.test, 'the request is coming')
      t.equal(reply.test, 'the reply has come')
      done()
    })
    t.pass()
  } catch (e) {
    t.fail()
  }

  try {
    fastify.addHook('preParsing', function (request, reply, payload, done) {
      request.preParsing = true
      t.equal(request.test, 'the request is coming')
      t.equal(reply.test, 'the reply has come')
      done()
    })
    t.pass()
  } catch (e) {
    t.fail()
  }

  try {
    fastify.addHook('preValidation', function (request, reply, done) {
      t.equal(request.preParsing, true)
      t.equal(request.test, 'the request is coming')
      t.equal(reply.test, 'the reply has come')
      done()
    })
    t.pass()
  } catch (e) {
    t.fail()
  }

  try {
    fastify.addHook('preSerialization', function (request, reply, payload, done) {
      t.ok('preSerialization called')
      done()
    })
    t.pass()
  } catch (e) {
    t.fail()
  }

  try {
    fastify.addHook('onRequest', function (request, reply, done) {
      request.test = 'the request is coming'
      reply.test = 'the reply has come'
      if (request.raw.method === 'DELETE') {
        done(new Error('some error'))
      } else {
        done()
      }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }

  fastify.addHook('onResponse', function (request, reply, done) {
    t.ok('onResponse called')
    done()
  })

  fastify.addHook('onSend', function (req, reply, thePayload, done) {
    t.ok('onSend called')
    done()
  })

  fastify.route({
    method: 'GET',
    url: '/',
    handler: function (req, reply) {
      t.equal(req.test, 'the request is coming')
      t.equal(reply.test, 'the reply has come')
      reply.code(200).send(payload)
    },
    onResponse: function (req, reply, done) {
      t.ok('onResponse inside hook')
    },
    response: {
      200: {
        type: 'object'
      }
    }
  })

  fastify.head('/', function (req, reply) {
    reply.code(200).send(payload)
  })

  fastify.delete('/', function (req, reply) {
    reply.code(200).send(payload)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'HEAD',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 500)
    })

    sget({
      method: 'DELETE',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 500)
    })
  })
})

test('onRequest hook should support encapsulation / 1', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.addHook('onRequest', (req, reply, done) => {
      t.equal(req.raw.url, '/plugin')
      done()
    })

    instance.get('/plugin', (request, reply) => {
      reply.send()
    })

    done()
  })

  fastify.get('/root', (request, reply) => {
    reply.send()
  })

  fastify.inject('/root', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })

  fastify.inject('/plugin', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })
})

test('onRequest hook should support encapsulation / 2', t => {
  t.plan(3)
  const fastify = Fastify()
  let pluginInstance

  fastify.addHook('onRequest', () => {})

  fastify.register((instance, opts, done) => {
    instance.addHook('onRequest', () => {})
    pluginInstance = instance
    done()
  })

  fastify.ready(err => {
    t.error(err)
    t.equal(fastify[symbols.kHooks].onRequest.length, 1)
    t.equal(pluginInstance[symbols.kHooks].onRequest.length, 2)
  })
})

test('onRequest hook should support encapsulation / 3', t => {
  t.plan(20)
  const fastify = Fastify()
  fastify.decorate('hello', 'world')

  fastify.addHook('onRequest', function (req, reply, done) {
    t.ok(this.hello)
    t.ok(this.hello2)
    req.first = true
    done()
  })

  fastify.decorate('hello2', 'world')

  fastify.get('/first', (req, reply) => {
    t.ok(req.first)
    t.notOk(req.second)
    reply.send({ hello: 'world' })
  })

  fastify.register((instance, opts, done) => {
    instance.decorate('hello3', 'world')
    instance.addHook('onRequest', function (req, reply, done) {
      t.ok(this.hello)
      t.ok(this.hello2)
      t.ok(this.hello3)
      req.second = true
      done()
    })

    instance.get('/second', (req, reply) => {
      t.ok(req.first)
      t.ok(req.second)
      reply.send({ hello: 'world' })
    })

    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('preHandler hook should support encapsulation / 5', t => {
  t.plan(17)
  const fastify = Fastify()
  fastify.decorate('hello', 'world')

  fastify.addHook('preHandler', function (req, res, done) {
    t.ok(this.hello)
    req.first = true
    done()
  })

  fastify.get('/first', (req, reply) => {
    t.ok(req.first)
    t.notOk(req.second)
    reply.send({ hello: 'world' })
  })

  fastify.register((instance, opts, done) => {
    instance.decorate('hello2', 'world')
    instance.addHook('preHandler', function (req, res, done) {
      t.ok(this.hello)
      t.ok(this.hello2)
      req.second = true
      done()
    })

    instance.get('/second', (req, reply) => {
      t.ok(req.first)
      t.ok(req.second)
      reply.send({ hello: 'world' })
    })

    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('onRoute hook should be called / 1', t => {
  t.plan(2)
  const fastify = Fastify({ exposeHeadRoutes: false })

  fastify.register((instance, opts, done) => {
    instance.addHook('onRoute', () => {
      t.pass()
    })
    instance.get('/', opts, function (req, reply) {
      reply.send()
    })
    done()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should be called / 2', t => {
  t.plan(5)
  let firstHandler = 0
  let secondHandler = 0
  const fastify = Fastify({ exposeHeadRoutes: false })
  fastify.addHook('onRoute', (route) => {
    t.pass()
    firstHandler++
  })

  fastify.register((instance, opts, done) => {
    instance.addHook('onRoute', (route) => {
      t.pass()
      secondHandler++
    })
    instance.get('/', opts, function (req, reply) {
      reply.send()
    })
    done()
  })
    .after(() => {
      t.equal(firstHandler, 1)
      t.equal(secondHandler, 1)
    })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should be called / 3', t => {
  t.plan(5)
  const fastify = Fastify({ exposeHeadRoutes: false })

  function handler (req, reply) {
    reply.send()
  }

  fastify.addHook('onRoute', (route) => {
    t.pass()
  })

  fastify.register((instance, opts, done) => {
    instance.addHook('onRoute', (route) => {
      t.pass()
    })
    instance.get('/a', handler)
    done()
  })
    .after((err, done) => {
      t.error(err)
      setTimeout(() => {
        fastify.get('/b', handler)
        done()
      }, 10)
    })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should be called (encapsulation support) / 4', t => {
  t.plan(4)
  const fastify = Fastify({ exposeHeadRoutes: false })

  fastify.addHook('onRoute', () => {
    t.pass()
  })

  fastify.register((instance, opts, done) => {
    instance.addHook('onRoute', () => {
      t.pass()
    })
    instance.get('/nested', opts, function (req, reply) {
      reply.send()
    })
    done()
  })

  fastify.get('/', function (req, reply) {
    reply.send()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should be called (encapsulation support) / 5', t => {
  t.plan(2)
  const fastify = Fastify({ exposeHeadRoutes: false })

  fastify.get('/first', function (req, reply) {
    reply.send()
  })

  fastify.register((instance, opts, done) => {
    instance.addHook('onRoute', () => {
      t.pass()
    })
    instance.get('/nested', opts, function (req, reply) {
      reply.send()
    })
    done()
  })

  fastify.get('/second', function (req, reply) {
    reply.send()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should be called (encapsulation support) / 6', t => {
  t.plan(1)
  const fastify = Fastify({ exposeHeadRoutes: false })

  fastify.get('/first', function (req, reply) {
    reply.send()
  })

  fastify.addHook('onRoute', () => {
    t.fail('This should not be called')
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute should keep the context', t => {
  t.plan(4)
  const fastify = Fastify({ exposeHeadRoutes: false })
  fastify.register((instance, opts, done) => {
    instance.decorate('test', true)
    instance.addHook('onRoute', onRoute)
    t.ok(instance.prototype === fastify.prototype)

    function onRoute (route) {
      t.ok(this.test)
      t.equal(this, instance)
    }

    instance.get('/', opts, function (req, reply) {
      reply.send()
    })

    done()
  })

  fastify.close((err) => {
    t.error(err)
  })
})

test('onRoute hook should pass correct route', t => {
  t.plan(9)
  const fastify = Fastify({ exposeHeadRoutes: false })
  fastify.addHook('onRoute', (route) => {
    t.equal(route.method, 'GET')
    t.equal(route.url, '/')
    t.equal(route.path, '/')
    t.equal(route.routePath, '/')
  })

  fastify.register((instance, opts, done) => {
    instance.addHook('onRoute', (route) => {
      t.equal(route.method, 'GET')
      t.equal(route.url, '/')
      t.equal(route.path, '/')
      t.equal(route.routePath, '/')
    })
    instance.get('/', opts, function (req, reply) {
      reply.send()
    })
    done()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should pass correct route with custom prefix', t => {
  t.plan(11)
  const fastify = Fastify({ exposeHeadRoutes: false })
  fastify.addHook('onRoute', function (route) {
    t.equal(route.method, 'GET')
    t.equal(route.url, '/v1/foo')
    t.equal(route.path, '/v1/foo')
    t.equal(route.routePath, '/foo')
    t.equal(route.prefix, '/v1')
  })

  fastify.register((instance, opts, done) => {
    instance.addHook('onRoute', function (route) {
      t.equal(route.method, 'GET')
      t.equal(route.url, '/v1/foo')
      t.equal(route.path, '/v1/foo')
      t.equal(route.routePath, '/foo')
      t.equal(route.prefix, '/v1')
    })
    instance.get('/foo', opts, function (req, reply) {
      reply.send()
    })
    done()
  }, { prefix: '/v1' })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should pass correct route with custom options', t => {
  t.plan(6)
  const fastify = Fastify({ exposeHeadRoutes: false })
  fastify.register((instance, opts, done) => {
    instance.addHook('onRoute', function (route) {
      t.equal(route.method, 'GET')
      t.equal(route.url, '/foo')
      t.equal(route.logLevel, 'info')
      t.equal(route.bodyLimit, 100)
      t.type(route.logSerializers.test, 'function')
    })
    instance.get('/foo', {
      logLevel: 'info',
      bodyLimit: 100,
      logSerializers: {
        test: value => value
      }
    }, function (req, reply) {
      reply.send()
    })
    done()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should receive any route option', t => {
  t.plan(5)
  const fastify = Fastify({ exposeHeadRoutes: false })
  fastify.register((instance, opts, done) => {
    instance.addHook('onRoute', function (route) {
      t.equal(route.method, 'GET')
      t.equal(route.url, '/foo')
      t.equal(route.routePath, '/foo')
      t.equal(route.auth, 'basic')
    })
    instance.get('/foo', { auth: 'basic' }, function (req, reply) {
      reply.send()
    })
    done()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should preserve system route configuration', t => {
  t.plan(5)
  const fastify = Fastify({ exposeHeadRoutes: false })
  fastify.register((instance, opts, done) => {
    instance.addHook('onRoute', function (route) {
      t.equal(route.method, 'GET')
      t.equal(route.url, '/foo')
      t.equal(route.routePath, '/foo')
      t.equal(route.handler.length, 2)
    })
    instance.get('/foo', { url: '/bar', method: 'POST' }, function (req, reply) {
      reply.send()
    })
    done()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should preserve handler function in options of shorthand route system configuration', t => {
  t.plan(2)

  const handler = (req, reply) => {}

  const fastify = Fastify({ exposeHeadRoutes: false })
  fastify.register((instance, opts, done) => {
    instance.addHook('onRoute', function (route) {
      t.equal(route.handler, handler)
    })
    instance.get('/foo', { handler })
    done()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

// issue ref https://github.com/fastify/fastify-compress/issues/140
test('onRoute hook should be called once when prefixTrailingSlash', t => {
  t.plan(3)

  let onRouteCalled = 0
  let routePatched = 0

  const fastify = Fastify({ ignoreTrailingSlash: false, exposeHeadRoutes: false })

  // a plugin that patches route options, similar to fastify-compress
  fastify.register(fp(function myPlugin (instance, opts, next) {
    function patchTheRoute () {
      routePatched++
    }

    instance.addHook('onRoute', function (routeOptions) {
      onRouteCalled++
      patchTheRoute(routeOptions)
    })

    next()
  }))

  fastify.register(function routes (instance, opts, next) {
    instance.route({
      method: 'GET',
      url: '/',
      prefixTrailingSlash: 'both',
      handler: (req, reply) => {
        reply.send({ hello: 'world' })
      }
    })

    next()
  }, { prefix: '/prefix' })

  fastify.ready(err => {
    t.error(err)
    t.equal(onRouteCalled, 1) // onRoute hook was called once
    t.equal(routePatched, 1) // and plugin acted once and avoided redundant route patching
  })
})

test('onRoute hook should able to change the route url', t => {
  t.plan(5)

  const fastify = Fastify({ exposeHeadRoutes: false })

  fastify.register((instance, opts, done) => {
    instance.addHook('onRoute', (route) => {
      t.equal(route.url, '/foo')
      route.url = encodeURI(route.url)
    })

    instance.get('/foo', (request, reply) => {
      reply.send('here /foo')
    })

    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: getServerUrl(fastify) + encodeURI('/foo')
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), 'here /foo')
    })
  })
})

test('onRoute hook that throws should be caught', t => {
  t.plan(1)
  const fastify = Fastify({ exposeHeadRoutes: false })

  fastify.register((instance, opts, done) => {
    instance.addHook('onRoute', () => {
      throw new Error('snap')
    })

    try {
      instance.get('/', opts, function (req, reply) {
        reply.send()
      })

      t.fail('onRoute should throw sync if error')
    } catch (error) {
      t.ok(error)
    }

    done()
  })

  fastify.ready()
})

test('onRoute hook with many prefix', t => {
  t.plan(3)
  const fastify = Fastify({ exposeHeadRoutes: false })
  const handler = (req, reply) => { reply.send({}) }

  const onRouteChecks = [
    { routePath: '/anotherPath', prefix: '/two', url: '/one/two/anotherPath' },
    { routePath: '/aPath', prefix: '/one', url: '/one/aPath' }
  ]

  fastify.register((instance, opts, done) => {
    instance.addHook('onRoute', (route) => {
      t.match(route, onRouteChecks.pop())
    })
    instance.route({ method: 'GET', url: '/aPath', handler })

    instance.register((instance, opts, done) => {
      instance.route({ method: 'GET', path: '/anotherPath', handler })
      done()
    }, { prefix: '/two' })
    done()
  }, { prefix: '/one' })

  fastify.ready(err => { t.error(err) })
})

test('onRoute hook should not be called when it registered after route', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('onRoute', () => {
    t.pass()
  })

  fastify.get('/', function (req, reply) {
    reply.send()
  })

  fastify.addHook('onRoute', () => {
    t.fail('should not be called')
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onResponse hook should log request error', t => {
  t.plan(4)

  let fastify = null
  const logStream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream: logStream,
        level: 'error'
      }
    })
  } catch (e) {
    t.fail()
  }

  logStream.once('data', line => {
    t.equal(line.msg, 'request errored')
    t.equal(line.level, 50)
  })

  fastify.addHook('onResponse', (request, reply, done) => {
    done(new Error('kaboom'))
  })

  fastify.get('/root', (request, reply) => {
    reply.send()
  })

  fastify.inject('/root', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })
})

test('onResponse hook should support encapsulation / 1', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.addHook('onResponse', (request, reply, done) => {
      t.equal(reply.plugin, true)
      done()
    })

    instance.get('/plugin', (request, reply) => {
      reply.plugin = true
      reply.send()
    })

    done()
  })

  fastify.get('/root', (request, reply) => {
    reply.send()
  })

  fastify.inject('/root', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })

  fastify.inject('/plugin', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })
})

test('onResponse hook should support encapsulation / 2', t => {
  t.plan(3)
  const fastify = Fastify()
  let pluginInstance

  fastify.addHook('onResponse', () => {})

  fastify.register((instance, opts, done) => {
    instance.addHook('onResponse', () => {})
    pluginInstance = instance
    done()
  })

  fastify.ready(err => {
    t.error(err)
    t.equal(fastify[symbols.kHooks].onResponse.length, 1)
    t.equal(pluginInstance[symbols.kHooks].onResponse.length, 2)
  })
})

test('onResponse hook should support encapsulation / 3', t => {
  t.plan(16)
  const fastify = Fastify()
  fastify.decorate('hello', 'world')

  fastify.addHook('onResponse', function (request, reply, done) {
    t.ok(this.hello)
    t.ok('onResponse called')
    done()
  })

  fastify.get('/first', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.register((instance, opts, done) => {
    instance.decorate('hello2', 'world')
    instance.addHook('onResponse', function (request, reply, done) {
      t.ok(this.hello)
      t.ok(this.hello2)
      t.ok('onResponse called')
      done()
    })

    instance.get('/second', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('onSend hook should support encapsulation / 1', t => {
  t.plan(3)
  const fastify = Fastify()
  let pluginInstance

  fastify.addHook('onSend', () => {})

  fastify.register((instance, opts, done) => {
    instance.addHook('onSend', () => {})
    pluginInstance = instance
    done()
  })

  fastify.ready(err => {
    t.error(err)
    t.equal(fastify[symbols.kHooks].onSend.length, 1)
    t.equal(pluginInstance[symbols.kHooks].onSend.length, 2)
  })
})

test('onSend hook should support encapsulation / 2', t => {
  t.plan(16)
  const fastify = Fastify()
  fastify.decorate('hello', 'world')

  fastify.addHook('onSend', function (request, reply, thePayload, done) {
    t.ok(this.hello)
    t.ok('onSend called')
    done()
  })

  fastify.get('/first', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.register((instance, opts, done) => {
    instance.decorate('hello2', 'world')
    instance.addHook('onSend', function (request, reply, thePayload, done) {
      t.ok(this.hello)
      t.ok(this.hello2)
      t.ok('onSend called')
      done()
    })

    instance.get('/second', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('onSend hook is called after payload is serialized and headers are set', t => {
  t.plan(30)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    const thePayload = { hello: 'world' }

    instance.addHook('onSend', function (request, reply, payload, done) {
      t.same(JSON.parse(payload), thePayload)
      t.equal(reply[symbols.kReplyHeaders]['content-type'], 'application/json; charset=utf-8')
      done()
    })

    instance.get('/json', (request, reply) => {
      reply.send(thePayload)
    })

    done()
  })

  fastify.register((instance, opts, done) => {
    instance.addHook('onSend', function (request, reply, payload, done) {
      t.equal(payload, 'some text')
      t.equal(reply[symbols.kReplyHeaders]['content-type'], 'text/plain; charset=utf-8')
      done()
    })

    instance.get('/text', (request, reply) => {
      reply.send('some text')
    })

    done()
  })

  fastify.register((instance, opts, done) => {
    const thePayload = Buffer.from('buffer payload')

    instance.addHook('onSend', function (request, reply, payload, done) {
      t.equal(payload, thePayload)
      t.equal(reply[symbols.kReplyHeaders]['content-type'], 'application/octet-stream')
      done()
    })

    instance.get('/buffer', (request, reply) => {
      reply.send(thePayload)
    })

    done()
  })

  fastify.register((instance, opts, done) => {
    let chunk = 'stream payload'
    const thePayload = new stream.Readable({
      read () {
        this.push(chunk)
        chunk = null
      }
    })

    instance.addHook('onSend', function (request, reply, payload, done) {
      t.equal(payload, thePayload)
      t.equal(reply[symbols.kReplyHeaders]['content-type'], 'application/octet-stream')
      done()
    })

    instance.get('/stream', (request, reply) => {
      reply.header('content-type', 'application/octet-stream')
      reply.send(thePayload)
    })

    done()
  })

  fastify.register((instance, opts, done) => {
    const serializedPayload = 'serialized'

    instance.addHook('onSend', function (request, reply, payload, done) {
      t.equal(payload, serializedPayload)
      t.equal(reply[symbols.kReplyHeaders]['content-type'], 'text/custom')
      done()
    })

    instance.get('/custom-serializer', (request, reply) => {
      reply
        .serializer(() => serializedPayload)
        .type('text/custom')
        .send('needs to be serialized')
    })

    done()
  })

  fastify.inject({
    method: 'GET',
    url: '/json'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(JSON.parse(res.payload), { hello: 'world' })
    t.equal(res.headers['content-length'], '17')
  })

  fastify.inject({
    method: 'GET',
    url: '/text'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(res.payload, 'some text')
    t.equal(res.headers['content-length'], '9')
  })

  fastify.inject({
    method: 'GET',
    url: '/buffer'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(res.payload, 'buffer payload')
    t.equal(res.headers['content-length'], '14')
  })

  fastify.inject({
    method: 'GET',
    url: '/stream'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(res.payload, 'stream payload')
    t.equal(res.headers['transfer-encoding'], 'chunked')
  })

  fastify.inject({
    method: 'GET',
    url: '/custom-serializer'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(res.payload, 'serialized')
    t.equal(res.headers['content-type'], 'text/custom')
  })
})

test('modify payload', t => {
  t.plan(10)
  const fastify = Fastify()
  const payload = { hello: 'world' }
  const modifiedPayload = { hello: 'modified' }
  const anotherPayload = '"winter is coming"'

  fastify.addHook('onSend', function (request, reply, thePayload, done) {
    t.ok('onSend called')
    t.same(JSON.parse(thePayload), payload)
    thePayload = thePayload.replace('world', 'modified')
    done(null, thePayload)
  })

  fastify.addHook('onSend', function (request, reply, thePayload, done) {
    t.ok('onSend called')
    t.same(JSON.parse(thePayload), modifiedPayload)
    done(null, anotherPayload)
  })

  fastify.addHook('onSend', function (request, reply, thePayload, done) {
    t.ok('onSend called')
    t.equal(thePayload, anotherPayload)
    done()
  })

  fastify.get('/', (req, reply) => {
    reply.send(payload)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, anotherPayload)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-length'], '18')
  })
})

test('clear payload', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.addHook('onSend', function (request, reply, payload, done) {
    t.ok('onSend called')
    reply.code(304)
    done(null, null)
  })

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 304)
    t.equal(res.payload, '')
    t.equal(res.headers['content-length'], undefined)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
  })
})

test('onSend hook throws', t => {
  t.plan(11)
  const Fastify = proxyquire('..', {
    './lib/schemas.js': {
      getSchemaSerializer: (param1, param2, param3) => {
        t.equal(param3, 'application/json; charset=utf-8', 'param3 should be "application/json; charset=utf-8"')
      }
    }
  })
  const fastify = Fastify()
  fastify.addHook('onSend', function (request, reply, payload, done) {
    if (request.raw.method === 'DELETE') {
      done(new Error('some error'))
      return
    }

    if (request.raw.method === 'PUT') {
      throw new Error('some error')
    }

    if (request.raw.method === 'POST') {
      throw new Error('some error')
    }

    done()
  })

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.post('/', {
    schema: {
      response: {
        200: {
          content: {
            'application/json': {
              schema: {
                name: { type: 'string' },
                image: { type: 'string' },
                address: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.delete('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.put('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
    sget({
      method: 'POST',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 500)
    })
    sget({
      method: 'DELETE',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 500)
    })
    sget({
      method: 'PUT',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 500)
    })
  })
})

test('onSend hook should receive valid request and reply objects if onRequest hook fails', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.decorateRequest('testDecorator', 'testDecoratorVal')
  fastify.decorateReply('testDecorator', 'testDecoratorVal')

  fastify.addHook('onRequest', function (req, reply, done) {
    done(new Error('onRequest hook failed'))
  })

  fastify.addHook('onSend', function (request, reply, payload, done) {
    t.equal(request.testDecorator, 'testDecoratorVal')
    t.equal(reply.testDecorator, 'testDecoratorVal')
    done()
  })

  fastify.get('/', (req, reply) => {
    reply.send('hello')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
  })
})

test('onSend hook should receive valid request and reply objects if a custom content type parser fails', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.decorateRequest('testDecorator', 'testDecoratorVal')
  fastify.decorateReply('testDecorator', 'testDecoratorVal')

  fastify.addContentTypeParser('*', function (req, payload, done) {
    done(new Error('content type parser failed'))
  })

  fastify.addHook('onSend', function (request, reply, payload, done) {
    t.equal(request.testDecorator, 'testDecoratorVal')
    t.equal(reply.testDecorator, 'testDecoratorVal')
    done()
  })

  fastify.get('/', (req, reply) => {
    reply.send('hello')
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: 'body'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
  })
})

test('Content-Length header should be updated if onSend hook modifies the payload', t => {
  t.plan(2)

  const instance = Fastify()

  instance.get('/', async (_, rep) => {
    rep.header('content-length', 3)
    return 'foo'
  })

  instance.addHook('onSend', async () => 'bar12233000')

  instance.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payloadLength = Buffer.byteLength(res.body)
    const contentLength = Number(res.headers['content-length'])

    t.equal(payloadLength, contentLength)
  })
})

test('cannot add hook after binding', t => {
  t.plan(2)
  const instance = Fastify()

  instance.get('/', function (request, reply) {
    reply.send({ hello: 'world' })
  })

  instance.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(instance.server.close.bind(instance.server))

    try {
      instance.addHook('onRequest', () => {})
      t.fail()
    } catch (e) {
      t.pass()
    }
  })
})

test('onRequest hooks should be able to block a request', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('onRequest', (req, reply, done) => {
    reply.send('hello')
    done()
  })

  fastify.addHook('onRequest', (req, reply, done) => {
    t.fail('this should not be called')
  })

  fastify.addHook('preHandler', (req, reply, done) => {
    t.fail('this should not be called')
  })

  fastify.addHook('onSend', (req, reply, payload, done) => {
    t.ok('called')
    done()
  })

  fastify.addHook('onResponse', (request, reply, done) => {
    t.ok('called')
    done()
  })

  fastify.get('/', function (request, reply) {
    t.fail('we should not be here')
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'hello')
  })
})

test('preValidation hooks should be able to block a request', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('preValidation', (req, reply, done) => {
    reply.send('hello')
    done()
  })

  fastify.addHook('preValidation', (req, reply, done) => {
    t.fail('this should not be called')
  })

  fastify.addHook('preHandler', (req, reply, done) => {
    t.fail('this should not be called')
  })

  fastify.addHook('onSend', (req, reply, payload, done) => {
    t.ok('called')
    done()
  })

  fastify.addHook('onResponse', (request, reply, done) => {
    t.ok('called')
    done()
  })

  fastify.get('/', function (request, reply) {
    t.fail('we should not be here')
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'hello')
  })
})

test('preValidation hooks should be able to change request body before validation', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('preValidation', (req, _reply, done) => {
    const buff = Buffer.from(req.body.message, 'base64')
    req.body = JSON.parse(buff.toString('utf-8'))
    done()
  })

  fastify.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            foo: {
              type: 'string'
            },
            bar: {
              type: 'number'
            }
          },
          required: ['foo', 'bar']
        }
      }
    },
    (req, reply) => {
      t.pass()
      reply.status(200).send('hello')
    }
  )

  fastify.inject({
    url: '/',
    method: 'POST',
    payload: {
      message: Buffer.from(JSON.stringify({ foo: 'example', bar: 1 })).toString('base64')
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'hello')
  })
})

test('preParsing hooks should be able to block a request', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('preParsing', (req, reply, payload, done) => {
    reply.send('hello')
    done()
  })

  fastify.addHook('preParsing', (req, reply, payload, done) => {
    t.fail('this should not be called')
  })

  fastify.addHook('preHandler', (req, reply, done) => {
    t.fail('this should not be called')
  })

  fastify.addHook('onSend', (req, reply, payload, done) => {
    t.ok('called')
    done()
  })

  fastify.addHook('onResponse', (request, reply, done) => {
    t.ok('called')
    done()
  })

  fastify.get('/', function (request, reply) {
    t.fail('we should not be here')
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'hello')
  })
})

test('preHandler hooks should be able to block a request', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('preHandler', (req, reply, done) => {
    reply.send('hello')
    done()
  })

  fastify.addHook('preHandler', (req, reply, done) => {
    t.fail('this should not be called')
  })

  fastify.addHook('onSend', (req, reply, payload, done) => {
    t.equal(payload, 'hello')
    done()
  })

  fastify.addHook('onResponse', (request, reply, done) => {
    t.ok('called')
    done()
  })

  fastify.get('/', function (request, reply) {
    t.fail('we should not be here')
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'hello')
  })
})

test('onRequest hooks should be able to block a request (last hook)', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('onRequest', (req, reply, done) => {
    reply.send('hello')
    done()
  })

  fastify.addHook('preHandler', (req, reply, done) => {
    t.fail('this should not be called')
  })

  fastify.addHook('onSend', (req, reply, payload, done) => {
    t.ok('called')
    done()
  })

  fastify.addHook('onResponse', (request, reply, done) => {
    t.ok('called')
    done()
  })

  fastify.get('/', function (request, reply) {
    t.fail('we should not be here')
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'hello')
  })
})

test('preHandler hooks should be able to block a request (last hook)', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('preHandler', (req, reply, done) => {
    reply.send('hello')
    done()
  })

  fastify.addHook('onSend', (req, reply, payload, done) => {
    t.equal(payload, 'hello')
    done()
  })

  fastify.addHook('onResponse', (request, reply, done) => {
    t.ok('called')
    done()
  })

  fastify.get('/', function (request, reply) {
    t.fail('we should not be here')
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'hello')
  })
})

test('preParsing hooks should handle errors', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('preParsing', (req, reply, payload, done) => {
    const e = new Error('kaboom')
    e.statusCode = 501
    throw e
  })

  fastify.post('/', function (request, reply) {
    reply.send(request.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 501)
    t.same(JSON.parse(res.payload), { error: 'Not Implemented', message: 'kaboom', statusCode: 501 })
  })
})

test('onRequest respond with a stream', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('onRequest', (req, reply, done) => {
    const stream = fs.createReadStream(__filename, 'utf8')
    // stream.pipe(res)
    // res.once('finish', done)
    reply.send(stream)
  })

  fastify.addHook('onRequest', (req, res, done) => {
    t.fail('this should not be called')
  })

  fastify.addHook('preHandler', (req, reply, done) => {
    t.fail('this should not be called')
  })

  fastify.addHook('onSend', (req, reply, payload, done) => {
    t.ok('called')
    done()
  })

  fastify.addHook('onResponse', (request, reply, done) => {
    t.ok('called')
    done()
  })

  fastify.get('/', function (request, reply) {
    t.fail('we should not be here')
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })
})

test('preHandler respond with a stream', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.addHook('onRequest', (req, reply, done) => {
    t.ok('called')
    done()
  })

  // we are calling `reply.send` inside the `preHandler` hook with a stream,
  // this triggers the `onSend` hook event if `preHandler` has not yet finished
  const order = [1, 2]

  fastify.addHook('preHandler', (req, reply, done) => {
    const stream = fs.createReadStream(__filename, 'utf8')
    reply.send(stream)
    reply.raw.once('finish', () => {
      t.equal(order.shift(), 2)
      done()
    })
  })

  fastify.addHook('preHandler', (req, reply, done) => {
    t.fail('this should not be called')
  })

  fastify.addHook('onSend', (req, reply, payload, done) => {
    t.equal(order.shift(), 1)
    t.equal(typeof payload.pipe, 'function')
    done()
  })

  fastify.addHook('onResponse', (request, reply, done) => {
    t.ok('called')
    done()
  })

  fastify.get('/', function (request, reply) {
    t.fail('we should not be here')
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })
})

test('Register an hook after a plugin inside a plugin', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('preHandler', function (req, reply, done) {
      t.ok('called')
      done()
    })

    instance.get('/', function (request, reply) {
      reply.send({ hello: 'world' })
    })

    done()
  }))

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('preHandler', function (req, reply, done) {
      t.ok('called')
      done()
    })

    instance.addHook('preHandler', function (req, reply, done) {
      t.ok('called')
      done()
    })

    done()
  }))

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('Register an hook after a plugin inside a plugin (with preHandler option)', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('preHandler', function (req, reply, done) {
      t.ok('called')
      done()
    })

    instance.get('/', {
      preHandler: (req, reply, done) => {
        t.ok('called')
        done()
      }
    }, function (request, reply) {
      reply.send({ hello: 'world' })
    })

    done()
  }))

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('preHandler', function (req, reply, done) {
      t.ok('called')
      done()
    })

    instance.addHook('preHandler', function (req, reply, done) {
      t.ok('called')
      done()
    })

    done()
  }))

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('Register hooks inside a plugin after an encapsulated plugin', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.register(function (instance, opts, done) {
    instance.get('/', function (request, reply) {
      reply.send({ hello: 'world' })
    })

    done()
  })

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onRequest', function (req, reply, done) {
      t.ok('called')
      done()
    })

    instance.addHook('preHandler', function (request, reply, done) {
      t.ok('called')
      done()
    })

    instance.addHook('onSend', function (request, reply, payload, done) {
      t.ok('called')
      done()
    })

    instance.addHook('onResponse', function (request, reply, done) {
      t.ok('called')
      done()
    })

    done()
  }))

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('onRequest hooks should run in the order in which they are defined', t => {
  t.plan(9)
  const fastify = Fastify()

  fastify.register(function (instance, opts, done) {
    instance.addHook('onRequest', function (req, reply, done) {
      t.equal(req.previous, undefined)
      req.previous = 1
      done()
    })

    instance.get('/', function (request, reply) {
      t.equal(request.previous, 5)
      reply.send({ hello: 'world' })
    })

    instance.register(fp(function (i, opts, done) {
      i.addHook('onRequest', function (req, reply, done) {
        t.equal(req.previous, 1)
        req.previous = 2
        done()
      })
      done()
    }))

    done()
  })

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onRequest', function (req, reply, done) {
      t.equal(req.previous, 2)
      req.previous = 3
      done()
    })

    instance.register(fp(function (i, opts, done) {
      i.addHook('onRequest', function (req, reply, done) {
        t.equal(req.previous, 3)
        req.previous = 4
        done()
      })
      done()
    }))

    instance.addHook('onRequest', function (req, reply, done) {
      t.equal(req.previous, 4)
      req.previous = 5
      done()
    })

    done()
  }))

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('preHandler hooks should run in the order in which they are defined', t => {
  t.plan(9)
  const fastify = Fastify()

  fastify.register(function (instance, opts, done) {
    instance.addHook('preHandler', function (request, reply, done) {
      t.equal(request.previous, undefined)
      request.previous = 1
      done()
    })

    instance.get('/', function (request, reply) {
      t.equal(request.previous, 5)
      reply.send({ hello: 'world' })
    })

    instance.register(fp(function (i, opts, done) {
      i.addHook('preHandler', function (request, reply, done) {
        t.equal(request.previous, 1)
        request.previous = 2
        done()
      })
      done()
    }))

    done()
  })

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('preHandler', function (request, reply, done) {
      t.equal(request.previous, 2)
      request.previous = 3
      done()
    })

    instance.register(fp(function (i, opts, done) {
      i.addHook('preHandler', function (request, reply, done) {
        t.equal(request.previous, 3)
        request.previous = 4
        done()
      })
      done()
    }))

    instance.addHook('preHandler', function (request, reply, done) {
      t.equal(request.previous, 4)
      request.previous = 5
      done()
    })

    done()
  }))

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('onSend hooks should run in the order in which they are defined', t => {
  t.plan(8)
  const fastify = Fastify()

  fastify.register(function (instance, opts, done) {
    instance.addHook('onSend', function (request, reply, payload, done) {
      t.equal(request.previous, undefined)
      request.previous = 1
      done()
    })

    instance.get('/', function (request, reply) {
      reply.send({})
    })

    instance.register(fp(function (i, opts, done) {
      i.addHook('onSend', function (request, reply, payload, done) {
        t.equal(request.previous, 1)
        request.previous = 2
        done()
      })
      done()
    }))

    done()
  })

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onSend', function (request, reply, payload, done) {
      t.equal(request.previous, 2)
      request.previous = 3
      done()
    })

    instance.register(fp(function (i, opts, done) {
      i.addHook('onSend', function (request, reply, payload, done) {
        t.equal(request.previous, 3)
        request.previous = 4
        done()
      })
      done()
    }))

    instance.addHook('onSend', function (request, reply, payload, done) {
      t.equal(request.previous, 4)
      done(null, '5')
    })

    done()
  }))

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(JSON.parse(res.payload), 5)
  })
})

test('onResponse hooks should run in the order in which they are defined', t => {
  t.plan(8)
  const fastify = Fastify()

  fastify.register(function (instance, opts, done) {
    instance.addHook('onResponse', function (request, reply, done) {
      t.equal(reply.previous, undefined)
      reply.previous = 1
      done()
    })

    instance.get('/', function (request, reply) {
      reply.send({ hello: 'world' })
    })

    instance.register(fp(function (i, opts, done) {
      i.addHook('onResponse', function (request, reply, done) {
        t.equal(reply.previous, 1)
        reply.previous = 2
        done()
      })
      done()
    }))

    done()
  })

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onResponse', function (request, reply, done) {
      t.equal(reply.previous, 2)
      reply.previous = 3
      done()
    })

    instance.register(fp(function (i, opts, done) {
      i.addHook('onResponse', function (request, reply, done) {
        t.equal(reply.previous, 3)
        reply.previous = 4
        done()
      })
      done()
    }))

    instance.addHook('onResponse', function (request, reply, done) {
      t.equal(reply.previous, 4)
      done()
    })

    done()
  }))

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('onRequest, preHandler, and onResponse hooks that resolve to a value do not cause an error', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify
    .addHook('onRequest', () => Promise.resolve(1))
    .addHook('onRequest', () => Promise.resolve(true))
    .addHook('preValidation', () => Promise.resolve(null))
    .addHook('preValidation', () => Promise.resolve('a'))
    .addHook('preHandler', () => Promise.resolve(null))
    .addHook('preHandler', () => Promise.resolve('a'))
    .addHook('onResponse', () => Promise.resolve({}))
    .addHook('onResponse', () => Promise.resolve([]))

  fastify.get('/', (request, reply) => {
    reply.send('hello')
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'hello')
  })
})

test('If a response header has been set inside an hook it should not be overwritten by the final response handler', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('onRequest', (req, reply, done) => {
    reply.header('X-Custom-Header', 'hello')
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.send('hello')
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equal(res.headers['x-custom-header'], 'hello')
    t.equal(res.headers['content-type'], 'text/plain; charset=utf-8')
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'hello')
  })
})

test('If the content type has been set inside an hook it should not be changed', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('onRequest', (req, reply, done) => {
    reply.header('content-type', 'text/html')
    done()
  })

  fastify.get('/', (request, reply) => {
    t.ok(reply[symbols.kReplyHeaders]['content-type'])
    reply.send('hello')
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equal(res.headers['content-type'], 'text/html')
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'hello')
  })
})

test('request in onRequest, preParsing, preValidation and onResponse', t => {
  t.plan(18)
  const fastify = Fastify()

  fastify.addHook('onRequest', function (request, reply, done) {
    t.same(request.body, undefined)
    t.same(request.query, { key: 'value' })
    t.same(request.params, { greeting: 'hello' })
    t.same(request.headers, {
      'content-length': '17',
      'content-type': 'application/json',
      host: 'localhost:80',
      'user-agent': 'lightMyRequest',
      'x-custom': 'hello'
    })
    done()
  })

  fastify.addHook('preParsing', function (request, reply, payload, done) {
    t.same(request.body, undefined)
    t.same(request.query, { key: 'value' })
    t.same(request.params, { greeting: 'hello' })
    t.same(request.headers, {
      'content-length': '17',
      'content-type': 'application/json',
      host: 'localhost:80',
      'user-agent': 'lightMyRequest',
      'x-custom': 'hello'
    })
    done()
  })

  fastify.addHook('preValidation', function (request, reply, done) {
    t.same(request.body, { hello: 'world' })
    t.same(request.query, { key: 'value' })
    t.same(request.params, { greeting: 'hello' })
    t.same(request.headers, {
      'content-length': '17',
      'content-type': 'application/json',
      host: 'localhost:80',
      'user-agent': 'lightMyRequest',
      'x-custom': 'hello'
    })
    done()
  })

  fastify.addHook('onResponse', function (request, reply, done) {
    t.same(request.body, { hello: 'world' })
    t.same(request.query, { key: 'value' })
    t.same(request.params, { greeting: 'hello' })
    t.same(request.headers, {
      'content-length': '17',
      'content-type': 'application/json',
      host: 'localhost:80',
      'user-agent': 'lightMyRequest',
      'x-custom': 'hello'
    })
    done()
  })

  fastify.post('/:greeting', function (req, reply) {
    reply.send('ok')
  })

  fastify.inject({
    method: 'POST',
    url: '/hello?key=value',
    headers: { 'x-custom': 'hello' },
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })
})

test('preValidation hook should support encapsulation / 1', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.addHook('preValidation', (req, reply, done) => {
      t.equal(req.raw.url, '/plugin')
      done()
    })

    instance.get('/plugin', (request, reply) => {
      reply.send()
    })

    done()
  })

  fastify.get('/root', (request, reply) => {
    reply.send()
  })

  fastify.inject('/root', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })

  fastify.inject('/plugin', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })
})

test('preValidation hook should support encapsulation / 2', t => {
  t.plan(3)
  const fastify = Fastify()
  let pluginInstance

  fastify.addHook('preValidation', () => {})

  fastify.register((instance, opts, done) => {
    instance.addHook('preValidation', () => {})
    pluginInstance = instance
    done()
  })

  fastify.ready(err => {
    t.error(err)
    t.equal(fastify[symbols.kHooks].preValidation.length, 1)
    t.equal(pluginInstance[symbols.kHooks].preValidation.length, 2)
  })
})

test('preValidation hook should support encapsulation / 3', t => {
  t.plan(20)
  const fastify = Fastify()
  fastify.decorate('hello', 'world')

  fastify.addHook('preValidation', function (req, reply, done) {
    t.ok(this.hello)
    t.ok(this.hello2)
    req.first = true
    done()
  })

  fastify.decorate('hello2', 'world')

  fastify.get('/first', (req, reply) => {
    t.ok(req.first)
    t.notOk(req.second)
    reply.send({ hello: 'world' })
  })

  fastify.register((instance, opts, done) => {
    instance.decorate('hello3', 'world')
    instance.addHook('preValidation', function (req, reply, done) {
      t.ok(this.hello)
      t.ok(this.hello2)
      t.ok(this.hello3)
      req.second = true
      done()
    })

    instance.get('/second', (req, reply) => {
      t.ok(req.first)
      t.ok(req.second)
      reply.send({ hello: 'world' })
    })

    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('onError hook', t => {
  t.plan(3)

  const fastify = Fastify()

  const err = new Error('kaboom')

  fastify.addHook('onError', (request, reply, error, done) => {
    t.match(error, err)
    done()
  })

  fastify.get('/', (req, reply) => {
    reply.send(err)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), {
      error: 'Internal Server Error',
      message: 'kaboom',
      statusCode: 500
    })
  })
})

test('reply.send should throw if called inside the onError hook', t => {
  t.plan(3)

  const fastify = Fastify()

  const err = new Error('kaboom')

  fastify.addHook('onError', (request, reply, error, done) => {
    try {
      reply.send()
      t.fail('Should throw')
    } catch (err) {
      t.equal(err.code, 'FST_ERR_SEND_INSIDE_ONERR')
    }
    done()
  })

  fastify.get('/', (req, reply) => {
    reply.send(err)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), {
      error: 'Internal Server Error',
      message: 'kaboom',
      statusCode: 500
    })
  })
})

test('onError hook with setErrorHandler', t => {
  t.test('Send error', t => {
    t.plan(3)

    const fastify = Fastify()

    const external = new Error('ouch')
    const internal = new Error('kaboom')

    fastify.setErrorHandler((_, req, reply) => {
      reply.send(external)
    })

    fastify.addHook('onError', (request, reply, error, done) => {
      t.match(error, internal)
      done()
    })

    fastify.get('/', (req, reply) => {
      reply.send(internal)
    })

    fastify.inject({
      method: 'GET',
      url: '/'
    }, (err, res) => {
      t.error(err)
      t.same(JSON.parse(res.payload), {
        error: 'Internal Server Error',
        message: 'ouch',
        statusCode: 500
      })
    })
  })

  t.end()
})

test('preParsing hook should run before parsing and be able to modify the payload', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('preParsing', function (req, reply, payload, done) {
    const modified = new stream.Readable()
    modified.receivedEncodedLength = parseInt(req.headers['content-length'], 10)
    modified.push(JSON.stringify({ hello: 'another world' }))
    modified.push(null)
    done(null, modified)
  })

  fastify.route({
    method: 'POST',
    url: '/first',
    handler: function (req, reply) {
      reply.send(req.body)
    }
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'POST',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/first',
      body: { hello: 'world' },
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + JSON.stringify(body).length)
      t.same(body, { hello: 'another world' })
    })
  })
})

test('preParsing hooks should run in the order in which they are defined', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('preParsing', function (req, reply, payload, done) {
    const modified = new stream.Readable()
    modified.receivedEncodedLength = parseInt(req.headers['content-length'], 10)
    modified.push('{"hello":')
    done(null, modified)
  })

  fastify.addHook('preParsing', function (req, reply, payload, done) {
    payload.push('"another world"}')
    payload.push(null)
    done(null, payload)
  })

  fastify.route({
    method: 'POST',
    url: '/first',
    handler: function (req, reply) {
      reply.send(req.body)
    }
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'POST',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/first',
      body: { hello: 'world' },
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + JSON.stringify(body).length)
      t.same(body, { hello: 'another world' })
    })
  })
})

test('preParsing hooks should support encapsulation', t => {
  t.plan(9)
  const fastify = Fastify()

  fastify.addHook('preParsing', function (req, reply, payload, done) {
    const modified = new stream.Readable()
    modified.receivedEncodedLength = parseInt(req.headers['content-length'], 10)
    modified.push('{"hello":"another world"}')
    modified.push(null)
    done(null, modified)
  })

  fastify.post('/first', (req, reply) => {
    reply.send(req.body)
  })

  fastify.register((instance, opts, done) => {
    instance.addHook('preParsing', function (req, reply, payload, done) {
      const modified = new stream.Readable()
      modified.receivedEncodedLength = payload.receivedEncodedLength || parseInt(req.headers['content-length'], 10)
      modified.push('{"hello":"encapsulated world"}')
      modified.push(null)
      done(null, modified)
    })

    instance.post('/second', (req, reply) => {
      reply.send(req.body)
    })

    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'POST',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/first',
      body: { hello: 'world' },
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + JSON.stringify(body).length)
      t.same(body, { hello: 'another world' })
    })

    sget({
      method: 'POST',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/second',
      body: { hello: 'world' },
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + JSON.stringify(body).length)
      t.same(body, { hello: 'encapsulated world' })
    })
  })
})

test('preParsing hook should support encapsulation / 1', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.addHook('preParsing', (req, reply, payload, done) => {
      t.equal(req.raw.url, '/plugin')
      done()
    })

    instance.get('/plugin', (request, reply) => {
      reply.send()
    })

    done()
  })

  fastify.get('/root', (request, reply) => {
    reply.send()
  })

  fastify.inject('/root', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })

  fastify.inject('/plugin', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })
})

test('preParsing hook should support encapsulation / 2', t => {
  t.plan(3)
  const fastify = Fastify()
  let pluginInstance

  fastify.addHook('preParsing', function a () {})

  fastify.register((instance, opts, done) => {
    instance.addHook('preParsing', function b () {})
    pluginInstance = instance
    done()
  })

  fastify.ready(err => {
    t.error(err)
    t.equal(fastify[symbols.kHooks].preParsing.length, 1)
    t.equal(pluginInstance[symbols.kHooks].preParsing.length, 2)
  })
})

test('preParsing hook should support encapsulation / 3', t => {
  t.plan(20)
  const fastify = Fastify()
  fastify.decorate('hello', 'world')

  fastify.addHook('preParsing', function (req, reply, payload, done) {
    t.ok(this.hello)
    t.ok(this.hello2)
    req.first = true
    done()
  })

  fastify.decorate('hello2', 'world')

  fastify.get('/first', (req, reply) => {
    t.ok(req.first)
    t.notOk(req.second)
    reply.send({ hello: 'world' })
  })

  fastify.register((instance, opts, done) => {
    instance.decorate('hello3', 'world')
    instance.addHook('preParsing', function (req, reply, payload, done) {
      t.ok(this.hello)
      t.ok(this.hello2)
      t.ok(this.hello3)
      req.second = true
      done()
    })

    instance.get('/second', (req, reply) => {
      t.ok(req.first)
      t.ok(req.second)
      reply.send({ hello: 'world' })
    })

    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('preSerialization hook should run before serialization and be able to modify the payload', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('preSerialization', function (req, reply, payload, done) {
    payload.hello += '1'
    payload.world = 'ok'

    done(null, payload)
  })

  fastify.route({
    method: 'GET',
    url: '/first',
    handler: function (req, reply) {
      reply.send({ hello: 'world' })
    },
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            hello: {
              type: 'string'
            },
            world: {
              type: 'string'
            }
          },
          required: ['world'],
          additionalProperties: false
        }
      }
    }
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world1', world: 'ok' })
    })
  })
})

test('preSerialization hook should be able to throw errors which are validated against schema response', t => {
  const fastify = Fastify()

  fastify.addHook('preSerialization', function (req, reply, payload, done) {
    done(new Error('preSerialization aborted'))
  })

  fastify.setErrorHandler((err, request, reply) => {
    t.equal(err.message, 'preSerialization aborted')
    err.world = 'error'
    reply.send(err)
  })

  fastify.route({
    method: 'GET',
    url: '/first',
    handler: function (req, reply) {
      reply.send({ world: 'hello' })
    },
    schema: {
      response: {
        500: {
          type: 'object',
          properties: {
            world: {
              type: 'string'
            }
          },
          required: ['world'],
          additionalProperties: false
        }
      }
    }
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 500)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { world: 'error' })
      t.end()
    })
  })
})

test('preSerialization hook which returned error should still run onError hooks', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('preSerialization', function (req, reply, payload, done) {
    done(new Error('preSerialization aborted'))
  })

  fastify.addHook('onError', function (req, reply, payload, done) {
    t.pass()
    done()
  })

  fastify.get('/first', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 500)
    })
  })
})

test('preSerialization hooks should run in the order in which they are defined', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('preSerialization', function (req, reply, payload, done) {
    payload.hello += '2'

    done(null, payload)
  })

  fastify.addHook('preSerialization', function (req, reply, payload, done) {
    payload.hello += '1'

    done(null, payload)
  })

  fastify.get('/first', (req, reply) => {
    reply.send(payload)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world21' })
    })
  })
})

test('preSerialization hooks should support encapsulation', t => {
  t.plan(9)
  const fastify = Fastify()

  fastify.addHook('preSerialization', function (req, reply, payload, done) {
    payload.hello += '1'

    done(null, payload)
  })

  fastify.get('/first', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.register((instance, opts, done) => {
    instance.addHook('preSerialization', function (req, reply, payload, done) {
      payload.hello += '2'

      done(null, payload)
    })

    instance.get('/second', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world1' })
    })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world12' })
    })
  })
})

test('onRegister hook should be called / 1', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('onRegister', function (instance, opts, done) {
    t.ok(this.addHook)
    t.ok(instance.addHook)
    t.same(opts, pluginOpts)
    t.notOk(done)
  })

  const pluginOpts = { prefix: 'hello', custom: 'world' }
  fastify.register((instance, opts, done) => {
    done()
  }, pluginOpts)

  fastify.ready(err => { t.error(err) })
})

test('onRegister hook should be called / 2', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.addHook('onRegister', function (instance) {
    t.ok(this.addHook)
    t.ok(instance.addHook)
  })

  fastify.register((instance, opts, done) => {
    instance.register((instance, opts, done) => {
      done()
    })
    done()
  })

  fastify.register((instance, opts, done) => {
    done()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRegister hook should be called / 3', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.decorate('data', [])

  fastify.addHook('onRegister', instance => {
    instance.data = instance.data.slice()
  })

  fastify.register((instance, opts, done) => {
    instance.data.push(1)
    instance.register((instance, opts, done) => {
      instance.data.push(2)
      t.same(instance.data, [1, 2])
      done()
    })
    t.same(instance.data, [1])
    done()
  })

  fastify.register((instance, opts, done) => {
    t.same(instance.data, [])
    done()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRegister hook should be called (encapsulation)', t => {
  t.plan(1)
  const fastify = Fastify()

  function plugin (instance, opts, done) {
    done()
  }
  plugin[Symbol.for('skip-override')] = true

  fastify.addHook('onRegister', (instance, opts) => {
    t.fail('This should not be called')
  })

  fastify.register(plugin)

  fastify.ready(err => {
    t.error(err)
  })
})

test('early termination, onRequest', t => {
  t.plan(3)

  const app = Fastify()

  app.addHook('onRequest', (req, reply) => {
    setImmediate(() => reply.send('hello world'))
    return reply
  })

  app.get('/', (req, reply) => {
    t.fail('should not happen')
  })

  app.inject('/', function (err, res) {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.body.toString(), 'hello world')
  })
})

test('reply.send should throw if undefined error is thrown', t => {
  /* eslint prefer-promise-reject-errors: ["error", {"allowEmptyReject": true}] */

  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('onRequest', function (req, reply, done) {
    return Promise.reject()
  })

  fastify.get('/', (req, reply) => {
    reply.send('hello')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
    t.same(JSON.parse(res.payload), {
      error: 'Internal Server Error',
      code: 'FST_ERR_SEND_UNDEFINED_ERR',
      message: 'Undefined error has occurred',
      statusCode: 500
    })
  })
})

test('reply.send should throw if undefined error is thrown at preParsing hook', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('preParsing', function (req, reply, done) {
    return Promise.reject()
  })

  fastify.get('/', (req, reply) => {
    reply.send('hello')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
    t.same(JSON.parse(res.payload), {
      error: 'Internal Server Error',
      code: 'FST_ERR_SEND_UNDEFINED_ERR',
      message: 'Undefined error has occurred',
      statusCode: 500
    })
  })
})

test('reply.send should throw if undefined error is thrown at onSend hook', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('onSend', function (req, reply, done) {
    return Promise.reject()
  })

  fastify.get('/', (req, reply) => {
    reply.send('hello')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
    t.same(JSON.parse(res.payload), {
      error: 'Internal Server Error',
      code: 'FST_ERR_SEND_UNDEFINED_ERR',
      message: 'Undefined error has occurred',
      statusCode: 500
    })
  })
})

test('onTimeout should be triggered', t => {
  t.plan(6)
  const fastify = Fastify({ connectionTimeout: 500 })

  fastify.addHook('onTimeout', function (req, res, done) {
    t.ok('called', 'onTimeout')
    done()
  })

  fastify.get('/', async (req, reply) => {
    await reply.send({ hello: 'world' })
  })

  fastify.get('/timeout', async (req, reply) => {
    return reply
  })

  fastify.listen({ port: 0 }, (err, address) => {
    t.error(err)
    t.teardown(() => fastify.close())

    sget({
      method: 'GET',
      url: address
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
    })
    sget({
      method: 'GET',
      url: `${address}/timeout`
    }, (err, response, body) => {
      t.type(err, Error)
      t.equal(err.message, 'socket hang up')
    })
  })
})

test('onTimeout should be triggered and socket _meta is set', t => {
  t.plan(6)
  const fastify = Fastify({ connectionTimeout: 500 })

  fastify.addHook('onTimeout', function (req, res, done) {
    t.ok('called', 'onTimeout')
    done()
  })

  fastify.get('/', async (req, reply) => {
    req.raw.socket._meta = {}
    return reply.send({ hello: 'world' })
  })

  fastify.get('/timeout', async (req, reply) => {
    return reply
  })

  fastify.listen({ port: 0 }, (err, address) => {
    t.error(err)
    t.teardown(() => fastify.close())

    sget({
      method: 'GET',
      url: address
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
    })
    sget({
      method: 'GET',
      url: `${address}/timeout`
    }, (err, response, body) => {
      t.type(err, Error)
      t.equal(err.message, 'socket hang up')
    })
  })
})

test('registering invalid hooks should throw an error', async t => {
  t.plan(3)

  const fastify = Fastify()

  t.throws(() => {
    fastify.route({
      method: 'GET',
      path: '/invalidHook',
      onRequest: [undefined],
      async handler () {
        return 'hello world'
      }
    })
  }, new Error('onRequest hook should be a function, instead got [object Undefined]'))

  t.throws(() => {
    fastify.route({
      method: 'GET',
      path: '/invalidHook',
      onRequest: null,
      async handler () {
        return 'hello world'
      }
    })
  }, new Error('onRequest hook should be a function, instead got [object Null]'))

  // undefined is ok
  fastify.route({
    method: 'GET',
    path: '/validhook',
    onRequest: undefined,
    async handler () {
      return 'hello world'
    }
  })

  t.throws(() => {
    fastify.addHook('onRoute', (routeOptions) => {
      routeOptions.onSend = [undefined]
    })

    fastify.get('/', function (request, reply) {
      reply.send('hello world')
    })
  }, new Error('onSend hook should be a function, instead got [object Undefined]'))
})

test('onRequestAbort should be triggered', t => {
  const fastify = Fastify()
  let order = 0

  t.plan(7)
  t.teardown(() => fastify.close())

  fastify.addHook('onRequestAbort', function (req, done) {
    t.equal(++order, 1, 'called in hook')
    t.ok(req.pendingResolve, 'request has pendingResolve')
    req.pendingResolve()
    done()
  })

  fastify.addHook('onError', function hook (request, reply, error, done) {
    t.fail('onError should not be called')
    done()
  })

  fastify.addHook('onSend', function hook (request, reply, payload, done) {
    t.equal(payload, '{"hello":"world"}', 'onSend should be called')
    done(null, payload)
  })

  fastify.addHook('onResponse', function hook (request, reply, done) {
    t.fail('onResponse should not be called')
    done()
  })

  fastify.route({
    method: 'GET',
    path: '/',
    async handler (request, reply) {
      t.pass('handler called')
      let resolvePromise
      const promise = new Promise(resolve => { resolvePromise = resolve })
      request.pendingResolve = resolvePromise
      await promise
      t.pass('handler promise resolved')
      return { hello: 'world' }
    },
    async onRequestAbort (req) {
      t.equal(++order, 2, 'called in route')
    }
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    const socket = connect(fastify.server.address().port)

    socket.write('GET / HTTP/1.1\r\nHost: example.com\r\n\r\n')

    sleep(500).then(() => socket.destroy())
  })
})

test('onRequestAbort should support encapsulation', t => {
  const fastify = Fastify()
  let order = 0
  let child

  t.plan(6)
  t.teardown(() => fastify.close())

  fastify.addHook('onRequestAbort', function (req, done) {
    t.equal(++order, 1, 'called in root')
    t.strictSame(this.pluginName, child.pluginName)
    done()
  })

  fastify.register(async function (_child, _) {
    child = _child

    fastify.addHook('onRequestAbort', async function (req) {
      t.equal(++order, 2, 'called in child')
      t.strictSame(this.pluginName, child.pluginName)
    })

    child.route({
      method: 'GET',
      path: '/',
      async handler (request, reply) {
        await sleep(1000)
        return { hello: 'world' }
      },
      async onRequestAbort (_req) {
        t.equal(++order, 3, 'called in route')
      }
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    const socket = connect(fastify.server.address().port)

    socket.write('GET / HTTP/1.1\r\nHost: example.com\r\n\r\n')

    sleep(500).then(() => socket.destroy())
  })
})

test('onRequestAbort should handle errors / 1', t => {
  const fastify = Fastify()

  t.plan(2)
  t.teardown(() => fastify.close())

  fastify.addHook('onRequestAbort', function (req, done) {
    process.nextTick(() => t.pass())
    done(new Error('KABOOM!'))
  })

  fastify.route({
    method: 'GET',
    path: '/',
    async handler (request, reply) {
      await sleep(1000)
      return { hello: 'world' }
    }
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    const socket = connect(fastify.server.address().port)

    socket.write('GET / HTTP/1.1\r\nHost: example.com\r\n\r\n')

    sleep(500).then(() => socket.destroy())
  })
})

test('onRequestAbort should handle errors / 2', t => {
  const fastify = Fastify()

  t.plan(2)
  t.teardown(() => fastify.close())

  fastify.addHook('onRequestAbort', function (req, done) {
    process.nextTick(() => t.pass())
    throw new Error('KABOOM!')
  })

  fastify.route({
    method: 'GET',
    path: '/',
    async handler (request, reply) {
      await sleep(1000)
      return { hello: 'world' }
    }
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    const socket = connect(fastify.server.address().port)

    socket.write('GET / HTTP/1.1\r\nHost: example.com\r\n\r\n')

    sleep(500).then(() => socket.destroy())
  })
})

test('onRequestAbort should handle async errors / 1', t => {
  const fastify = Fastify()

  t.plan(2)
  t.teardown(() => fastify.close())

  fastify.addHook('onRequestAbort', async function (req) {
    process.nextTick(() => t.pass())
    throw new Error('KABOOM!')
  })

  fastify.route({
    method: 'GET',
    path: '/',
    async handler (request, reply) {
      await sleep(1000)
      return { hello: 'world' }
    }
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    const socket = connect(fastify.server.address().port)

    socket.write('GET / HTTP/1.1\r\nHost: example.com\r\n\r\n')

    sleep(500).then(() => socket.destroy())
  })
})

test('onRequestAbort should handle async errors / 2', t => {
  const fastify = Fastify()

  t.plan(2)
  t.teardown(() => fastify.close())

  fastify.addHook('onRequestAbort', async function (req) {
    process.nextTick(() => t.pass())
    return Promise.reject()
  })

  fastify.route({
    method: 'GET',
    path: '/',
    async handler (request, reply) {
      await sleep(1000)
      return { hello: 'world' }
    }
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    const socket = connect(fastify.server.address().port)

    socket.write('GET / HTTP/1.1\r\nHost: example.com\r\n\r\n')

    sleep(500).then(() => socket.destroy())
  })
})
