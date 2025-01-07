'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const Fastify = require('..')
const jsonParser = require('fast-json-body')
const { getServerUrl } = require('./helper')

process.removeAllListeners('warning')

test('should be able to use default parser for extra content type', (t, done) => {
  t.plan(4)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.post('/', (request, reply) => {
    reply.send(request.body)
  })

  fastify.addContentTypeParser('text/json', { parseAs: 'string' }, fastify.getDefaultJsonParser('ignore', 'ignore'))

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'text/json'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(JSON.parse(body.toString()), { hello: 'world' })
      done()
    })
  })
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

  fastify.listen({ port: 0 }, async err => {
    t.assert.ifError(err)

    await t.test('in POST', (t, done) => {
      t.plan(3)
      t.after(() => fastify.close())

      sget({
        method: 'POST',
        url: getServerUrl(fastify),
        body: '{"hello":"world"}',
        headers: {
          'Content-Type': 'application/vnd.test+json'
        }
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.deepStrictEqual(body.toString(), JSON.stringify({ hello: 'world' }))
        done()
      })
    })

    await t.test('in OPTIONS', (t, done) => {
      t.plan(3)
      t.after(() => fastify.close())

      sget({
        method: 'OPTIONS',
        url: getServerUrl(fastify),
        body: '{"hello":"world"}',
        headers: {
          'Content-Type': 'weird/content-type+json'
        }
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.deepStrictEqual(body.toString(), JSON.stringify({ hello: 'world' }))
        done()
      })
    })
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
      body: '{"hello":"world"}',
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
      body: '{"hello":"world"}',
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

test('catch all content type parser should not interfere with content type parser', (t, done) => {
  t.plan(10)
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

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    let pending = 3

    function completed () {
      if (--pending === 0) {
        done()
      }
    }

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"myKey":"myValue"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(body.toString(), JSON.stringify({ myKey: 'myValue' }))
      completed()
    })

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: 'body',
      headers: {
        'Content-Type': 'very-weird-content-type'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(body.toString(), 'body')
      completed()
    })

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: 'my text',
      headers: {
        'Content-Type': 'text/html'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(body.toString(), 'my texthtml')
      completed()
    })
  })
})
