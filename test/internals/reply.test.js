'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const http = require('node:http')
const NotFound = require('http-errors').NotFound
const Request = require('../../lib/request')
const Reply = require('../../lib/reply')
const Fastify = require('../..')
const { Readable, Writable } = require('node:stream')
const {
  kReplyErrorHandlerCalled,
  kReplyHeaders,
  kReplySerializer,
  kReplyIsError,
  kReplySerializerDefault,
  kRouteContext
} = require('../../lib/symbols')
const fs = require('node:fs')
const path = require('node:path')

const agent = new http.Agent({ keepAlive: false })

const doGet = function (url) {
  return new Promise((resolve, reject) => {
    sget({ method: 'GET', url, followRedirects: false, agent }, (err, response, body) => {
      if (err) {
        reject(err)
      } else {
        resolve({ response, body })
      }
    })
  })
}

test('Once called, Reply should return an object with methods', t => {
  t.plan(15)
  const response = { res: 'res' }
  const context = { config: { onSend: [] }, schema: {}, _parserOptions: {}, server: { hasConstraintStrategy: () => false, initialConfig: {} } }
  const request = new Request(null, null, null, null, null, context)
  const reply = new Reply(response, request)
  t.assert.strictEqual(typeof reply, 'object')
  t.assert.strictEqual(typeof reply[kReplyIsError], 'boolean')
  t.assert.strictEqual(typeof reply[kReplyErrorHandlerCalled], 'boolean')
  t.assert.strictEqual(typeof reply.send, 'function')
  t.assert.strictEqual(typeof reply.code, 'function')
  t.assert.strictEqual(typeof reply.status, 'function')
  t.assert.strictEqual(typeof reply.header, 'function')
  t.assert.strictEqual(typeof reply.serialize, 'function')
  t.assert.strictEqual(typeof reply[kReplyHeaders], 'object')
  t.assert.deepStrictEqual(reply.raw, response)
  t.assert.strictEqual(reply[kRouteContext], context)
  t.assert.strictEqual(reply.routeOptions.config, context.config)
  t.assert.strictEqual(reply.routeOptions.schema, context.schema)
  t.assert.strictEqual(reply.request, request)
  // Aim to not bad property keys (including Symbols)
  t.assert.ok(!('undefined' in reply))
})

test('reply.send will logStream error and destroy the stream', t => {
  t.plan(1)
  let destroyCalled
  const payload = new Readable({
    read () { },
    destroy (err, cb) {
      destroyCalled = true
      cb(err)
    }
  })

  const response = new Writable()
  Object.assign(response, {
    setHeader: () => { },
    hasHeader: () => false,
    getHeader: () => undefined,
    writeHead: () => { },
    write: () => { },
    headersSent: true
  })

  const log = {
    warn: () => { }
  }

  const reply = new Reply(response, { [kRouteContext]: { onSend: null } }, log)
  reply.send(payload)
  payload.destroy(new Error('stream error'))

  t.assert.strictEqual(destroyCalled, true, 'Error not logged and not streamed')
})

test('reply.send throw with circular JSON', t => {
  t.plan(1)
  const response = {
    setHeader: () => { },
    hasHeader: () => false,
    getHeader: () => undefined,
    writeHead: () => { },
    write: () => { },
    end: () => { }
  }
  const reply = new Reply(response, { [kRouteContext]: { onSend: [] } })
  t.assert.throws(() => {
    const obj = {}
    obj.obj = obj
    reply.send(JSON.stringify(obj))
  }, 'Converting circular structure to JSON')
})

test('reply.send returns itself', t => {
  t.plan(1)
  const response = {
    setHeader: () => { },
    hasHeader: () => false,
    getHeader: () => undefined,
    writeHead: () => { },
    write: () => { },
    end: () => { }
  }
  const reply = new Reply(response, { [kRouteContext]: { onSend: [] } })
  t.assert.strictEqual(reply.send('hello'), reply)
})

test('reply.serializer should set a custom serializer', t => {
  t.plan(2)
  const reply = new Reply(null, null, null)
  t.assert.strictEqual(reply[kReplySerializer], null)
  reply.serializer('serializer')
  t.assert.strictEqual(reply[kReplySerializer], 'serializer')
})

test('reply.serializer should support running preSerialization hooks', (t, done) => {
  t.plan(3)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.addHook('preSerialization', async (request, reply, payload) => { t.assert.ok('called', 'preSerialization') })
  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply
        .type('application/json')
        .serializer(JSON.stringify)
        .send({ foo: 'bar' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.payload, '{"foo":"bar"}')
    done()
  })
})

test('reply.serialize should serialize payload', t => {
  t.plan(1)
  const response = { statusCode: 200 }
  const context = {}
  const reply = new Reply(response, { [kRouteContext]: context })
  t.assert.strictEqual(reply.serialize({ foo: 'bar' }), '{"foo":"bar"}')
})

test('reply.serialize should serialize payload with a custom serializer', t => {
  t.plan(2)
  let customSerializerCalled = false
  const response = { statusCode: 200 }
  const context = {}
  const reply = new Reply(response, { [kRouteContext]: context })
  reply.serializer((x) => (customSerializerCalled = true) && JSON.stringify(x))
  t.assert.strictEqual(reply.serialize({ foo: 'bar' }), '{"foo":"bar"}')
  t.assert.strictEqual(customSerializerCalled, true, 'custom serializer not called')
})

test('reply.serialize should serialize payload with a context default serializer', t => {
  t.plan(2)
  let customSerializerCalled = false
  const response = { statusCode: 200 }
  const context = { [kReplySerializerDefault]: (x) => (customSerializerCalled = true) && JSON.stringify(x) }
  const reply = new Reply(response, { [kRouteContext]: context })
  t.assert.strictEqual(reply.serialize({ foo: 'bar' }), '{"foo":"bar"}')
  t.assert.strictEqual(customSerializerCalled, true, 'custom serializer not called')
})

