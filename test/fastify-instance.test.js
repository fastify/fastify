'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const os = require('node:os')

const {
  kOptions,
  kErrorHandler,
  kChildLoggerFactory,
  kState
} = require('../lib/symbols')

const isIPv6Missing = !Object.values(os.networkInterfaces()).flat().some(({ family }) => family === 'IPv6')

test('root fastify instance is an object', t => {
  t.plan(1)
  t.assert.strictEqual(typeof Fastify(), 'object')
})

test('fastify instance should contains ajv options', t => {
  t.plan(1)
  const fastify = Fastify({
    ajv: {
      customOptions: {
        nullable: false
      }
    }
  })
  t.assert.deepStrictEqual(fastify[kOptions].ajv, {
    customOptions: {
      nullable: false
    },
    plugins: []
  })
})

test('fastify instance should contains ajv options.plugins nested arrays', t => {
  t.plan(1)
  const fastify = Fastify({
    ajv: {
      customOptions: {
        nullable: false
      },
      plugins: [[]]
    }
  })
  t.assert.deepStrictEqual(fastify[kOptions].ajv, {
    customOptions: {
      nullable: false
    },
    plugins: [[]]
  })
})

test('fastify instance get invalid ajv options', t => {
  t.plan(1)
  t.assert.throws(() => Fastify({
    ajv: {
      customOptions: 8
    }
  }))
})

test('fastify instance get invalid ajv options.plugins', t => {
  t.plan(1)
  t.assert.throws(() => Fastify({
    ajv: {
      customOptions: {},
      plugins: 8
    }
  }))
})

test('fastify instance should contain default errorHandler', t => {
  t.plan(3)
  const fastify = Fastify()
  t.assert.ok(fastify[kErrorHandler].func instanceof Function)
  t.assert.deepStrictEqual(fastify.errorHandler, fastify[kErrorHandler].func)
  t.assert.deepStrictEqual(Object.getOwnPropertyDescriptor(fastify, 'errorHandler').set, undefined)
})

test('errorHandler in plugin should be separate from the external one', async t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    const inPluginErrHandler = (_, __, reply) => {
      reply.send({ plugin: 'error-object' })
    }

    instance.setErrorHandler(inPluginErrHandler)

    t.assert.notDeepStrictEqual(instance.errorHandler, fastify.errorHandler)
    t.assert.strictEqual(instance.errorHandler.name, 'bound inPluginErrHandler')

    done()
  })

  await fastify.ready()

  t.assert.ok(fastify[kErrorHandler].func instanceof Function)
  t.assert.deepStrictEqual(fastify.errorHandler, fastify[kErrorHandler].func)
})

test('fastify instance should contain default childLoggerFactory', t => {
  t.plan(3)
  const fastify = Fastify()
  t.assert.ok(fastify[kChildLoggerFactory] instanceof Function)
  t.assert.deepStrictEqual(fastify.childLoggerFactory, fastify[kChildLoggerFactory])
  t.assert.deepStrictEqual(Object.getOwnPropertyDescriptor(fastify, 'childLoggerFactory').set, undefined)
})

test('childLoggerFactory in plugin should be separate from the external one', async t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    const inPluginLoggerFactory = function (logger, bindings, opts) {
      return logger.child(bindings, opts)
    }

    instance.setChildLoggerFactory(inPluginLoggerFactory)

    t.assert.notDeepStrictEqual(instance.childLoggerFactory, fastify.childLoggerFactory)
    t.assert.strictEqual(instance.childLoggerFactory.name, 'inPluginLoggerFactory')

    done()
  })

  await fastify.ready()

  t.assert.ok(fastify[kChildLoggerFactory] instanceof Function)
  t.assert.deepStrictEqual(fastify.childLoggerFactory, fastify[kChildLoggerFactory])
})

test('ready should resolve in order when called multiply times (promises only)', async (t) => {
  const app = Fastify()
  const expectedOrder = [1, 2, 3, 4, 5]
  const result = []

  const promises = [1, 2, 3, 4, 5]
    .map((id) => app.ready().then(() => result.push(id)))

  await Promise.all(promises)

  t.assert.deepStrictEqual(result, expectedOrder, 'Should resolve in order')
})

test('ready should reject in order when called multiply times (promises only)', async (t) => {
  const app = Fastify()
  const expectedOrder = [1, 2, 3, 4, 5]
  const result = []

  app.register((instance, opts, done) => {
    setTimeout(() => done(new Error('test')), 500)
  })

  const promises = [1, 2, 3, 4, 5]
    .map((id) => app.ready().catch(() => result.push(id)))

  await Promise.all(promises)

  t.assert.deepStrictEqual(result, expectedOrder, 'Should resolve in order')
})

test('ready should reject in order when called multiply times (callbacks only)', async (t) => {
  const app = Fastify()
  const expectedOrder = [1, 2, 3, 4, 5]
  const result = []

  app.register((instance, opts, done) => {
    setTimeout(() => done(new Error('test')), 500)
  })

  expectedOrder.map((id) => app.ready(() => result.push(id)))

  await app.ready().catch(err => {
    t.assert.strictEqual(err.message, 'test')
  })

  t.assert.deepStrictEqual(result, expectedOrder, 'Should resolve in order')
})

