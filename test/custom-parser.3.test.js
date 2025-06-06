'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const jsonParser = require('fast-json-body')

process.removeAllListeners('warning')

test('should be able to use default parser for extra content type', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.post('/', (request, reply) => {
    reply.send(request.body)
  })

  fastify.addContentTypeParser('text/json', { parseAs: 'string' }, fastify.getDefaultJsonParser('ignore', 'ignore'))

  const fastifyServer = await fastify.listen({ port: 0 })

  const result = await fetch(fastifyServer, {
    method: 'POST',
    body: JSON.stringify({ hello: 'world' }),
    headers: {
      'Content-Type': 'text/json'
    }
  })

  t.assert.ok(result.ok)
  t.assert.deepStrictEqual(await result.json(), { hello: 'world' })
})

test('contentTypeParser should add a custom parser with RegExp value', async (t) => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.options('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser(/.*\+json$/, function (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  const fastifyServer = await fastify.listen({ port: 0 })

  await t.test('in POST', async (t) => {
    t.plan(2)

    const result = await fetch(fastifyServer, {
      method: 'POST',
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/vnd.test+json'
      }
    })

    t.assert.ok(result.ok)
    t.assert.deepStrictEqual(await result.text(), JSON.stringify({ hello: 'world' }))
  })

  await t.test('in OPTIONS', async (t) => {
    t.plan(2)

    const result = await fetch(fastifyServer, {
      method: 'OPTIONS',
      body: JSON.stringify({ hello: 'world' }),
      headers: {
        'Content-Type': 'weird/content-type+json'
      }
    })

    t.assert.ok(result.ok)
    t.assert.deepStrictEqual(await result.text(), JSON.stringify({ hello: 'world' }))
  })
})

test('contentTypeParser should add multiple custom parsers with RegExp values', async t => {
  t.plan(6)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser(/.*\+json$/, function (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.addContentTypeParser(/.*\+xml$/, function (req, payload, done) {
    done(null, 'xml')
  })

  fastify.addContentTypeParser(/.*\+myExtension$/i, function (req, payload, done) {
    let data = ''
    payload.on('data', chunk => { data += chunk })
    payload.on('end', () => {
      done(null, data + 'myExtension')
    })
  })

  await fastify.ready()

  {
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      body: JSON.stringify({ hello: 'world' }),
      headers: {
        'Content-Type': 'application/vnd.hello+json'
      }
    })
    t.assert.strictEqual(response.statusCode, 200)
    t.assert.deepStrictEqual(response.payload.toString(), '{"hello":"world"}')
  }

  {
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      body: JSON.stringify({ hello: 'world' }),
      headers: {
        'Content-Type': 'application/test+xml'
      }
    })
    t.assert.strictEqual(response.statusCode, 200)
    t.assert.deepStrictEqual(response.payload.toString(), 'xml')
  }

  await fastify.inject({
    method: 'POST',
    path: '/',
    payload: 'abcdefg',
    headers: {
      'Content-Type': 'application/+myExtension'
    }
  }).then((response) => {
    t.assert.strictEqual(response.statusCode, 200)
    t.assert.deepStrictEqual(response.payload.toString(), 'abcdefgmyExtension')
  }).catch((err) => {
    t.assert.ifError(err)
  })
})

test('catch all content type parser should not interfere with content type parser', async (t) => {
  t.plan(6)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('*', function (req, payload, done) {
    let data = ''
    payload.on('data', chunk => { data += chunk })
    payload.on('end', () => {
      done(null, data)
    })
  })

  fastify.addContentTypeParser(/^application\/.*/, function (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.addContentTypeParser('text/html', function (req, payload, done) {
    let data = ''
    payload.on('data', chunk => { data += chunk })
    payload.on('end', () => {
      done(null, data + 'html')
    })
  })

  const fastifyServer = await fastify.listen({ port: 0 })

  const result1 = await fetch(fastifyServer, {
    method: 'POST',
    body: '{"myKey":"myValue"}',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  t.assert.ok(result1.ok)
  t.assert.deepStrictEqual(await result1.text(), JSON.stringify({ myKey: 'myValue' }))

  const result2 = await fetch(fastifyServer, {
    method: 'POST',
    body: 'body',
    headers: {
      'Content-Type': 'very-weird-content-type'
    }
  })

  t.assert.ok(result2.ok)
  t.assert.deepStrictEqual(await result2.text(), 'body')

  const result3 = await fetch(fastifyServer, {
    method: 'POST',
    body: 'my text',
    headers: {
      'Content-Type': 'text/html'
    }
  })

  t.assert.ok(result3.ok)
  t.assert.deepStrictEqual(await result3.text(), 'my texthtml')
})
