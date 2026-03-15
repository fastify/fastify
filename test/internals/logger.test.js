'use strict'

const { test } = require('node:test')
const Fastify = require('../..')
const loggerUtils = require('../../lib/logger-factory')
const { createLogDispatcher } = require('../../lib/logger-factory')
const { serializers } = require('../../lib/logger-pino')

test('time resolution', t => {
  t.plan(2)
  t.assert.strictEqual(typeof loggerUtils.now, 'function')
  t.assert.strictEqual(typeof loggerUtils.now(), 'number')
})

test('The logger should add a unique id for every request', (t, done) => {
  const ids = []

  const fastify = Fastify()
  fastify.get('/', (req, reply) => {
    t.assert.ok(req.id)
    reply.send({ id: req.id })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    const queue = new Queue()
    for (let i = 0; i < 10; i++) {
      queue.add(checkId)
    }
    queue.add(() => {
      fastify.close()
      done()
    })
  })

  function checkId (done) {
    fastify.inject({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, res) => {
      t.assert.ifError(err)
      const payload = JSON.parse(res.payload)
      t.assert.ok(ids.indexOf(payload.id) === -1, 'the id should not be duplicated')
      ids.push(payload.id)
      done()
    })
  }
})

test('The logger should not reuse request id header for req.id', (t, done) => {
  const fastify = Fastify()
  fastify.get('/', (req, reply) => {
    t.assert.ok(req.id)
    reply.send({ id: req.id })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    fastify.inject({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'Request-Id': 'request-id-1'
      }
    }, (err, res) => {
      t.assert.ifError(err)
      const payload = JSON.parse(res.payload)
      t.assert.ok(payload.id !== 'request-id-1', 'the request id from the header should not be returned with default configuration')
      t.assert.ok(payload.id === 'req-1') // first request id when using the default configuration
      fastify.close()
      done()
    })
  })
})

test('The logger should reuse request id header for req.id if requestIdHeader is set', (t, done) => {
  const fastify = Fastify({
    requestIdHeader: 'request-id'
  })
  fastify.get('/', (req, reply) => {
    t.assert.ok(req.id)
    reply.send({ id: req.id })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    fastify.inject({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'Request-Id': 'request-id-1'
      }
    }, (err, res) => {
      t.assert.ifError(err)
      const payload = JSON.parse(res.payload)
      t.assert.ok(payload.id === 'request-id-1', 'the request id from the header should be returned')
      fastify.close()
      done()
    })
  })
})

function Queue () {
  this.q = []
  this.running = false
}

Queue.prototype.add = function add (job) {
  this.q.push(job)
  if (!this.running) this.run()
}

Queue.prototype.run = function run () {
  this.running = true
  const job = this.q.shift()
  job(() => {
    if (this.q.length) {
      this.run()
    } else {
      this.running = false
    }
  })
}

test('The logger should error if both stream and file destination are given', t => {
  t.plan(2)

  const stream = require('node:stream').Writable

  try {
    Fastify({
      logger: {
        level: 'info',
        stream,
        file: '/test'
      }
    })
  } catch (err) {
    t.assert.strictEqual(err.code, 'FST_ERR_LOG_INVALID_DESTINATION')
    t.assert.strictEqual(err.message, 'Cannot specify both logger.stream and logger.file options')
  }
})

test('requestCompleted should not log when logging is disabled (boolean)', t => {
  t.plan(1)
  const logDispatcher = createLogDispatcher({ disableRequestLogging: true })
  const log = {
    error: () => { t.assert.fail('error should not be called') },
    info: () => { t.assert.fail('info should not be called') }
  }
  const request = {}
  const reply = { request, log }
  logDispatcher.requestCompleted(new Error('test'), request, reply)
  t.assert.ok(true, 'logger was not called')
})

test('requestCompleted should not log when logging is disabled (function)', t => {
  t.plan(1)
  const logDispatcher = createLogDispatcher({ disableRequestLogging: () => true })
  const log = {
    error: () => { t.assert.fail('error should not be called') },
    info: () => { t.assert.fail('info should not be called') }
  }
  const request = {}
  const reply = { request, log }
  logDispatcher.requestCompleted(new Error('test'), request, reply)
  t.assert.ok(true, 'logger was not called')
})

test('requestCompleted should log error when err is present', t => {
  t.plan(1)
  const logDispatcher = createLogDispatcher({ disableRequestLogging: false })
  const err = new Error('test')
  const log = {
    error: (data, msg) => {
      t.assert.strictEqual(msg, 'request errored')
    }
  }
  const request = {}
  const reply = { request, log, elapsedTime: 42 }
  logDispatcher.requestCompleted(err, request, reply)
})

test('requestCompleted should log info when no error', t => {
  t.plan(1)
  const logDispatcher = createLogDispatcher({ disableRequestLogging: false })
  const log = {
    info: (data, msg) => {
      t.assert.strictEqual(msg, 'request completed')
    }
  }
  const request = {}
  const reply = { request, log, elapsedTime: 42 }
  logDispatcher.requestCompleted(null, request, reply)
})

