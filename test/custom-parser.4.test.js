'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const Fastify = require('../fastify')
const jsonParser = require('fast-json-body')
const { getServerUrl } = require('./helper')
const { waitForCb } = require('./toolkit')

process.removeAllListeners('warning')

test('should prefer string content types over RegExp ones', (t, testDone) => {
  t.plan(7)
  const fastify = Fastify()
  t.after(() => { fastify.close() })
  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser(/^application\/.*/, function (req, payload, done) {
    let data = ''
    payload.on('data', chunk => { data += chunk })
    payload.on('end', () => {
      done(null, data)
    })
  })

  fastify.addContentTypeParser('application/json', function (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    const completion = waitForCb({ steps: 2 })

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"k1":"myValue", "k2": "myValue"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.equal(body.toString(), JSON.stringify({ k1: 'myValue', k2: 'myValue' }))
      completion.stepIn()
    })

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: 'javascript',
      headers: {
        'Content-Type': 'application/javascript'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.equal(body.toString(), 'javascript')
      completion.stepIn()
    })

    completion.patience.then(testDone)
  })
})

test('removeContentTypeParser should support arrays of content types to remove', (t, testDone) => {
  t.plan(8)

  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.addContentTypeParser('application/xml', function (req, payload, done) {
    payload.on('data', () => {})
    payload.on('end', () => {
      done(null, 'xml')
    })
  })

  fastify.addContentTypeParser(/^image\/.*/, function (req, payload, done) {
    payload.on('data', () => {})
    payload.on('end', () => {
      done(null, 'image')
    })
  })

  fastify.removeContentTypeParser([/^image\/.*/, 'application/json'])

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    const completion = waitForCb({ steps: 3 })

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '<?xml version="1.0">',
      headers: {
        'Content-Type': 'application/xml'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.equal(body.toString(), 'xml')
      completion.stepIn()
    })

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '',
      headers: {
        'Content-Type': 'image/png'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 415)
      completion.stepIn()
    })

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{test: "test"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 415)
      completion.stepIn()
    })
    completion.patience.then(testDone)
  })
})

test('removeContentTypeParser should support encapsulation', (t, testDone) => {
  t.plan(6)

  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.addContentTypeParser('application/xml', function (req, payload, done) {
    payload.on('data', () => {})
    payload.on('end', () => {
      done(null, 'xml')
    })
  })

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.register(function (instance, options, done) {
    instance.removeContentTypeParser('application/xml')

    instance.post('/encapsulated', (req, reply) => {
      reply.send(req.body)
    })

    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    const completion = waitForCb({ steps: 2 })

    sget({
      method: 'POST',
      url: getServerUrl(fastify) + '/encapsulated',
      body: '<?xml version="1.0">',
      headers: {
        'Content-Type': 'application/xml'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 415)
      completion.stepIn()
    })

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '<?xml version="1.0">',
      headers: {
        'Content-Type': 'application/xml'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.equal(body.toString(), 'xml')
      completion.stepIn()
    })
    completion.patience.then(testDone)
  })
})

test('removeAllContentTypeParsers should support encapsulation', (t, testDone) => {
  t.plan(6)

  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.register(function (instance, options, done) {
    instance.removeAllContentTypeParsers()

    instance.post('/encapsulated', (req, reply) => {
      reply.send(req.body)
    })

    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    const completion = waitForCb({ steps: 2 })

    sget({
      method: 'POST',
      url: getServerUrl(fastify) + '/encapsulated',
      body: '{}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 415)
      completion.stepIn()
    })

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"test":1}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.equal(JSON.parse(body.toString()).test, 1)
      completion.stepIn()
    })
    completion.patience.then(testDone)
  })
})
