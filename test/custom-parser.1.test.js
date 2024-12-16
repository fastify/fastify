'use strict'

const { test } = require('node:test')
// const test = t.test
const sget = require('simple-get').concat
const Fastify = require('../fastify')
const jsonParser = require('fast-json-body')
const { getServerUrl } = require('./helper')

process.removeAllListeners('warning')

test('Should have typeof body object with no custom parser defined, null body and content type = \'text/plain\'', async t => {
  // t.plan(4)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  try {
    await fastify.listen({ port: 0 })
    t.after(() => fastify.close())

    await new Promise((resolve, reject) => {
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
        resolve()
      })
    })
  } catch (err) {
    t.assert.ifError(err)
  }
})

test('Should have typeof body object with no custom parser defined, undefined body and content type = \'text/plain\'', async t => {
  // t.plan(4)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  try {
    await fastify.listen({ port: 0 })
    t.after(() => fastify.close())

    await new Promise((resolve, reject) => {
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
        resolve()
      })
    })
  } catch (err) {
    t.assert.ifError(err)
  }
})

test('Should get the body as string /1', async t => {
  // t.plan(6)
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
  try {
    await fastify.listen({ port: 0 })
    t.after(() => fastify.close())

    await new Promise((resolve, reject) => {
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
        resolve()
      })
    })
  } catch (err) {
    t.assert.ifError(err)
  }
})

test('Should get the body as string /2', async t => {
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

  try {
    await fastify.listen({ port: 0 })
    t.after(() => fastify.close())

    await new Promise((resolve, reject) => {
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
        resolve()
      })
    })
  } catch (err) {
    t.assert.ifError(err)
  }
})

test('Should get the body as buffer', async t => {
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

  try {
    await fastify.listen({ port: 0 })
    t.after(() => fastify.close())

    await new Promise((resolve, reject) => {
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
        resolve()
      })
    })
  } catch (err) {
    t.assert.ifError(err)
  }
})

test('Should get the body as buffer', async t => {
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

  try {
    await fastify.listen({ port: 0 })

    t.after(() => fastify.close())
    await new Promise((resolve, reject) => {
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
        resolve()
      })
    })
  } catch (err) {
    t.assert.ifError(err)
  }
})

test('Should parse empty bodies as a string', async t => {
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

  try {
    await fastify.listen({ port: 0 })
    t.after(() => fastify.close())

    await new Promise((resolve, reject) => {
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
        resolve()
      })
    })

    await new Promise((resolve, reject) => {
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
        resolve()
      })
    })
  } catch (err) {
    t.assert.ifError(err)
  }
})

test('Should parse empty bodies as a buffer', async t => {
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('text/plain', { parseAs: 'buffer' }, function (req, body, done) {
    t.assert.ok(body instanceof Buffer)
    t.assert.strictEqual(body.length, 0)
    done(null, body)
  })

  try {
    await fastify.listen({ port: 0 })
    t.after(() => fastify.close())

    await new Promise((resolve, reject) => {
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
        resolve()
      })
    })
  } catch (err) {
    t.assert.ifError(err)
  }
})

test('The charset should not interfere with the content type handling', async t => {
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

  try {
    await fastify.listen({ port: 0 })
    t.after(() => fastify.close())
    await new Promise((resolve, reject) => {
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
        resolve()
      })
    })
  } catch (err) {
    t.assert.ifError(err)
  }
})