test('defaultErrorLog should not log when logging is disabled (boolean)', t => {
  t.plan(1)
  const logDispatcher = createLogDispatcher({ disableRequestLogging: true })
  const log = {
    info: () => { t.assert.fail('info should not be called') },
    error: () => { t.assert.fail('error should not be called') }
  }
  const request = {}
  const reply = { request, log, statusCode: 404 }
  logDispatcher.defaultErrorLog(new Error('not found'), request, reply)
  t.assert.ok(true, 'logger was not called')
})

test('defaultErrorLog should not log when logging is disabled (function)', t => {
  t.plan(1)
  const logDispatcher = createLogDispatcher({ disableRequestLogging: () => true })
  const log = {
    info: () => { t.assert.fail('info should not be called') },
    error: () => { t.assert.fail('error should not be called') }
  }
  const request = {}
  const reply = { request, log, statusCode: 404 }
  logDispatcher.defaultErrorLog(new Error('not found'), request, reply)
  t.assert.ok(true, 'logger was not called')
})

test('defaultErrorLog should log info for 4xx errors', t => {
  t.plan(1)
  const logDispatcher = createLogDispatcher({ disableRequestLogging: false })
  const err = new Error('not found')
  const log = {
    info: (data, msg) => {
      t.assert.strictEqual(msg, 'not found')
    }
  }
  const request = {}
  const reply = { request, log, statusCode: 404 }
  logDispatcher.defaultErrorLog(err, request, reply)
})

test('defaultErrorLog should log error for 5xx errors', t => {
  t.plan(1)
  const logDispatcher = createLogDispatcher({ disableRequestLogging: false })
  const err = new Error('internal error')
  const log = {
    error: (data, msg) => {
      t.assert.strictEqual(msg, 'internal error')
    }
  }
  const request = {}
  const reply = { request, log, statusCode: 500 }
  logDispatcher.defaultErrorLog(err, request, reply)
})

test('writeHeadError should not log when logging is disabled (boolean)', t => {
  t.plan(1)
  const logDispatcher = createLogDispatcher({ disableRequestLogging: true })
  const log = {
    warn: () => { t.assert.fail('warn should not be called') }
  }
  const request = {}
  const reply = { request, log }
  logDispatcher.writeHeadError(new Error('write head failed'), reply)
  t.assert.ok(true, 'logger was not called')
})

test('writeHeadError should not log when logging is disabled (function)', t => {
  t.plan(1)
  const logDispatcher = createLogDispatcher({ disableRequestLogging: () => true })
  const log = {
    warn: () => { t.assert.fail('warn should not be called') }
  }
  const request = {}
  const reply = { request, log }
  logDispatcher.writeHeadError(new Error('write head failed'), reply)
  t.assert.ok(true, 'logger was not called')
})

test('writeHeadError should log warn with error message', t => {
  t.plan(2)
  const logDispatcher = createLogDispatcher({ disableRequestLogging: false })
  const error = new Error('write head failed')
  const request = {}
  const reply = {
    request,
    log: {
      warn: (data, msg) => {
        t.assert.strictEqual(msg, 'write head failed')
        t.assert.strictEqual(data.err, error)
      }
    }
  }
  logDispatcher.writeHeadError(error, reply)
})

test('serializerError should not log when logging is disabled (boolean)', t => {
  t.plan(1)
  const logDispatcher = createLogDispatcher({ disableRequestLogging: true })
  const log = {
    error: () => { t.assert.fail('error should not be called') }
  }
  const request = {}
  const reply = { request, log }
  logDispatcher.serializerError(new Error('serializer failed'), reply, 500)
  t.assert.ok(true, 'logger was not called')
})

test('serializerError should not log when logging is disabled (function)', t => {
  t.plan(1)
  const logDispatcher = createLogDispatcher({ disableRequestLogging: () => true })
  const log = {
    error: () => { t.assert.fail('error should not be called') }
  }
  const request = {}
  const reply = { request, log }
  logDispatcher.serializerError(new Error('serializer failed'), reply, 500)
  t.assert.ok(true, 'logger was not called')
})

test('serializerError should log error with status code', t => {
  t.plan(2)
  const logDispatcher = createLogDispatcher({ disableRequestLogging: false })
  const err = new Error('serializer failed')
  const request = {}
  const reply = {
    request,
    log: {
      error: (data, msg) => {
        t.assert.strictEqual(msg, 'The serializer for the given status code failed')
        t.assert.strictEqual(data.statusCode, 500)
      }
    }
  }
  logDispatcher.serializerError(err, reply, 500)
})

test('The serializer prevent fails if the request socket is undefined', t => {
  t.plan(1)

  const serialized = serializers.req({
    method: 'GET',
    url: '/',
    socket: undefined,
    headers: {}
  })

  t.assert.deepStrictEqual(serialized, {
    method: 'GET',
    url: '/',
    version: undefined,
    host: undefined,
    remoteAddress: undefined,
    remotePort: undefined
  })
})