test('reply.serialize should serialize payload with Fastify instance', (t, done) => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            foo: { type: 'string' }
          }
        }
      }
    },
    handler: (req, reply) => {
      reply.send(
        reply.serialize({ foo: 'bar' })
      )
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.payload, '{"foo":"bar"}')
    done()
  })
})

test('within an instance', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.get('/', function (req, reply) {
    reply.code(200)
    reply.header('Content-Type', 'text/plain')
    reply.send('hello world!')
  })

  fastify.get('/auto-type', function (req, reply) {
    reply.code(200)
    reply.type('text/plain')
    reply.send('hello world!')
  })

  fastify.get('/auto-status-code', function (req, reply) {
    reply.send('hello world!')
  })

  fastify.get('/redirect', function (req, reply) {
    reply.redirect('/')
  })

  fastify.get('/redirect-async', async function (req, reply) {
    return reply.redirect('/')
  })

  fastify.get('/redirect-code', function (req, reply) {
    reply.redirect('/', 301)
  })

  fastify.get('/redirect-code-before-call', function (req, reply) {
    reply.code(307).redirect('/')
  })

  fastify.get('/redirect-code-before-call-overwrite', function (req, reply) {
    reply.code(307).redirect('/', 302)
  })

  fastify.get('/custom-serializer', function (req, reply) {
    reply.code(200)
    reply.type('text/plain')
    reply.serializer(function (body) {
      return require('node:querystring').stringify(body)
    })
    reply.send({ hello: 'world!' })
  })

  fastify.register(function (instance, options, done) {
    fastify.addHook('onSend', function (req, reply, payload, done) {
      reply.header('x-onsend', 'yes')
      done()
    })
    fastify.get('/redirect-onsend', function (req, reply) {
      reply.redirect('/')
    })
    done()
  })

  await fastify.listen({ port: 0 })

  await t.test('custom serializer should be used', (t, done) => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/custom-serializer'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['content-type'], 'text/plain')
      t.assert.deepStrictEqual(body.toString(), 'hello=world!')
      done()
    })
  })

  await t.test('status code and content-type should be correct', (t, done) => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-type'], 'text/plain')
      t.assert.deepStrictEqual(body.toString(), 'hello world!')
      done()
    })
  })

  await t.test('auto status code should be 200', (t, done) => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/auto-status-code'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(body.toString(), 'hello world!')
      done()
    })
  })

  await t.test('auto type should be text/plain', (t, done) => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/auto-type'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['content-type'], 'text/plain')
      t.assert.deepStrictEqual(body.toString(), 'hello world!')
      done()
    })
  })

  await t.test('redirect to `/` - 1', (t, done) => {
    t.plan(1)

    http.get('http://127.0.0.1:' + fastify.server.address().port + '/redirect', function (response) {
      t.assert.strictEqual(response.statusCode, 302)
      done()
    })
  })

  await t.test('redirect to `/` - 2', (t, done) => {
    t.plan(1)

    http.get('http://127.0.0.1:' + fastify.server.address().port + '/redirect-code', function (response) {
      t.assert.strictEqual(response.statusCode, 301)
      done()
    })
  })

  await t.test('redirect to `/` - 3', (t, done) => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/redirect'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-type'], 'text/plain')
      t.assert.deepStrictEqual(body.toString(), 'hello world!')
      done()
    })
  })

  await t.test('redirect to `/` - 4', (t, done) => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/redirect-code'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-type'], 'text/plain')
      t.assert.deepStrictEqual(body.toString(), 'hello world!')
      done()
    })
  })

  await t.test('redirect to `/` - 5', (t, done) => {
    t.plan(3)
    const url = 'http://127.0.0.1:' + fastify.server.address().port + '/redirect-onsend'
    http.get(url, (response) => {
      t.assert.strictEqual(response.headers['x-onsend'], 'yes')
      t.assert.strictEqual(response.headers['content-length'], '0')
      t.assert.strictEqual(response.headers.location, '/')
      done()
    })
  })

  await t.test('redirect to `/` - 6', (t, done) => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/redirect-code-before-call'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-type'], 'text/plain')
      t.assert.deepStrictEqual(body.toString(), 'hello world!')
      done()
    })
  })

  await t.test('redirect to `/` - 7', (t, done) => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/redirect-code-before-call-overwrite'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-type'], 'text/plain')
      t.assert.deepStrictEqual(body.toString(), 'hello world!')
      done()
    })
  })

  await t.test('redirect to `/` - 8', (t, done) => {
    t.plan(1)

    http.get('http://127.0.0.1:' + fastify.server.address().port + '/redirect-code-before-call', function (response) {
      t.assert.strictEqual(response.statusCode, 307)
      done()
    })
  })

  await t.test('redirect to `/` - 9', (t, done) => {
    t.plan(1)

    http.get('http://127.0.0.1:' + fastify.server.address().port + '/redirect-code-before-call-overwrite', function (response) {
      t.assert.strictEqual(response.statusCode, 302)
      done()
    })
  })

  await t.test('redirect with async function to `/` - 10', (t, done) => {
    t.plan(1)

    http.get('http://127.0.0.1:' + fastify.server.address().port + '/redirect-async', function (response) {
      t.assert.strictEqual(response.statusCode, 302)
      done()
    })
  })
})

test('buffer without content type should send a application/octet-stream and raw buffer', (t, done) => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send(Buffer.alloc(1024))
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['content-type'], 'application/octet-stream')
      t.assert.deepStrictEqual(body, Buffer.alloc(1024))
      done()
    })
  })
})

