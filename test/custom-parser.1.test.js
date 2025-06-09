'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const Fastify = require('../fastify')
const jsonParser = require('fast-json-body')
const { getServerUrl } = require('./helper')
const { waitForCb } = require('./toolkit')

process.removeAllListeners('warning')

test('Should have typeof body object with no custom parser defined, null body and content type = \'text/plain\'', (t, testDone) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: null,
      headers: {
        'Content-Type': 'text/plain'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(typeof body, 'object')
      fastify.close()
      testDone()
    })
  })
})

test('Should have typeof body object with no custom parser defined, undefined body and content type = \'text/plain\'', (t, testDone) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: undefined,
      headers: {
        'Content-Type': 'text/plain'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(typeof body, 'object')
      fastify.close()
      testDone()
    })
  })
})

test('Should get the body as string /1', (t, testDone) => {
  t.plan(6)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('text/plain', { parseAs: 'string' }, function (req, body, done) {
    t.assert.ok('called')
    t.assert.ok(typeof body === 'string')
    try {
      const plainText = body
      done(null, plainText)
    } catch (err) {
      err.statusCode = 400
      done(err, undefined)
    }
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: 'hello world',
      headers: {
        'Content-Type': 'text/plain'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), 'hello world')
      fastify.close()
      testDone()
    })
  })
})

test('Should get the body as string /2', (t, testDone) => {
  t.plan(6)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('text/plain/test', { parseAs: 'string' }, function (req, body, done) {
    t.assert.ok('called')
    t.assert.ok(typeof body === 'string')
    try {
      const plainText = body
      done(null, plainText)
    } catch (err) {
      err.statusCode = 400
      done(err, undefined)
    }
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: 'hello world',
      headers: {
        'Content-Type': '   text/plain/test  '
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), 'hello world')
      fastify.close()
      testDone()
    })
  })
})

test('Should get the body as buffer', (t, testDone) => {
  t.plan(6)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
    t.assert.ok('called')
    t.assert.ok(body instanceof Buffer)
    try {
      const json = JSON.parse(body)
      done(null, json)
    } catch (err) {
      err.statusCode = 400
      done(err, undefined)
    }
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), '{"hello":"world"}')
      fastify.close()
      testDone()
    })
  })
})

test('Should get the body as buffer', (t, testDone) => {
  t.plan(6)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('text/plain', { parseAs: 'buffer' }, function (req, body, done) {
    t.assert.ok('called')
    t.assert.ok(body instanceof Buffer)
    try {
      const plainText = body
      done(null, plainText)
    } catch (err) {
      err.statusCode = 400
      done(err, undefined)
    }
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: 'hello world',
      headers: {
        'Content-Type': 'text/plain'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), 'hello world')
      fastify.close()
      testDone()
    })
  })
})

test('Should parse empty bodies as a string', (t) => {
  t.plan(9)
  const fastify = Fastify()

  fastify.addContentTypeParser('text/plain', { parseAs: 'string' }, (req, body, done) => {
    t.assert.strictEqual(body, '')
    done(null, body)
  })

  fastify.route({
    method: ['POST', 'DELETE'],
    url: '/',
    handler (request, reply) {
      reply.send(request.body)
    }
  })

  const completion = waitForCb({ steps: 2 })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => { fastify.close() })

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '',
      headers: {
        'Content-Type': 'text/plain'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), '')
      completion.stepIn()
    })

    sget({
      method: 'DELETE',
      url: getServerUrl(fastify),
      body: '',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': '0'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), '')
      completion.stepIn()
    })
  })

  return completion.patience
})

test('Should parse empty bodies as a buffer', (t, testDone) => {
  t.plan(6)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('text/plain', { parseAs: 'buffer' }, function (req, body, done) {
    t.assert.ok(body instanceof Buffer)
    t.assert.strictEqual(body.length, 0)
    done(null, body)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '',
      headers: {
        'Content-Type': 'text/plain'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.length, 0)
      fastify.close()
      testDone()
    })
  })
})

test('The charset should not interfere with the content type handling', (t, testDone) => {
  t.plan(5)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/json', function (req, payload, done) {
    t.assert.ok('called')
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), '{"hello":"world"}')
      fastify.close()
      testDone()
    })
  })
})