test('ready should resolve in order when called multiply times (callbacks only)', async (t) => {
  const app = Fastify()
  const expectedOrder = [1, 2, 3, 4, 5]
  const result = []

  expectedOrder.map((id) => app.ready(() => result.push(id)))

  await app.ready()

  t.assert.deepStrictEqual(result, expectedOrder, 'Should resolve in order')
})

test('ready should resolve in order when called multiply times (mixed)', async (t) => {
  const app = Fastify()
  const expectedOrder = [1, 2, 3, 4, 5, 6]
  const result = []

  for (const order of expectedOrder) {
    if (order % 2) {
      app.ready(() => result.push(order))
    } else {
      app.ready().then(() => result.push(order))
    }
  }

  await app.ready()

  t.assert.deepStrictEqual(result, expectedOrder, 'Should resolve in order')
})

test('ready should reject in order when called multiply times (mixed)', async (t) => {
  const app = Fastify()
  const expectedOrder = [1, 2, 3, 4, 5, 6]
  const result = []

  app.register((instance, opts, done) => {
    setTimeout(() => done(new Error('test')), 500)
  })

  for (const order of expectedOrder) {
    if (order % 2) {
      app.ready(() => result.push(order))
    } else {
      app.ready().then(null, () => result.push(order))
    }
  }

  await app.ready().catch(err => {
    t.assert.strictEqual(err.message, 'test')
  })

  t.assert.deepStrictEqual(result, expectedOrder, 'Should resolve in order')
})

test('ready should resolve in order when called multiply times (mixed)', async (t) => {
  const app = Fastify()
  const expectedOrder = [1, 2, 3, 4, 5, 6]
  const result = []

  for (const order of expectedOrder) {
    if (order % 2) {
      app.ready().then(() => result.push(order))
    } else {
      app.ready(() => result.push(order))
    }
  }

  await app.ready()

  t.assert.deepStrictEqual(result, expectedOrder, 'Should resolve in order')
})

test('fastify instance should contains listeningOrigin property (with port and host)', async t => {
  t.plan(1)
  const port = 3000
  const host = '127.0.0.1'
  const fastify = Fastify()
  await fastify.listen({ port, host })
  t.assert.deepStrictEqual(fastify.listeningOrigin, `http://${host}:${port}`)
  await fastify.close()
})

test('fastify instance should contains listeningOrigin property (with port and https)', async t => {
  t.plan(1)
  const port = 3000
  const host = '127.0.0.1'
  const fastify = Fastify({ https: {} })
  await fastify.listen({ port, host })
  t.assert.deepStrictEqual(fastify.listeningOrigin, `https://${host}:${port}`)
  await fastify.close()
})

test('fastify instance should contains listeningOrigin property (unix socket)', { skip: os.platform() === 'win32' }, async t => {
  const fastify = Fastify()
  const path = `fastify.${Date.now()}.sock`
  await fastify.listen({ path })
  t.assert.deepStrictEqual(fastify.listeningOrigin, path)
  await fastify.close()
})

test('fastify instance should contains listeningOrigin property (IPv6)', { skip: isIPv6Missing }, async t => {
  t.plan(1)
  const port = 3000
  const host = '::1'
  const fastify = Fastify()
  await fastify.listen({ port, host })
  t.assert.deepStrictEqual(fastify.listeningOrigin, `http://[::1]:${port}`)
  await fastify.close()
})

test('fastify instance should ensure ready promise cleanup on ready', async t => {
  t.plan(1)
  const fastify = Fastify()
  await fastify.ready()
  t.assert.strictEqual(fastify[kState].readyResolver, null)
})

test('cannot register hooks, decorators, routes or parsers right after ready() resolves', async t => {
  t.plan(4)
  const fastify = Fastify()
  t.after(() => fastify.close())
  await fastify.ready()

  t.assert.throws(() => fastify.addHook('onClose', async () => {}), { code: 'FST_ERR_INSTANCE_ALREADY_STARTED' })
  t.assert.throws(() => fastify.decorate('late', true), { code: 'FST_ERR_DEC_AFTER_START' })
  t.assert.throws(() => fastify.get('/late', () => 'late'), { code: 'FST_ERR_INSTANCE_ALREADY_STARTED' })
  t.assert.throws(
    () => fastify.addContentTypeParser('text/late', (req, body, done) => done(null, body)),
    { code: 'FST_ERR_CTP_INSTANCE_ALREADY_STARTED' }
  )
})

test('cannot register hooks inside the ready() callback', (t, done) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.ready(err => {
    t.assert.ifError(err)
    t.assert.throws(() => fastify.addHook('onClose', async () => {}), { code: 'FST_ERR_INSTANCE_ALREADY_STARTED' })
    fastify.close(done)
  })
})

test('a route rejected right after ready() is not left in the router', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())
  await fastify.ready()

  t.assert.throws(() => fastify.get('/late', () => 'late'), { code: 'FST_ERR_INSTANCE_ALREADY_STARTED' })
  const res = await fastify.inject('/late')
  t.assert.strictEqual(res.statusCode, 404)
})