test('Uint8Array without content type should send a application/octet-stream and raw buffer', (t, done) => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send(new Uint8Array(1024).fill(0xff))
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    fastify.inject({
      method: 'GET',
      url: '/'
    }, (err, response) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['content-type'], 'application/octet-stream')
      t.assert.deepStrictEqual(new Uint8Array(response.rawPayload), new Uint8Array(1024).fill(0xff))
      done()
    })
  })
})
test('Uint16Array without content type should send a application/octet-stream and raw buffer', (t, done) => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send(new Uint16Array(50).fill(0xffffffff))
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    fastify.inject({
      method: 'GET',
      url: '/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.headers['content-type'], 'application/octet-stream')
      t.assert.deepStrictEqual(new Uint16Array(res.rawPayload.buffer, res.rawPayload.byteOffset, res.rawPayload.byteLength / Uint16Array.BYTES_PER_ELEMENT), new Uint16Array(50).fill(0xffffffff))
      done()
    })
  })
})
test('TypedArray with content type should not send application/octet-stream', (t, done) => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.header('Content-Type', 'text/plain')
    reply.send(new Uint16Array(1024).fill(0xffffffff))
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    fastify.inject({
      method: 'GET',
      url: '/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.headers['content-type'], 'text/plain')
      t.assert.deepStrictEqual(new Uint16Array(res.rawPayload.buffer, res.rawPayload.byteOffset, res.rawPayload.byteLength / Uint16Array.BYTES_PER_ELEMENT), new Uint16Array(1024).fill(0xffffffff))
      done()
    })
  })
})
test('buffer with content type should not send application/octet-stream', (t, done) => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.header('Content-Type', 'text/plain')
    reply.send(Buffer.alloc(1024))
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['content-type'], 'text/plain')
      t.assert.deepStrictEqual(body, Buffer.alloc(1024))
      done()
    })
  })
})

test('stream with content type should not send application/octet-stream', (t, done) => {
  t.plan(4)

  const fastify = Fastify()

  const streamPath = path.join(__dirname, '..', '..', 'package.json')
  const stream = fs.createReadStream(streamPath)
  const buf = fs.readFileSync(streamPath)

  fastify.get('/', function (req, reply) {
    reply.header('Content-Type', 'text/plain').send(stream)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['content-type'], 'text/plain')
      t.assert.deepStrictEqual(body, buf)
      done()
    })
  })
})

test('stream without content type should not send application/octet-stream', (t, done) => {
  t.plan(4)

  const fastify = Fastify()

  const stream = fs.createReadStream(__filename)
  const buf = fs.readFileSync(__filename)

  fastify.get('/', function (req, reply) {
    reply.send(stream)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['content-type'], undefined)
      t.assert.deepStrictEqual(body, buf)
      done()
    })
  })
})

test('stream using reply.raw.writeHead should return customize headers', (t, done) => {
  t.plan(6)

  const fastify = Fastify()
  const fs = require('node:fs')
  const path = require('node:path')

  const streamPath = path.join(__dirname, '..', '..', 'package.json')
  const stream = fs.createReadStream(streamPath)
  const buf = fs.readFileSync(streamPath)

  fastify.get('/', function (req, reply) {
    reply.log.warn = function mockWarn (message) {
      t.assert.strictEqual(message, 'response will send, but you shouldn\'t use res.writeHead in stream mode')
    }
    reply.raw.writeHead(200, {
      location: '/'
    })
    reply.send(stream)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers.location, '/')
      t.assert.strictEqual(response.headers['Content-Type'], undefined)
      t.assert.deepStrictEqual(body, buf)
      done()
    })
  })
})

test('plain string without content type should send a text/plain', (t, done) => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send('hello world!')
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['content-type'], 'text/plain; charset=utf-8')
      t.assert.deepStrictEqual(body.toString(), 'hello world!')
      done()
    })
  })
})

test('plain string with content type should be sent unmodified', (t, done) => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.type('text/css').send('hello world!')
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['content-type'], 'text/css')
      t.assert.deepStrictEqual(body.toString(), 'hello world!')
      done()
    })
  })
})

test('plain string with content type and custom serializer should be serialized', (t, done) => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply
      .serializer(() => 'serialized')
      .type('text/css')
      .send('hello world!')
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['content-type'], 'text/css')
      t.assert.deepStrictEqual(body.toString(), 'serialized')
      done()
    })
  })
})

test('plain string with content type application/json should NOT be serialized as json', (t, done) => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.type('application/json').send('{"key": "hello world!"}')
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
      t.assert.deepStrictEqual(body.toString(), '{"key": "hello world!"}')
      done()
    })
  })
})

test('plain string with custom json content type should NOT be serialized as json', async t => {
  t.plan(12)

  const fastify = Fastify()

  t.after(() => fastify.close())

  const customSamples = {
    collectionjson: {
      mimeType: 'application/vnd.collection+json',
      sample: '{"collection":{"version":"1.0","href":"http://api.example.com/people/"}}'
    },
    hal: {
      mimeType: 'application/hal+json',
      sample: '{"_links":{"self":{"href":"https://api.example.com/people/1"}},"name":"John Doe"}'
    },
    jsonapi: {
      mimeType: 'application/vnd.api+json',
      sample: '{"data":{"type":"people","id":"1"}}'
    },
    jsonld: {
      mimeType: 'application/ld+json',
      sample: '{"@context":"https://json-ld.org/contexts/person.jsonld","name":"John Doe"}'
    },
    ndjson: {
      mimeType: 'application/x-ndjson',
      sample: '{"a":"apple","b":{"bb":"bubble"}}\n{"c":"croissant","bd":{"dd":"dribble"}}'
    },
    siren: {
      mimeType: 'application/vnd.siren+json',
      sample: '{"class":"person","properties":{"name":"John Doe"}}'
    }
  }

  Object.keys(customSamples).forEach((path) => {
    fastify.get(`/${path}`, function (req, reply) {
      reply.type(customSamples[path].mimeType).send(customSamples[path].sample)
    })
  })

  await fastify.listen({ port: 0 })

  await Promise.all(Object.keys(customSamples).map(path => {
    return new Promise((resolve, reject) => {
      sget({
        method: 'GET',
        url: 'http://127.0.0.1:' + fastify.server.address().port + '/' + path
      }, (err, response, body) => {
        if (err) {
          reject(err)
        }
        t.assert.strictEqual(response.headers['content-type'], customSamples[path].mimeType + '; charset=utf-8')
        t.assert.deepStrictEqual(body.toString(), customSamples[path].sample)
        resolve()
      })
    })
  }))
})

