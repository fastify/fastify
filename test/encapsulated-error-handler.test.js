'use strict'

const { test } = require('tap')
const Fastify = require('..')
const split = require('split2')

// Because of how error handlers wrap things, following the control flow can be tricky
// In this test file numbered comments indicate the order statements are expected to execute

test('encapuslates an error handler', async t => {
  t.plan(4)

  const fastify = Fastify()
  fastify.register(async function (fastify) {
    fastify.setErrorHandler(async function a (err) {
      // 3. the inner error handler catches the error, and throws a new error
      t.equal(err.message, 'from_endpoint')
      throw new Error('from_inner')
    })
    fastify.get('/encapsulated', async () => {
      // 2. the endpoint throws an error
      throw new Error('from_endpoint')
    })
  })

  fastify.setErrorHandler(async function b (err) {
    // 4. the outer error handler catches the error thrown by the inner error handler
    t.equal(err.message, 'from_inner')
    // NB: no cause set for async error handlers because told not to add it to wrapThenable
    // https://github.com/fastify/fastify/pull/5222#discussion_r1433848321
    t.notOk(err.cause)
    // 5. the outer error handler throws a new error
    throw new Error('from_outer')
  })

  // 1. the endpoint is called
  const res = await fastify.inject('/encapsulated')
  // 6. the default error handler returns the error from the outer error handler
  t.equal(res.json().message, 'from_outer')
})

// See discussion in https://github.com/fastify/fastify/pull/5222#discussion_r1432573655
test('bubbles up cause if error handler is synchronous', async t => {
  t.plan(4)

  const fastify = Fastify()
  fastify.register(async function (fastify) {
    fastify.setErrorHandler(function a (err) {
      // 3. the inner error handler catches the error, and throws a new error
      t.equal(err.message, 'from_endpoint')
      throw new Error('from_inner')
    })
    fastify.get('/encapsulated', async () => {
      // 2. the endpoint throws an error
      throw new Error('from_endpoint')
    })
  })

  fastify.setErrorHandler(async function b (err) {
    // 4. the outer error handler catches the error thrown by the inner error handler
    t.equal(err.message, 'from_inner')
    // cause set to the error thrown by the inner function
    t.equal(err.cause?.message, 'from_endpoint')
    // 5. the outer error handler throws a new error
    throw new Error('from_outer')
  })

  // 1. the endpoint is called
  const res = await fastify.inject('/encapsulated')
  // 6. the default error handler returns the error from the outer error handler
  t.equal(res.json().message, 'from_outer')
})

test('onError hook nested', async t => {
  t.plan(4)

  const fastify = Fastify()
  fastify.register(async function (fastify) {
    fastify.setErrorHandler(async function a (err) {
      // 4. the inner error handler catches the error, and throws a new error
      t.equal(err.message, 'from_endpoint')
      throw new Error('from_inner')
    })
    fastify.get('/encapsulated', async () => {
      // 2. the endpoint throws an error
      throw new Error('from_endpoint')
    })
  })

  fastify.setErrorHandler(async function b (err) {
    // 5. the outer error handler catches the error thrown by the inner error handler
    t.equal(err.message, 'from_inner')
    // 6. the outer error handler throws a new error
    throw new Error('from_outer')
  })

  fastify.addHook('onError', async function (request, reply, err) {
    // 3. the hook receives the error
    t.equal(err.message, 'from_endpoint')
  })

  // 1. the endpoint is called
  const res = await fastify.inject('/encapsulated')
  // 7. the default error handler returns the error from the outer error handler
  t.equal(res.json().message, 'from_outer')
})

// See https://github.com/fastify/fastify/issues/5220
test('encapuslates an error handler, for errors thrown in hooks', async t => {
  t.plan(3)

  const fastify = Fastify()
  fastify.register(async function (fastify) {
    fastify.setErrorHandler(function a (err) {
      // 3. the inner error handler catches the error, and throws a new error
      t.equal(err.message, 'from_hook')
      throw new Error('from_inner')
    })
    fastify.addHook('onRequest', async () => {
      // 2. the hook throws an error
      throw new Error('from_hook')
    })
    fastify.get('/encapsulated', async () => {})
  })

  fastify.setErrorHandler(function b (err) {
    // 4. the outer error handler catches the error thrown by the inner error handler
    t.equal(err.message, 'from_inner')
    // 5. the outer error handler throws a new error
    throw new Error('from_outer')
  })

  // 1. the endpoint is called
  const res = await fastify.inject('/encapsulated')
  // 6. the default error handler returns the error from the outer error handler
  t.equal(res.json().message, 'from_outer')
})

