'use strict'

const { test } = require('tap')
const fastify = require('..')

test('same shape on Request', async (t) => {
  t.plan(1)

  const app = fastify()

  let request

  app.decorateRequest('user')

  app.addHook('preHandler', (req, reply, done) => {
    if (request) {
      req.user = 'User'
    }
    done()
  })

  app.get('/', (req, reply) => {
    if (request) {
      t.equal(%HaveSameMap(request, req), true)
    }

    request = req

    return 'hello world'
  })

  await app.inject('/')
  await app.inject('/')
})

test('same shape on Request when object', async (t) => {
  t.plan(1)

  const app = fastify()

  let request

  app.decorateRequest('object', null)

  app.addHook('preHandler', (req, reply, done) => {
    if (request) {
      req.object = {}
    }
    done()
  })

  app.get('/', (req, reply) => {
    if (request) {
      t.equal(%HaveSameMap(request, req), true)
    }

    request = req

    return 'hello world'
  })

  await app.inject('/')
  await app.inject('/')
})

test('same shape on Reply', async (t) => {
  t.plan(1)

  const app = fastify()

  let _reply

  app.decorateReply('user')

  app.addHook('preHandler', (req, reply, done) => {
    if (_reply) {
      reply.user = 'User'
    }
    done()
  })

  app.get('/', (req, reply) => {
    if (_reply) {
      t.equal(%HaveSameMap(_reply, reply), true)
    }

    _reply = reply

    return 'hello world'
  })

  await app.inject('/')
  await app.inject('/')
})

test('same shape on Reply when object', async (t) => {
  t.plan(1)

  const app = fastify()

  let _reply

  app.decorateReply('object', null)

  app.addHook('preHandler', (req, reply, done) => {
    if (_reply) {
      reply.object = {}
    }
    done()
  })

  app.get('/', (req, reply) => {
    if (_reply) {
      t.equal(%HaveSameMap(_reply, reply), true)
    }

    _reply = reply

    return 'hello world'
  })

  await app.inject('/')
  await app.inject('/')
})