test('non-string with content type application/json SHOULD be serialized as json', (t, done) => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.type('application/json').send({ key: 'hello world!' })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
      t.assert.deepStrictEqual(body.toString(), JSON.stringify({ key: 'hello world!' }))
      done()
    })
  })
})

test('non-string with custom json\'s content-type SHOULD be serialized as json', (t, done) => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.type('application/json; version=2; ').send({ key: 'hello world!' })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['content-type'], 'application/json; version=2; charset=utf-8')
      t.assert.deepStrictEqual(body.toString(), JSON.stringify({ key: 'hello world!' }))
      done()
    })
  })
})

test('non-string with custom json content type SHOULD be serialized as json', async t => {
  t.plan(10)

  const fastify = Fastify()
  t.after(() => fastify.close())

  const customSamples = {
    collectionjson: {
      mimeType: 'application/vnd.collection+json',
      sample: JSON.parse('{"collection":{"version":"1.0","href":"http://api.example.com/people/"}}')
    },
    hal: {
      mimeType: 'application/hal+json',
      sample: JSON.parse('{"_links":{"self":{"href":"https://api.example.com/people/1"}},"name":"John Doe"}')
    },
    jsonapi: {
      mimeType: 'application/vnd.api+json',
      sample: JSON.parse('{"data":{"type":"people","id":"1"}}')
    },
    jsonld: {
      mimeType: 'application/ld+json',
      sample: JSON.parse('{"@context":"https://json-ld.org/contexts/person.jsonld","name":"John Doe"}')
    },
    siren: {
      mimeType: 'application/vnd.siren+json',
      sample: JSON.parse('{"class":"person","properties":{"name":"John Doe"}}')
    }
  }

  Object.keys(customSamples).forEach((path) => {
    fastify.get(`/${path}`, function (req, reply) {
      reply.type(customSamples[path].mimeType).send(customSamples[path].sample)
    })
  })

  await fastify.listen({ port: 0 })

  await Promise.all(Object.keys(customSamples).map(path => {
    return new Promise((resolve, reject) => {
      sget({
        method: 'GET',
        url: 'http://127.0.0.1:' + fastify.server.address().port + '/' + path
      }, (err, response, body) => {
        if (err) {
          reject(err)
        }
        t.assert.strictEqual(response.headers['content-type'], customSamples[path].mimeType + '; charset=utf-8')
        t.assert.deepStrictEqual(body.toString(), JSON.stringify(customSamples[path].sample))
        resolve()
      })
    })
  }))
})

test('error object with a content type that is not application/json should work', async t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/text', function (req, reply) {
    reply.type('text/plain')
    reply.send(new Error('some application error'))
  })

  fastify.get('/html', function (req, reply) {
    reply.type('text/html')
    reply.send(new Error('some application error'))
  })

  {
    const res = await fastify.inject({
      method: 'GET',
      url: '/text'
    })
    t.assert.strictEqual(res.statusCode, 500)
    t.assert.strictEqual(JSON.parse(res.payload).message, 'some application error')
  }

  {
    const res = await fastify.inject({
      method: 'GET',
      url: '/html'
    })
    t.assert.strictEqual(res.statusCode, 500)
    t.assert.strictEqual(JSON.parse(res.payload).message, 'some application error')
  }
})

test('undefined payload should be sent as-is', (t, done) => {
  t.plan(6)

  const fastify = Fastify()

  fastify.addHook('onSend', function (request, reply, payload, done) {
    t.assert.strictEqual(payload, undefined)
    done()
  })

  fastify.get('/', function (req, reply) {
    reply.code(204).send()
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'GET',
      url: `http://127.0.0.1:${fastify.server.address().port}`
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['content-type'], undefined)
      t.assert.strictEqual(response.headers['content-length'], undefined)
      t.assert.strictEqual(body.length, 0)
      done()
    })
  })
})

test('for HEAD method, no body should be sent but content-length should be', async t => {
  t.plan(8)

  const fastify = Fastify()
  t.after(() => fastify.close())
  const contentType = 'application/json; charset=utf-8'
  const bodySize = JSON.stringify({ foo: 'bar' }).length

  fastify.head('/', {
    onSend: function (request, reply, payload, done) {
      t.assert.strictEqual(payload, undefined)
      done()
    }
  }, function (req, reply) {
    reply.header('content-length', bodySize)
    reply.header('content-type', contentType)
    reply.code(200).send()
  })

  fastify.head('/with/null', {
    onSend: function (request, reply, payload, done) {
      t.assert.strictEqual(payload, 'null')
      done()
    }
  }, function (req, reply) {
    reply.header('content-length', bodySize)
    reply.header('content-type', contentType)
    reply.code(200).send(null)
  })

  await fastify.listen({ port: 0 })

  const promise1 = new Promise((resolve, reject) => {
    sget({
      method: 'HEAD',
      url: `http://127.0.0.1:${fastify.server.address().port}`
    }, (err, response, body) => {
      if (err) {
        reject(err)
      }
      t.assert.strictEqual(response.headers['content-type'], contentType)
      t.assert.strictEqual(response.headers['content-length'], bodySize.toString())
      t.assert.strictEqual(body.length, 0)
      resolve()
    })
  })

  const promise2 = new Promise((resolve, reject) => {
    sget({
      method: 'HEAD',
      url: `http://127.0.0.1:${fastify.server.address().port}/with/null`
    }, (err, response, body) => {
      if (err) {
        reject(err)
      }
      t.assert.strictEqual(response.headers['content-type'], contentType)
      t.assert.strictEqual(response.headers['content-length'], bodySize.toString())
      t.assert.strictEqual(body.length, 0)
      resolve()
    })
  })

  await Promise.all([promise1, promise2])
})

