'use strict'

const { test } = require('tap')
const Fastify = require('..')
const split = require('split2')

test('encapuslates an error handler', async t => {
  t.plan(4)

  const fastify = Fastify()
  fastify.register(async function (fastify) {
    fastify.setErrorHandler(async function a (err) {
      t.equal(err.message, 'kaboom')
      throw new Error('caught')
    })
    fastify.get('/encapsulated', async () => { throw new Error('kaboom') })
  })

  fastify.setErrorHandler(async function b (err) {
    t.equal(err.message, 'caught')
    t.notOk(err.cause)
    throw new Error('wrapped')
  })

  const res = await fastify.inject('/encapsulated')
  t.equal(res.json().message, 'wrapped')
})

// See discussion in https://github.com/fastify/fastify/pull/5222#discussion_r1432573655
test('bubbles up cause if error handler is synchronous', async t => {
  t.plan(4)

  const fastify = Fastify()
  fastify.register(async function (fastify) {
    fastify.setErrorHandler(function a (err) {
      t.equal(err.message, 'kaboom')
      throw new Error('caught')
    })
    fastify.get('/encapsulated', async () => { throw new Error('kaboom') })
  })

  fastify.setErrorHandler(async function b (err) {
    t.equal(err.message, 'caught')
    t.equal(err.cause?.message, 'kaboom')
    throw new Error('wrapped')
  })

  const res = await fastify.inject('/encapsulated')
  t.equal(res.json().message, 'wrapped')
})

test('onError hook nested', async t => {
  t.plan(4)

  const fastify = Fastify()
  fastify.register(async function (fastify) {
    fastify.setErrorHandler(async function a (err) {
      t.equal(err.message, 'kaboom')
      throw new Error('caught')
    })
    fastify.get('/encapsulated', async () => { throw new Error('kaboom') })
  })

  fastify.setErrorHandler(async function b (err) {
    t.equal(err.message, 'caught')
    throw new Error('wrapped')
  })

  fastify.addHook('onError', async function (request, reply, err) {
    t.equal(err.message, 'kaboom')
  })

  const res = await fastify.inject('/encapsulated')
  t.equal(res.json().message, 'wrapped')
})

// See https://github.com/fastify/fastify/issues/5220
test('encapuslates an error handler, for errors thrown in hooks', async t => {
  t.plan(3)

  const fastify = Fastify()
  fastify.register(async function (fastify) {
    fastify.setErrorHandler(function a (err) {
      t.equal(err.message, 'from_hook')
      throw new Error('from_inner')
    })
    fastify.addHook('onRequest', async () => { throw new Error('from_hook') })
    fastify.get('/encapsulated', async () => {})
  })

  fastify.setErrorHandler(function b (err) {
    t.equal(err.message, 'from_inner')
    throw new Error('from_outer')
  })

  const res = await fastify.inject('/encapsulated')
  t.equal(res.json().message, 'from_outer')
})

// See https://github.com/fastify/fastify/issues/5220
test('encapuslates many synchronous error handlers that rethrow errors', async t => {
  const DEPTH = 100
  t.plan(DEPTH + 2)

  const createNestedRoutes = (fastify, depth) => {
    if (depth < 0) {
      throw new Error('Expected depth >= 0')
    } else if (depth === 0) {
      fastify.setErrorHandler(function a (err) {
        t.equal(err.message, 'from_route')
        throw new Error(`from_handler_${depth}`)
      })
      fastify.get('/encapsulated', async () => { throw new Error('from_route') })
    } else {
      fastify.setErrorHandler(function d (err) {
        t.equal(err.message, `from_handler_${depth - 1}`)
        throw new Error(`from_handler_${depth}`)
      })

      fastify.register(async function (fastify) {
        createNestedRoutes(fastify, depth - 1)
      })
    }
  }

  const fastify = Fastify()
  createNestedRoutes(fastify, DEPTH)

  const res = await fastify.inject('/encapsulated')
  t.equal(res.json().message, `from_handler_${DEPTH}`)
})

// See https://github.com/fastify/fastify/issues/5220
// This was not failing previously, but we want to make sure the behavior continues to work in the same way across async and sync handlers
// Plus, the current setup is somewhat fragile to tweaks to wrapThenable as that's what retries (by calling res.send(err) again)
test('encapuslates many asynchronous error handlers that rethrow errors', async t => {
  const DEPTH = 100
  t.plan(DEPTH + 2)

  const createNestedRoutes = (fastify, depth) => {
    if (depth < 0) {
      throw new Error('Expected depth >= 0')
    } else if (depth === 0) {
      fastify.setErrorHandler(async function a (err) {
        t.equal(err.message, 'from_route')
        throw new Error(`from_handler_${depth}`)
      })
      fastify.get('/encapsulated', async () => { throw new Error('from_route') })
    } else {
      fastify.setErrorHandler(async function m (err) {
        t.equal(err.message, `from_handler_${depth - 1}`)
        throw new Error(`from_handler_${depth}`)
      })

      fastify.register(async function (fastify) {
        createNestedRoutes(fastify, depth - 1)
      })
    }
  }

  const fastify = Fastify()
  createNestedRoutes(fastify, DEPTH)

  const res = await fastify.inject('/encapsulated')
  t.equal(res.json().message, `from_handler_${DEPTH}`)
})

test('handles error handler throwing a frozen error', async t => {
  t.plan(4)

  const logStream = split(JSON.parse)
  const messages = []
  logStream.on('data', message => {
    messages.push(message)
  })

  const fastify = Fastify({
    logger: {
      stream: logStream,
      level: 'info'
    }
  })
  fastify.register(async function (fastify) {
    fastify.setErrorHandler(function a (err) {
      t.equal(err.message, 'kaboom')
      const e = new Error('caught')
      Object.freeze(e)
      throw e
    })
    fastify.get('/encapsulated', async () => { throw new Error('kaboom') })
  })

  fastify.setErrorHandler(async function b (err) {
    t.equal(err.message, 'caught')
    throw new Error('wrapped')
  })

  const res = await fastify.inject('/encapsulated')
  t.equal(res.json().message, 'wrapped')
  t.ok(messages.find(message => message.message?.includes('Failed to assign child error')))
})