// See https://github.com/fastify/fastify/issues/5220
test('encapuslates many synchronous error handlers that rethrow errors', async t => {
  const DEPTH = 100
  t.plan(DEPTH + 2)

  /**
   * This creates a very nested set of error handlers, that looks like:
   * plugin
   * - error handler
   * - plugin
   *   - error handler
   *   - plugin
   *     ... {to DEPTH levels}
   *       - plugin
   *           - error handler
   *           - GET /encapsulated
   */
  const createNestedRoutes = (fastify, depth) => {
    if (depth < 0) {
      throw new Error('Expected depth >= 0')
    } else if (depth === 0) {
      fastify.setErrorHandler(function a (err) {
        // 3. innermost error handler catches the error, and throws a new error
        t.equal(err.message, 'from_route')
        throw new Error(`from_handler_${depth}`)
      })
      fastify.get('/encapsulated', async () => {
        // 2. the endpoint throws an error
        throw new Error('from_route')
      })
    } else {
      fastify.setErrorHandler(function d (err) {
        // 4 to {DEPTH+4}. error handlers each catch errors, and then throws a new error
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

  // 1. the endpoint is called
  const res = await fastify.inject('/encapsulated')
  // {DEPTH+5}. the default error handler returns the error from the outermost error handler
  t.equal(res.json().message, `from_handler_${DEPTH}`)
})

// See https://github.com/fastify/fastify/issues/5220
// This was not failing previously, but we want to make sure the behavior continues to work in the same way across async and sync handlers
// Plus, the current setup is somewhat fragile to tweaks to wrapThenable as that's what retries (by calling res.send(err) again)
test('encapuslates many asynchronous error handlers that rethrow errors', async t => {
  const DEPTH = 100
  t.plan(DEPTH + 2)

  /**
   * This creates a very nested set of error handlers, that looks like:
   * plugin
   * - error handler
   * - plugin
   *   - error handler
   *   - plugin
   *     ... {to DEPTH levels}
   *       - plugin
   *           - error handler
   *           - GET /encapsulated
   */
  const createNestedRoutes = (fastify, depth) => {
    if (depth < 0) {
      throw new Error('Expected depth >= 0')
    } else if (depth === 0) {
      fastify.setErrorHandler(async function a (err) {
        // 3. innermost error handler catches the error, and throws a new error
        t.equal(err.message, 'from_route')
        throw new Error(`from_handler_${depth}`)
      })
      fastify.get('/encapsulated', async () => {
        // 2. the endpoint throws an error
        throw new Error('from_route')
      })
    } else {
      fastify.setErrorHandler(async function m (err) {
        // 4 to {DEPTH+4}. error handlers each catch errors, and then throws a new error
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

  // 1. the endpoint is called
  const res = await fastify.inject('/encapsulated')
  // {DEPTH+5}. the default error handler returns the error from the outermost error handler
  t.equal(res.json().message, `from_handler_${DEPTH}`)
})

test('handles error handler throwing a frozen error', async t => {
  t.plan(5)

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
      // 3. the inner error handler catches the error, and throws a new frozen error
      t.equal(err.message, 'from_endpoint')
      const e = new Error('from_inner')
      Object.freeze(e)
      throw e
    })
    fastify.get('/encapsulated', async () => {
      // 2. the endpoint throws an error
      throw new Error('from_endpoint')
    })
  })

  fastify.setErrorHandler(function b (err) {
    // 5. the outer error handler catches the error thrown by the inner error handler
    t.equal(err.message, 'from_inner')
    // no cause set for async error handlers because this error is frozen
    t.notOk(err.cause)
    // 6. the outer error handler throws a new error
    throw new Error('from_outer')
  })

  // 1. the endpoint is called
  const res = await fastify.inject('/encapsulated')
  // 7. the default error handler returns the error from the outer error handler
  t.equal(res.json().message, 'from_outer')
  // 4. the child cause cannot be assigned when passing the error from the inner to
  // outer error handler, because it is frozen, so we log a warning.
  t.ok(messages.find(message => message.message?.includes('Failed to assign child error')))
})

test('handles error handler throwing an error already with a cause', async t => {
  t.plan(5)

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
      // 3. the inner error handler catches the error, and throws a new error with a custom cause
      t.equal(err.message, 'from_endpoint')
      const e = new Error('from_inner')
      e.cause = new Error('from_inner_custom_cause')
      throw e
    })
    fastify.get('/encapsulated', async () => {
      // 2. the endpoint throws an error
      throw new Error('from_endpoint')
    })
  })

  fastify.setErrorHandler(function b (err) {
    // 5. the outer error handler catches the error thrown by the inner error handler
    t.equal(err.message, 'from_inner')
    // cause is not modified because it is already set
    t.equal(err.cause.message, 'from_inner_custom_cause')
    // 6. the outer error handler throws a new error
    throw new Error('from_outer')
  })

  // 1. the endpoint is called
  const res = await fastify.inject('/encapsulated')
  // 7. the default error handler returns the error from the outer error handler
  t.equal(res.json().message, 'from_outer')
  // 4. the child cause is not assigned when passing the error from the inner to
  // outer error handler, because it would overwrite an existing cause, so we log a warning.
  t.ok(messages.find(message => message.message?.includes('Failed to assign child error')))
})