test('reply.send(new NotFound()) should not invoke the 404 handler', async t => {
  t.plan(6)

  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.setNotFoundHandler((req, reply) => {
    t.fail('Should not be called')
  })

  fastify.get('/not-found', function (req, reply) {
    reply.send(new NotFound())
  })

  fastify.register(function (instance, options, done) {
    instance.get('/not-found', function (req, reply) {
      reply.send(new NotFound())
    })

    done()
  }, { prefix: '/prefixed' })

  await fastify.listen({ port: 0 })

  const promise1 = new Promise((resolve, reject) => {
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/not-found'
    }, (err, response, body) => {
      if (err) {
        reject(err)
      }
      t.assert.strictEqual(response.statusCode, 404)
      t.assert.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
      t.assert.deepStrictEqual(JSON.parse(body.toString()), {
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found'
      })
      resolve()
    })
  })

  const promise2 = new Promise((resolve, reject) => {
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/prefixed/not-found'
    }, (err, response, body) => {
      if (err) {
        reject(err)
      }
      t.assert.strictEqual(response.statusCode, 404)
      t.assert.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
      t.assert.deepStrictEqual(JSON.parse(body.toString()), {
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found'
      })
      resolve()
    })
  })

  await Promise.all([promise1, promise2])
})

test('reply can set multiple instances of same header', (t, done) => {
  t.plan(4)

  const fastify = require('../../')()

  fastify.get('/headers', function (req, reply) {
    reply
      .header('set-cookie', 'one')
      .header('set-cookie', 'two')
      .send({})
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/headers'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.ok(response.headers['set-cookie'])
      t.assert.deepStrictEqual(response.headers['set-cookie'], ['one', 'two'])
      done()
    })
  })
})

test('reply.hasHeader returns correct values', (t, done) => {
  t.plan(3)

  const fastify = require('../../')()

  fastify.get('/headers', function (req, reply) {
    reply.header('x-foo', 'foo')
    t.assert.strictEqual(reply.hasHeader('x-foo'), true)
    t.assert.strictEqual(reply.hasHeader('x-bar'), false)
    reply.send()
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/headers'
    }, () => {
      done()
    })
  })
})

test('reply.getHeader returns correct values', (t, done) => {
  t.plan(5)

  const fastify = require('../../')()

  fastify.get('/headers', function (req, reply) {
    reply.header('x-foo', 'foo')
    t.assert.strictEqual(reply.getHeader('x-foo'), 'foo')

    reply.header('x-foo', 'bar')
    t.assert.deepStrictEqual(reply.getHeader('x-foo'), 'bar')

    reply.header('x-foo', 42)
    t.assert.deepStrictEqual(reply.getHeader('x-foo'), 42)

    reply.header('set-cookie', 'one')
    reply.header('set-cookie', 'two')
    t.assert.deepStrictEqual(reply.getHeader('set-cookie'), ['one', 'two'])

    reply.send()
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/headers'
    }, () => {
      done()
    })
  })
})

test('reply.getHeader returns raw header if there is not in the reply headers', (t) => {
  t.plan(1)
  const response = {
    setHeader: () => { },
    hasHeader: () => true,
    getHeader: () => 'bar',
    writeHead: () => { },
    end: () => { }
  }
  const reply = new Reply(response, { onSend: [] }, null)
  t.assert.strictEqual(reply.getHeader('foo'), 'bar')
})

test('reply.getHeaders returns correct values', (t, done) => {
  t.plan(3)

  const fastify = require('../../')()

  fastify.get('/headers', function (req, reply) {
    reply.header('x-foo', 'foo')

    t.assert.deepStrictEqual(reply.getHeaders(), {
      'x-foo': 'foo'
    })

    reply.header('x-bar', 'bar')
    reply.raw.setHeader('x-foo', 'foo2')
    reply.raw.setHeader('x-baz', 'baz')

    t.assert.deepStrictEqual(reply.getHeaders(), {
      'x-foo': 'foo',
      'x-bar': 'bar',
      'x-baz': 'baz'
    })

    reply.send()
  })

  fastify.inject('/headers', (err) => {
    t.assert.ifError(err)
    done()
  })
})

test('reply.removeHeader can remove the value', (t, done) => {
  t.plan(4)

  const fastify = require('../../')()

  t.after(() => fastify.close())

  fastify.get('/headers', function (req, reply) {
    reply.header('x-foo', 'foo')
    t.assert.strictEqual(reply.getHeader('x-foo'), 'foo')

    t.assert.strictEqual(reply.removeHeader('x-foo'), reply)
    t.assert.deepStrictEqual(reply.getHeader('x-foo'), undefined)

    reply.send()
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/headers'
    }, () => {
      done()
    })
  })
})

test('reply.header can reset the value', (t, done) => {
  t.plan(2)

  const fastify = require('../../')()

  t.after(() => fastify.close())

  fastify.get('/headers', function (req, reply) {
    reply.header('x-foo', 'foo')
    reply.header('x-foo', undefined)
    t.assert.deepStrictEqual(reply.getHeader('x-foo'), '')

    reply.send()
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/headers'
    }, () => {
      done()
    })
  })
})

// https://github.com/fastify/fastify/issues/3030
test('reply.hasHeader computes raw and fastify headers', (t, done) => {
  t.plan(3)

  const fastify = require('../../')()

  t.after(() => fastify.close())

  fastify.get('/headers', function (req, reply) {
    reply.header('x-foo', 'foo')
    reply.raw.setHeader('x-bar', 'bar')
    t.assert.ok(reply.hasHeader('x-foo'))
    t.assert.ok(reply.hasHeader('x-bar'))

    reply.send()
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/headers'
    }, () => {
      done()
    })
  })
})

