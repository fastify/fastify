'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const os = require('os')

const {
  kOptions,
  kErrorHandler,
  kChildLoggerFactory
} = require('../lib/symbols')

test('root fastify instance is an object', t => {
  t.plan(1)
  t.type(Fastify(), 'object')
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
  t.same(fastify[kOptions].ajv, {
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
  t.same(fastify[kOptions].ajv, {
    customOptions: {
      nullable: false
    },
    plugins: [[]]
  })
})

test('fastify instance get invalid ajv options', t => {
  t.plan(1)
  t.throws(() => Fastify({
    ajv: {
      customOptions: 8
    }
  }))
})

test('fastify instance get invalid ajv options.plugins', t => {
  t.plan(1)
  t.throws(() => Fastify({
    ajv: {
      customOptions: {},
      plugins: 8
    }
  }))
})

test('fastify instance should contain default errorHandler', t => {
  t.plan(3)
  const fastify = Fastify()
  t.ok(fastify[kErrorHandler].func instanceof Function)
  t.same(fastify.errorHandler, fastify[kErrorHandler].func)
  t.same(Object.getOwnPropertyDescriptor(fastify, 'errorHandler').set, undefined)
})

test('errorHandler in plugin should be separate from the external one', async t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    const inPluginErrHandler = (_, __, reply) => {
      reply.send({ plugin: 'error-object' })
    }

    instance.setErrorHandler(inPluginErrHandler)

    t.notSame(instance.errorHandler, fastify.errorHandler)
    t.equal(instance.errorHandler.name, 'bound inPluginErrHandler')

    done()
  })

  await fastify.ready()

  t.ok(fastify[kErrorHandler].func instanceof Function)
  t.same(fastify.errorHandler, fastify[kErrorHandler].func)
})

test('fastify instance should contain default childLoggerFactory', t => {
  t.plan(3)
  const fastify = Fastify()
  t.ok(fastify[kChildLoggerFactory] instanceof Function)
  t.same(fastify.childLoggerFactory, fastify[kChildLoggerFactory])
  t.same(Object.getOwnPropertyDescriptor(fastify, 'childLoggerFactory').set, undefined)
})

test('childLoggerFactory in plugin should be separate from the external one', async t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    const inPluginLoggerFactory = function (logger, bindings, opts) {
      return logger.child(bindings, opts)
    }

    instance.setChildLoggerFactory(inPluginLoggerFactory)

    t.notSame(instance.childLoggerFactory, fastify.childLoggerFactory)
    t.equal(instance.childLoggerFactory.name, 'inPluginLoggerFactory')

    done()
  })

  await fastify.ready()

  t.ok(fastify[kChildLoggerFactory] instanceof Function)
  t.same(fastify.childLoggerFactory, fastify[kChildLoggerFactory])
})

test('fastify instance should contains listeningOrigin property (with port and host)', async t => {
  t.plan(1)
  const port = 3000
  const host = '127.0.0.1'
  const fastify = Fastify()
  await fastify.listen({ port, host })
  t.same(fastify.listeningOrigin, `http://${host}:${port}`)
  await fastify.close()
})

test('fastify instance should contains listeningOrigin property (with port and https)', async t => {
  t.plan(1)
  const port = 3000
  const host = '127.0.0.1'
  const fastify = Fastify({ https: {} })
  await fastify.listen({ port, host })
  t.same(fastify.listeningOrigin, `https://${host}:${port}`)
  await fastify.close()
})

test('fastify instance should contains listeningOrigin property (unix socket)', { skip: os.platform() === 'win32' }, async t => {
  const fastify = Fastify()
  const path = `fastify.${Date.now()}.sock`
  await fastify.listen({ path })
  t.same(fastify.listeningOrigin, path)
  await fastify.close()
})

test('fastify instance should contains listeningOrigin property (IPv6)', async t => {
  t.plan(1)
  const port = 3000
  const host = '::1'
  const fastify = Fastify()
  await fastify.listen({ port, host })
  t.same(fastify.listeningOrigin, `http://[::1]:${port}`)
  await fastify.close()
})
