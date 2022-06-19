'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const {
  kOptions,
  kErrorHandler
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