test('Reply should handle JSON content type with a charset', async t => {
  t.plan(8)

  const fastify = require('../../')()

  fastify.get('/default', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.get('/utf8', function (req, reply) {
    reply
      .header('content-type', 'application/json; charset=utf-8')
      .send({ hello: 'world' })
  })

  fastify.get('/utf16', function (req, reply) {
    reply
      .header('content-type', 'application/json; charset=utf-16')
      .send({ hello: 'world' })
  })

  fastify.get('/utf32', function (req, reply) {
    reply
      .header('content-type', 'application/json; charset=utf-32')
      .send({ hello: 'world' })
  })

  fastify.get('/type-utf8', function (req, reply) {
    reply
      .type('application/json; charset=utf-8')
      .send({ hello: 'world' })
  })

  fastify.get('/type-utf16', function (req, reply) {
    reply
      .type('application/json; charset=utf-16')
      .send({ hello: 'world' })
  })

  fastify.get('/type-utf32', function (req, reply) {
    reply
      .type('application/json; charset=utf-32')
      .send({ hello: 'world' })
  })

  fastify.get('/no-space-type-utf32', function (req, reply) {
    reply
      .type('application/json;charset=utf-32')
      .send({ hello: 'world' })
  })

  {
    const res = await fastify.inject('/default')
    t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
  }

  {
    const res = await fastify.inject('/utf8')
    t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
  }

  {
    const res = await fastify.inject('/utf16')
    t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-16')
  }

  {
    const res = await fastify.inject('/utf32')
    t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-32')
  }

  {
    const res = await fastify.inject('/type-utf8')
    t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
  }

  {
    const res = await fastify.inject('/type-utf16')
    t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-16')
  }
  {
    const res = await fastify.inject('/type-utf32')
    t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-32')
  }

  {
    const res = await fastify.inject('/no-space-type-utf32')
    t.assert.strictEqual(res.headers['content-type'], 'application/json;charset=utf-32')
  }
})

test('Content type and charset set previously', (t, done) => {
  t.plan(2)

  const fastify = require('../../')()

  fastify.addHook('onRequest', function (req, reply, done) {
    reply.header('content-type', 'application/json; charset=utf-16')
    done()
  })

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.inject('/', (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-16')
    done()
  })
})

test('.status() is an alias for .code()', (t, done) => {
  t.plan(2)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.status(418).send()
  })

  fastify.inject('/', (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.statusCode, 418)
    done()
  })
})

test('.statusCode is getter and setter', (t, done) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    t.assert.strictEqual(reply.statusCode, 200, 'default status value')
    reply.statusCode = 418
    t.assert.strictEqual(reply.statusCode, 418)
    reply.send()
  })

  fastify.inject('/', (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.statusCode, 418)
    done()
  })
})

test('reply.header setting multiple cookies as multiple Set-Cookie headers', async t => {
  t.plan(4)

  const fastify = require('../../')()
  t.after(() => fastify.close())

  fastify.get('/headers', function (req, reply) {
    reply
      .header('set-cookie', 'one')
      .header('set-cookie', 'two')
      .header('set-cookie', 'three')
      .header('set-cookie', ['four', 'five', 'six'])
      .send({})
  })

  await fastify.listen({ port: 0 })

  await new Promise((resolve, reject) => {
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/headers'
    }, (err, response, body) => {
      if (err) {
        reject(err)
      }
      t.assert.ok(response.headers['set-cookie'])
      t.assert.deepStrictEqual(response.headers['set-cookie'], ['one', 'two', 'three', 'four', 'five', 'six'])
      resolve()
    })
  })

  const response = await fastify.inject('/headers')
  t.assert.ok(response.headers['set-cookie'])
  t.assert.deepStrictEqual(response.headers['set-cookie'], ['one', 'two', 'three', 'four', 'five', 'six'])
})

test('should throw when trying to modify the reply.sent property', (t, done) => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    try {
      reply.sent = true
    } catch (err) {
      t.assert.ok(err)
      reply.send()
    }
  })

  fastify.inject('/', (err, res) => {
    t.assert.ifError(err)
    t.assert.ok(true)
    done()
  })
})

test('reply.elapsedTime should return 0 before the timer is initialised on the reply by setting up response listeners', t => {
  t.plan(1)
  const response = { statusCode: 200 }
  const reply = new Reply(response, null)
  t.assert.strictEqual(reply.elapsedTime, 0)
})

test('reply.elapsedTime should return a number greater than 0 after the timer is initialised on the reply by setting up response listeners', async t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.send('hello world')
    }
  })

  fastify.addHook('onResponse', (req, reply) => {
    t.assert.ok(reply.elapsedTime > 0)
  })

  await fastify.inject({ method: 'GET', url: '/' })
})

test('reply.elapsedTime should return the time since a request started while inflight', async t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.send('hello world')
    }
  })

  let preValidationElapsedTime

  fastify.addHook('preValidation', (req, reply, done) => {
    preValidationElapsedTime = reply.elapsedTime

    done()
  })

  fastify.addHook('onResponse', (req, reply) => {
    t.assert.ok(reply.elapsedTime > preValidationElapsedTime)
  })

  await fastify.inject({ method: 'GET', url: '/' })
})

test('reply.elapsedTime should return the same value after a request is finished', async t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.send('hello world')
    }
  })

  fastify.addHook('onResponse', (req, reply) => {
    t.assert.strictEqual(reply.elapsedTime, reply.elapsedTime)
  })

  await fastify.inject({ method: 'GET', url: '/' })
})

test('reply should use the custom serializer', (t, done) => {
  t.plan(4)
  const fastify = Fastify()
  fastify.setReplySerializer((payload, statusCode) => {
    t.assert.deepStrictEqual(payload, { foo: 'bar' })
    t.assert.strictEqual(statusCode, 200)
    payload.foo = 'bar bar'
    return JSON.stringify(payload)
  })

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.send({ foo: 'bar' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.payload, '{"foo":"bar bar"}')
    done()
  })
})

test('reply should use the right serializer in encapsulated context', async t => {
  t.plan(6)

  const fastify = Fastify()
  fastify.setReplySerializer((payload) => {
    t.assert.deepStrictEqual(payload, { foo: 'bar' })
    payload.foo = 'bar bar'
    return JSON.stringify(payload)
  })

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => { reply.send({ foo: 'bar' }) }
  })

  fastify.register(function (instance, opts, done) {
    instance.route({
      method: 'GET',
      url: '/sub',
      handler: (req, reply) => { reply.send({ john: 'doo' }) }
    })
    instance.setReplySerializer((payload) => {
      t.assert.deepStrictEqual(payload, { john: 'doo' })
      payload.john = 'too too'
      return JSON.stringify(payload)
    })
    done()
  })

  fastify.register(function (instance, opts, done) {
    instance.route({
      method: 'GET',
      url: '/sub',
      handler: (req, reply) => { reply.send({ sweet: 'potato' }) }
    })
    instance.setReplySerializer((payload) => {
      t.assert.deepStrictEqual(payload, { sweet: 'potato' })
      payload.sweet = 'potato potato'
      return JSON.stringify(payload)
    })
    done()
  }, { prefix: 'sub' })

  {
    const res = await fastify.inject('/')
    t.assert.strictEqual(res.payload, '{"foo":"bar bar"}')
  }

  {
    const res = await fastify.inject('/sub')
    t.assert.strictEqual(res.payload, '{"john":"too too"}')
  }

  {
    const res = await fastify.inject('/sub/sub')
    t.assert.strictEqual(res.payload, '{"sweet":"potato potato"}')
  }
})

test('reply should use the right serializer in deep encapsulated context', async t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => { reply.send({ foo: 'bar' }) }
  })

  fastify.register(function (instance, opts, done) {
    instance.route({
      method: 'GET',
      url: '/sub',
      handler: (req, reply) => { reply.send({ john: 'doo' }) }
    })
    instance.setReplySerializer((payload) => {
      t.assert.deepStrictEqual(payload, { john: 'doo' })
      payload.john = 'too too'
      return JSON.stringify(payload)
    })

    instance.register(function (subInstance, opts, done) {
      subInstance.route({
        method: 'GET',
        url: '/deep',
        handler: (req, reply) => { reply.send({ john: 'deep' }) }
      })
      subInstance.setReplySerializer((payload) => {
        t.assert.deepStrictEqual(payload, { john: 'deep' })
        payload.john = 'deep deep'
        return JSON.stringify(payload)
      })
      done()
    })
    done()
  })

  {
    const res = await fastify.inject('/')
    t.assert.strictEqual(res.payload, '{"foo":"bar"}')
  }
  {
    const res = await fastify.inject('/sub')
    t.assert.strictEqual(res.payload, '{"john":"too too"}')
  }
  {
    const res = await fastify.inject('/deep')
    t.assert.strictEqual(res.payload, '{"john":"deep deep"}')
  }
})

test('reply should use the route serializer', (t, done) => {
  t.plan(3)

  const fastify = Fastify()
  fastify.setReplySerializer(() => {
    t.fail('this serializer should not be executed')
  })

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply
        .serializer((payload) => {
          t.assert.deepStrictEqual(payload, { john: 'doo' })
          payload.john = 'too too'
          return JSON.stringify(payload)
        })
        .send({ john: 'doo' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.payload, '{"john":"too too"}')
    done()
  })
})

test('cannot set the replySerializer when the server is running', (t, done) => {
  t.plan(2)

  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    try {
      fastify.setReplySerializer(() => { })
      t.assert.fail('this serializer should not be setup')
    } catch (e) {
      t.assert.strictEqual(e.code, 'FST_ERR_INSTANCE_ALREADY_LISTENING')
    } finally {
      done()
    }
  })
})

test('reply should not call the custom serializer for errors and not found', async t => {
  t.plan(6)

  const fastify = Fastify()
  fastify.setReplySerializer((payload, statusCode) => {
    t.assert.deepStrictEqual(payload, { foo: 'bar' })
    t.assert.strictEqual(statusCode, 200)
    return JSON.stringify(payload)
  })

  fastify.get('/', (req, reply) => { reply.send({ foo: 'bar' }) })
  fastify.get('/err', (req, reply) => { reply.send(new Error('an error')) })

  {
    const res = await fastify.inject('/')
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.payload, '{"foo":"bar"}')
  }
  {
    const res = await fastify.inject('/err')
    t.assert.strictEqual(res.statusCode, 500)
  }
  {
    const res = await fastify.inject('/not-existing')
    t.assert.strictEqual(res.statusCode, 404)
  }
})

test('reply.then', async t => {
  t.plan(4)

  function request () { }

  await t.test('without an error', (t, done) => {
    t.plan(1)

    const response = new Writable()
    const reply = new Reply(response, request)

    reply.then(function () {
      t.assert.ok(true)
      done()
    })

    response.destroy()
  })

  await t.test('with an error', (t, done) => {
    t.plan(1)

    const response = new Writable()
    const reply = new Reply(response, request)
    const _err = new Error('kaboom')

    reply.then(function () {
      t.assert.fail('fulfilled called')
    }, function (err) {
      t.assert.strictEqual(err, _err)
      done()
    })

    response.destroy(_err)
  })

  await t.test('with error but without reject callback', t => {
    t.plan(1)

    const response = new Writable()
    const reply = new Reply(response, request)
    const _err = new Error('kaboom')

    reply.then(function () {
      t.assert.fail('fulfilled called')
    })

    t.assert.ok(true)

    response.destroy(_err)
  })

  await t.test('with error, without reject callback, with logger', (t, done) => {
    t.plan(1)

    const response = new Writable()
    const reply = new Reply(response, request)
    // spy logger
    reply.log = {
      warn: (message) => {
        t.assert.strictEqual(message, 'unhandled rejection on reply.then')
        done()
      }
    }
    const _err = new Error('kaboom')

    reply.then(function () {
      t.assert.fail('fulfilled called')
    })

    response.destroy(_err)
  })
})

test('reply.sent should read from response.writableEnded if it is defined', t => {
  t.plan(1)

  const reply = new Reply({ writableEnded: true }, {}, {})

  t.assert.strictEqual(reply.sent, true)
})

test('redirect to an invalid URL should not crash the server', async t => {
  const fastify = Fastify()
  fastify.route({
    method: 'GET',
    url: '/redirect',
    handler: (req, reply) => {
      reply.log.warn = function mockWarn (obj, message) {
        t.assert.strictEqual(message, 'Invalid character in header content ["location"]')
      }

      switch (req.query.useCase) {
        case '1':
          reply.redirect('/?key=a’b')
          break

        case '2':
          reply.redirect(encodeURI('/?key=a’b'))
          break

        default:
          reply.redirect('/?key=ab')
          break
      }
    }
  })

  await fastify.listen({ port: 0 })

  {
    const { response, body } = await doGet(`http://127.0.0.1:${fastify.server.address().port}/redirect?useCase=1`)
    t.assert.strictEqual(response.statusCode, 500)
    t.assert.deepStrictEqual(JSON.parse(body), {
      statusCode: 500,
      code: 'ERR_INVALID_CHAR',
      error: 'Internal Server Error',
      message: 'Invalid character in header content ["location"]'
    })
  }
  {
    const { response } = await doGet(`http://127.0.0.1:${fastify.server.address().port}/redirect?useCase=2`)
    t.assert.strictEqual(response.statusCode, 302)
    t.assert.strictEqual(response.headers.location, '/?key=a%E2%80%99b')
  }

  {
    const { response } = await doGet(`http://127.0.0.1:${fastify.server.address().port}/redirect?useCase=3`)
    t.assert.strictEqual(response.statusCode, 302)
    t.assert.strictEqual(response.headers.location, '/?key=ab')
  }

  await fastify.close()
})

test('invalid response headers should not crash the server', async t => {
  const fastify = Fastify()
  fastify.route({
    method: 'GET',
    url: '/bad-headers',
    handler: (req, reply) => {
      reply.log.warn = function mockWarn (obj, message) {
        t.assert.strictEqual(message, 'Invalid character in header content ["smile-encoded"]', 'only the first invalid header is logged')
      }

      reply.header('foo', '$')
      reply.header('smile-encoded', '\uD83D\uDE00')
      reply.header('smile', '😄')
      reply.header('bar', 'ƒ∂å')

      reply.send({})
    }
  })

  await fastify.listen({ port: 0 })

  const { response, body } = await doGet(`http://127.0.0.1:${fastify.server.address().port}/bad-headers`)
  t.assert.strictEqual(response.statusCode, 500)
  t.assert.deepStrictEqual(JSON.parse(body), {
    statusCode: 500,
    code: 'ERR_INVALID_CHAR',
    error: 'Internal Server Error',
    message: 'Invalid character in header content ["smile-encoded"]'
  })

  await fastify.close()
})

test('invalid response headers when sending back an error', async t => {
  const fastify = Fastify()
  fastify.route({
    method: 'GET',
    url: '/bad-headers',
    handler: (req, reply) => {
      reply.log.warn = function mockWarn (obj, message) {
        t.assert.strictEqual(message, 'Invalid character in header content ["smile"]', 'only the first invalid header is logged')
      }

      reply.header('smile', '😄')
      reply.send(new Error('user land error'))
    }
  })

  await fastify.listen({ port: 0 })

  const { response, body } = await doGet(`http://127.0.0.1:${fastify.server.address().port}/bad-headers`)
  t.assert.strictEqual(response.statusCode, 500)
  t.assert.deepStrictEqual(JSON.parse(body), {
    statusCode: 500,
    code: 'ERR_INVALID_CHAR',
    error: 'Internal Server Error',
    message: 'Invalid character in header content ["smile"]'
  })

  await fastify.close()
})

test('invalid response headers and custom error handler', async t => {
  const fastify = Fastify()
  fastify.route({
    method: 'GET',
    url: '/bad-headers',
    handler: (req, reply) => {
      reply.log.warn = function mockWarn (obj, message) {
        t.assert.strictEqual(message, 'Invalid character in header content ["smile"]', 'only the first invalid header is logged')
      }

      reply.header('smile', '😄')
      reply.send(new Error('user land error'))
    }
  })

  fastify.setErrorHandler(function (error, request, reply) {
    t.assert.strictEqual(error.message, 'user land error', 'custom error handler receives the error')
    reply.status(500).send({ ops: true })
  })

  await fastify.listen({ port: 0 })

  const { response, body } = await doGet(`http://127.0.0.1:${fastify.server.address().port}/bad-headers`)
  t.assert.strictEqual(response.statusCode, 500)
  t.assert.deepStrictEqual(JSON.parse(body), {
    statusCode: 500,
    code: 'ERR_INVALID_CHAR',
    error: 'Internal Server Error',
    message: 'Invalid character in header content ["smile"]'
  })

  await fastify.close()
})

test('reply.send will intercept ERR_HTTP_HEADERS_SENT and log an error message', t => {
  t.plan(2)

  const response = new Writable()
  Object.assign(response, {
    setHeader: () => { },
    hasHeader: () => false,
    getHeader: () => undefined,
    writeHead: () => {
      const err = new Error('kaboom')
      err.code = 'ERR_HTTP_HEADERS_SENT'
      throw err
    },
    write: () => { },
    headersSent: true
  })

  const log = {
    warn: (msg) => {
      t.assert.strictEqual(msg, 'Reply was already sent, did you forget to "return reply" in the "/hello" (GET) route?')
    }
  }

  const reply = new Reply(response, { [kRouteContext]: { onSend: null }, raw: { url: '/hello', method: 'GET' } }, log)

  try {
    reply.send('')
  } catch (err) {
    t.assert.strictEqual(err.code, 'ERR_HTTP_HEADERS_SENT')
  }
})

test('Uint8Array view of ArrayBuffer returns correct byteLength', (t, done) => {
  t.plan(5)
  const fastify = Fastify()

  const arrBuf = new ArrayBuffer(100)
  const arrView = new Uint8Array(arrBuf, 0, 10)
  fastify.get('/', function (req, reply) {
    return reply.send(arrView)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    fastify.inject({
      method: 'GET',
      url: '/'
    }, (err, response) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['content-type'], 'application/octet-stream')
      t.assert.strictEqual(response.headers['content-length'], '10')
      t.assert.deepStrictEqual(response.rawPayload.byteLength, arrView.byteLength)
      done()
    })
  })
})
