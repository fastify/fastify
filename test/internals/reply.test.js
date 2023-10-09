'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const http = require('node:http')
const NotFound = require('http-errors').NotFound
const Reply = require('../../lib/reply')
const Fastify = require('../..')
const { Readable, Writable } = require('node:stream')
const {
  kReplyErrorHandlerCalled,
  kReplyHeaders,
  kReplySerializer,
  kReplyIsError,
  kReplySerializerDefault,
  kRouteContext,
  kPublicRouteContext
} = require('../../lib/symbols')
const fs = require('node:fs')
const path = require('node:path')
const warning = require('../../lib/warnings')

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
  t.plan(16)
  const response = { res: 'res' }
  const context = { config: { onSend: [] }, schema: {} }
  const request = { [kRouteContext]: context, [kPublicRouteContext]: { config: context.config, schema: context.schema } }
  const reply = new Reply(response, request)
  t.equal(typeof reply, 'object')
  t.equal(typeof reply[kReplyIsError], 'boolean')
  t.equal(typeof reply[kReplyErrorHandlerCalled], 'boolean')
  t.equal(typeof reply.send, 'function')
  t.equal(typeof reply.code, 'function')
  t.equal(typeof reply.status, 'function')
  t.equal(typeof reply.header, 'function')
  t.equal(typeof reply.serialize, 'function')
  t.equal(typeof reply.getResponseTime, 'function')
  t.equal(typeof reply[kReplyHeaders], 'object')
  t.same(reply.raw, response)
  t.equal(reply[kRouteContext], context)
  t.equal(reply[kPublicRouteContext].config, context.config)
  t.equal(reply[kPublicRouteContext].schema, context.schema)
  t.equal(reply.request, request)
  // Aim to not bad property keys (including Symbols)
  t.notOk('undefined' in reply)
})

test('reply.send will logStream error and destroy the stream', t => {
  t.plan(1)
  let destroyCalled
  const payload = new Readable({
    read () {},
    destroy (err, cb) {
      destroyCalled = true
      cb(err)
    }
  })

  const response = new Writable()
  Object.assign(response, {
    setHeader: () => {},
    hasHeader: () => false,
    getHeader: () => undefined,
    writeHead: () => {},
    write: () => {},
    headersSent: true
  })

  const log = {
    warn: () => {}
  }

  const reply = new Reply(response, { [kRouteContext]: { onSend: null } }, log)
  reply.send(payload)
  payload.destroy(new Error('stream error'))

  t.equal(destroyCalled, true, 'Error not logged and not streamed')
})

test('reply.send throw with circular JSON', t => {
  t.plan(1)
  const response = {
    setHeader: () => {},
    hasHeader: () => false,
    getHeader: () => undefined,
    writeHead: () => {},
    write: () => {},
    end: () => {}
  }
  const reply = new Reply(response, { [kRouteContext]: { onSend: [] } })
  t.throws(() => {
    const obj = {}
    obj.obj = obj
    reply.send(JSON.stringify(obj))
  }, 'Converting circular structure to JSON')
})

test('reply.send returns itself', t => {
  t.plan(1)
  const response = {
    setHeader: () => {},
    hasHeader: () => false,
    getHeader: () => undefined,
    writeHead: () => {},
    write: () => {},
    end: () => {}
  }
  const reply = new Reply(response, { [kRouteContext]: { onSend: [] } })
  t.equal(reply.send('hello'), reply)
})

test('reply.serializer should set a custom serializer', t => {
  t.plan(2)
  const reply = new Reply(null, null, null)
  t.equal(reply[kReplySerializer], null)
  reply.serializer('serializer')
  t.equal(reply[kReplySerializer], 'serializer')
})

test('reply.serializer should support running preSerialization hooks', t => {
  t.plan(3)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.addHook('preSerialization', async (request, reply, payload) => { t.ok('called', 'preSerialization') })
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
    t.error(err)
    t.equal(res.payload, '{"foo":"bar"}')
  })
})

test('reply.serialize should serialize payload', t => {
  t.plan(1)
  const response = { statusCode: 200 }
  const context = {}
  const reply = new Reply(response, { [kRouteContext]: context })
  t.equal(reply.serialize({ foo: 'bar' }), '{"foo":"bar"}')
})

test('reply.serialize should serialize payload with a custom serializer', t => {
  t.plan(2)
  let customSerializerCalled = false
  const response = { statusCode: 200 }
  const context = {}
  const reply = new Reply(response, { [kRouteContext]: context })
  reply.serializer((x) => (customSerializerCalled = true) && JSON.stringify(x))
  t.equal(reply.serialize({ foo: 'bar' }), '{"foo":"bar"}')
  t.equal(customSerializerCalled, true, 'custom serializer not called')
})

test('reply.serialize should serialize payload with a context default serializer', t => {
  t.plan(2)
  let customSerializerCalled = false
  const response = { statusCode: 200 }
  const context = { [kReplySerializerDefault]: (x) => (customSerializerCalled = true) && JSON.stringify(x) }
  const reply = new Reply(response, { [kRouteContext]: context })
  t.equal(reply.serialize({ foo: 'bar' }), '{"foo":"bar"}')
  t.equal(customSerializerCalled, true, 'custom serializer not called')
})

test('reply.serialize should serialize payload with Fastify instance', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
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
    t.error(err)
    t.equal(res.payload, '{"foo":"bar"}')
  })
})

test('within an instance', t => {
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  const test = t.test

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
    reply.redirect(301, '/')
  })

  fastify.get('/redirect-code-before-call', function (req, reply) {
    reply.code(307).redirect('/')
  })

  fastify.get('/redirect-code-before-call-overwrite', function (req, reply) {
    reply.code(307).redirect(302, '/')
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

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    test('custom serializer should be used', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: 'http://127.0.0.1:' + fastify.server.address().port + '/custom-serializer'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.headers['content-type'], 'text/plain')
        t.same(body.toString(), 'hello=world!')
      })
    })

    test('status code and content-type should be correct', t => {
      t.plan(4)
      sget({
        method: 'GET',
        url: 'http://127.0.0.1:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-type'], 'text/plain')
        t.same(body.toString(), 'hello world!')
      })
    })

    test('auto status code should be 200', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: 'http://127.0.0.1:' + fastify.server.address().port + '/auto-status-code'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(body.toString(), 'hello world!')
      })
    })

    test('auto type should be text/plain', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: 'http://127.0.0.1:' + fastify.server.address().port + '/auto-type'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.headers['content-type'], 'text/plain')
        t.same(body.toString(), 'hello world!')
      })
    })

    test('redirect to `/` - 1', t => {
      t.plan(1)

      http.get('http://127.0.0.1:' + fastify.server.address().port + '/redirect', function (response) {
        t.equal(response.statusCode, 302)
      })
    })

    test('redirect to `/` - 2', t => {
      t.plan(1)

      http.get('http://127.0.0.1:' + fastify.server.address().port + '/redirect-code', function (response) {
        t.equal(response.statusCode, 301)
      })
    })

    test('redirect to `/` - 3', t => {
      t.plan(4)
      sget({
        method: 'GET',
        url: 'http://127.0.0.1:' + fastify.server.address().port + '/redirect'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-type'], 'text/plain')
        t.same(body.toString(), 'hello world!')
      })
    })

    test('redirect to `/` - 4', t => {
      t.plan(4)
      sget({
        method: 'GET',
        url: 'http://127.0.0.1:' + fastify.server.address().port + '/redirect-code'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-type'], 'text/plain')
        t.same(body.toString(), 'hello world!')
      })
    })

    test('redirect to `/` - 5', t => {
      t.plan(3)
      const url = 'http://127.0.0.1:' + fastify.server.address().port + '/redirect-onsend'
      http.get(url, (response) => {
        t.equal(response.headers['x-onsend'], 'yes')
        t.equal(response.headers['content-length'], '0')
        t.equal(response.headers.location, '/')
      })
    })

    test('redirect to `/` - 6', t => {
      t.plan(4)
      sget({
        method: 'GET',
        url: 'http://127.0.0.1:' + fastify.server.address().port + '/redirect-code-before-call'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-type'], 'text/plain')
        t.same(body.toString(), 'hello world!')
      })
    })

    test('redirect to `/` - 7', t => {
      t.plan(4)
      sget({
        method: 'GET',
        url: 'http://127.0.0.1:' + fastify.server.address().port + '/redirect-code-before-call-overwrite'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-type'], 'text/plain')
        t.same(body.toString(), 'hello world!')
      })
    })

    test('redirect to `/` - 8', t => {
      t.plan(1)

      http.get('http://127.0.0.1:' + fastify.server.address().port + '/redirect-code-before-call', function (response) {
        t.equal(response.statusCode, 307)
      })
    })

    test('redirect to `/` - 9', t => {
      t.plan(1)

      http.get('http://127.0.0.1:' + fastify.server.address().port + '/redirect-code-before-call-overwrite', function (response) {
        t.equal(response.statusCode, 302)
      })
    })

    test('redirect with async function to `/` - 10', t => {
      t.plan(1)

      http.get('http://127.0.0.1:' + fastify.server.address().port + '/redirect-async', function (response) {
        t.equal(response.statusCode, 302)
      })
    })

    t.end()
  })
})

test('buffer without content type should send a application/octet-stream and raw buffer', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send(Buffer.alloc(1024))
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.headers['content-type'], 'application/octet-stream')
      t.same(body, Buffer.alloc(1024))
    })
  })
})
test('Uint8Array without content type should send a application/octet-stream and raw buffer', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send(new Uint8Array(1024).fill(0xff))
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    fastify.inject({
      method: 'GET',
      url: '/'
    }, (err, response) => {
      t.error(err)
      t.equal(response.headers['content-type'], 'application/octet-stream')
      t.same(new Uint8Array(response.rawPayload), new Uint8Array(1024).fill(0xff))
    })
  })
})
test('Uint16Array without content type should send a application/octet-stream and raw buffer', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send(new Uint16Array(50).fill(0xffffffff))
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    fastify.inject({
      method: 'GET',
      url: '/'
    }, (err, res) => {
      t.error(err)
      t.equal(res.headers['content-type'], 'application/octet-stream')
      t.same(new Uint16Array(res.rawPayload.buffer, res.rawPayload.byteOffset, res.rawPayload.byteLength / Uint16Array.BYTES_PER_ELEMENT), new Uint16Array(50).fill(0xffffffff))
    })
  })
})
test('TypedArray with content type should not send application/octet-stream', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.header('Content-Type', 'text/plain')
    reply.send(new Uint16Array(1024).fill(0xffffffff))
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    fastify.inject({
      method: 'GET',
      url: '/'
    }, (err, res) => {
      t.error(err)
      t.equal(res.headers['content-type'], 'text/plain')
      t.same(new Uint16Array(res.rawPayload.buffer, res.rawPayload.byteOffset, res.rawPayload.byteLength / Uint16Array.BYTES_PER_ELEMENT), new Uint16Array(1024).fill(0xffffffff))
    })
  })
})
test('buffer with content type should not send application/octet-stream', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.header('Content-Type', 'text/plain')
    reply.send(Buffer.alloc(1024))
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.headers['content-type'], 'text/plain')
      t.same(body, Buffer.alloc(1024))
    })
  })
})

test('stream with content type should not send application/octet-stream', t => {
  t.plan(4)

  const fastify = Fastify()

  const streamPath = path.join(__dirname, '..', '..', 'package.json')
  const stream = fs.createReadStream(streamPath)
  const buf = fs.readFileSync(streamPath)

  fastify.get('/', function (req, reply) {
    reply.header('Content-Type', 'text/plain').send(stream)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.headers['content-type'], 'text/plain')
      t.same(body, buf)
    })
  })
})

test('stream without content type should not send application/octet-stream', t => {
  t.plan(4)

  const fastify = Fastify()

  const stream = fs.createReadStream(__filename)
  const buf = fs.readFileSync(__filename)

  fastify.get('/', function (req, reply) {
    reply.send(stream)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.headers['content-type'], undefined)
      t.same(body, buf)
    })
  })
})

test('stream using reply.raw.writeHead should return customize headers', t => {
  t.plan(6)

  const fastify = Fastify()
  const fs = require('node:fs')
  const path = require('node:path')

  const streamPath = path.join(__dirname, '..', '..', 'package.json')
  const stream = fs.createReadStream(streamPath)
  const buf = fs.readFileSync(streamPath)

  fastify.get('/', function (req, reply) {
    reply.log.warn = function mockWarn (message) {
      t.equal(message, 'response will send, but you shouldn\'t use res.writeHead in stream mode')
    }
    reply.raw.writeHead(200, {
      location: '/'
    })
    reply.send(stream)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.headers.location, '/')
      t.equal(response.headers['Content-Type'], undefined)
      t.same(body, buf)
    })
  })
})

test('plain string without content type should send a text/plain', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send('hello world!')
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.headers['content-type'], 'text/plain; charset=utf-8')
      t.same(body.toString(), 'hello world!')
    })
  })
})

test('plain string with content type should be sent unmodified', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.type('text/css').send('hello world!')
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.headers['content-type'], 'text/css')
      t.same(body.toString(), 'hello world!')
    })
  })
})

test('plain string with content type and custom serializer should be serialized', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply
      .serializer(() => 'serialized')
      .type('text/css')
      .send('hello world!')
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.headers['content-type'], 'text/css')
      t.same(body.toString(), 'serialized')
    })
  })
})

test('plain string with content type application/json should NOT be serialized as json', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.type('application/json').send('{"key": "hello world!"}')
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.headers['content-type'], 'application/json; charset=utf-8')
      t.same(body.toString(), '{"key": "hello world!"}')
    })
  })
})

test('plain string with custom json content type should NOT be serialized as json', t => {
  t.plan(19)

  const fastify = Fastify()

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

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    Object.keys(customSamples).forEach((path) => {
      sget({
        method: 'GET',
        url: 'http://127.0.0.1:' + fastify.server.address().port + '/' + path
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.headers['content-type'], customSamples[path].mimeType + '; charset=utf-8')
        t.same(body.toString(), customSamples[path].sample)
      })
    })
  })
})

test('non-string with content type application/json SHOULD be serialized as json', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.type('application/json').send({ key: 'hello world!' })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.headers['content-type'], 'application/json; charset=utf-8')
      t.same(body.toString(), JSON.stringify({ key: 'hello world!' }))
    })
  })
})

test('non-string with custom json\'s content-type SHOULD be serialized as json', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.type('application/json; version=2; ').send({ key: 'hello world!' })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.headers['content-type'], 'application/json; version=2; charset=utf-8')
      t.same(body.toString(), JSON.stringify({ key: 'hello world!' }))
    })
  })
})

test('non-string with custom json content type SHOULD be serialized as json', t => {
  t.plan(16)

  const fastify = Fastify()

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

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    Object.keys(customSamples).forEach((path) => {
      sget({
        method: 'GET',
        url: 'http://127.0.0.1:' + fastify.server.address().port + '/' + path
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.headers['content-type'], customSamples[path].mimeType + '; charset=utf-8')
        t.same(body.toString(), JSON.stringify(customSamples[path].sample))
      })
    })
  })
})

test('error object with a content type that is not application/json should work', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.get('/text', function (req, reply) {
    reply.type('text/plain')
    reply.send(new Error('some application error'))
  })

  fastify.get('/html', function (req, reply) {
    reply.type('text/html')
    reply.send(new Error('some application error'))
  })

  fastify.inject({
    method: 'GET',
    url: '/text'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
    t.equal(JSON.parse(res.payload).message, 'some application error')
  })

  fastify.inject({
    method: 'GET',
    url: '/html'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
    t.equal(JSON.parse(res.payload).message, 'some application error')
  })
})

test('undefined payload should be sent as-is', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.addHook('onSend', function (request, reply, payload, done) {
    t.equal(payload, undefined)
    done()
  })

  fastify.get('/', function (req, reply) {
    reply.code(204).send()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    sget({
      method: 'GET',
      url: `http://127.0.0.1:${fastify.server.address().port}`
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.headers['content-type'], undefined)
      t.equal(response.headers['content-length'], undefined)
      t.equal(body.length, 0)
    })
  })
})

test('for HEAD method, no body should be sent but content-length should be', t => {
  t.plan(11)

  const fastify = Fastify()
  const contentType = 'application/json; charset=utf-8'
  const bodySize = JSON.stringify({ foo: 'bar' }).length

  fastify.head('/', {
    onSend: function (request, reply, payload, done) {
      t.equal(payload, undefined)
      done()
    }
  }, function (req, reply) {
    reply.header('content-length', bodySize)
    reply.header('content-type', contentType)
    reply.code(200).send()
  })

  fastify.head('/with/null', {
    onSend: function (request, reply, payload, done) {
      t.equal(payload, 'null')
      done()
    }
  }, function (req, reply) {
    reply.header('content-length', bodySize)
    reply.header('content-type', contentType)
    reply.code(200).send(null)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    sget({
      method: 'HEAD',
      url: `http://127.0.0.1:${fastify.server.address().port}`
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.headers['content-type'], contentType)
      t.equal(response.headers['content-length'], bodySize.toString())
      t.equal(body.length, 0)
    })

    sget({
      method: 'HEAD',
      url: `http://127.0.0.1:${fastify.server.address().port}/with/null`
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.headers['content-type'], contentType)
      t.equal(response.headers['content-length'], bodySize.toString())
      t.equal(body.length, 0)
    })
  })
})

test('reply.send(new NotFound()) should not invoke the 404 handler', t => {
  t.plan(9)

  const fastify = Fastify()

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

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    t.teardown(fastify.close.bind(fastify))

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/not-found'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 404)
      t.equal(response.headers['content-type'], 'application/json; charset=utf-8')
      t.same(JSON.parse(body.toString()), {
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found'
      })
    })

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/prefixed/not-found'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 404)
      t.equal(response.headers['content-type'], 'application/json; charset=utf-8')
      t.same(JSON.parse(body), {
        error: 'Not Found',
        message: 'Not Found',
        statusCode: 404
      })
    })
  })
})

test('reply can set multiple instances of same header', t => {
  t.plan(4)

  const fastify = require('../../')()

  fastify.get('/headers', function (req, reply) {
    reply
      .header('set-cookie', 'one')
      .header('set-cookie', 'two')
      .send({})
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/headers'
    }, (err, response, body) => {
      t.error(err)
      t.ok(response.headers['set-cookie'])
      t.strictSame(response.headers['set-cookie'], ['one', 'two'])
    })
  })
})

test('reply.hasHeader returns correct values', t => {
  t.plan(3)

  const fastify = require('../../')()

  fastify.get('/headers', function (req, reply) {
    reply.header('x-foo', 'foo')
    t.equal(reply.hasHeader('x-foo'), true)
    t.equal(reply.hasHeader('x-bar'), false)
    reply.send()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/headers'
    }, () => {})
  })
})

test('reply.getHeader returns correct values', t => {
  t.plan(5)

  const fastify = require('../../')()

  fastify.get('/headers', function (req, reply) {
    reply.header('x-foo', 'foo')
    t.equal(reply.getHeader('x-foo'), 'foo')

    reply.header('x-foo', 'bar')
    t.strictSame(reply.getHeader('x-foo'), 'bar')

    reply.header('x-foo', 42)
    t.strictSame(reply.getHeader('x-foo'), 42)

    reply.header('set-cookie', 'one')
    reply.header('set-cookie', 'two')
    t.strictSame(reply.getHeader('set-cookie'), ['one', 'two'])

    reply.send()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/headers'
    }, () => {})
  })
})

test('reply.getHeader returns raw header if there is not in the reply headers', t => {
  t.plan(1)
  const response = {
    setHeader: () => {},
    hasHeader: () => true,
    getHeader: () => 'bar',
    writeHead: () => {},
    end: () => {}
  }
  const reply = new Reply(response, { onSend: [] }, null)
  t.equal(reply.getHeader('foo'), 'bar')
})

test('reply.getHeaders returns correct values', t => {
  t.plan(3)

  const fastify = require('../../')()

  fastify.get('/headers', function (req, reply) {
    reply.header('x-foo', 'foo')

    t.strictSame(reply.getHeaders(), {
      'x-foo': 'foo'
    })

    reply.header('x-bar', 'bar')
    reply.raw.setHeader('x-foo', 'foo2')
    reply.raw.setHeader('x-baz', 'baz')

    t.strictSame(reply.getHeaders(), {
      'x-foo': 'foo',
      'x-bar': 'bar',
      'x-baz': 'baz'
    })

    reply.send()
  })

  fastify.inject('/headers', (err) => {
    t.error(err)
  })
})

test('reply.removeHeader can remove the value', t => {
  t.plan(5)

  const fastify = require('../../')()

  t.teardown(fastify.close.bind(fastify))

  fastify.get('/headers', function (req, reply) {
    reply.header('x-foo', 'foo')
    t.equal(reply.getHeader('x-foo'), 'foo')

    t.equal(reply.removeHeader('x-foo'), reply)
    t.strictSame(reply.getHeader('x-foo'), undefined)

    reply.send()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/headers'
    }, () => {
      t.pass()
    })
  })
})

test('reply.header can reset the value', t => {
  t.plan(3)

  const fastify = require('../../')()

  t.teardown(fastify.close.bind(fastify))

  fastify.get('/headers', function (req, reply) {
    reply.header('x-foo', 'foo')
    reply.header('x-foo', undefined)
    t.strictSame(reply.getHeader('x-foo'), '')

    reply.send()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/headers'
    }, () => {
      t.pass()
    })
  })
})

// https://github.com/fastify/fastify/issues/3030
test('reply.hasHeader computes raw and fastify headers', t => {
  t.plan(4)

  const fastify = require('../../')()

  t.teardown(fastify.close.bind(fastify))

  fastify.get('/headers', function (req, reply) {
    reply.header('x-foo', 'foo')
    reply.raw.setHeader('x-bar', 'bar')
    t.ok(reply.hasHeader('x-foo'))
    t.ok(reply.hasHeader('x-bar'))

    reply.send()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))
    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/headers'
    }, () => {
      t.pass()
    })
  })
})

test('Reply should handle JSON content type with a charset', t => {
  t.plan(16)

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

  fastify.inject('/default', (err, res) => {
    t.error(err)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
  })

  fastify.inject('/utf8', (err, res) => {
    t.error(err)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
  })

  fastify.inject('/utf16', (err, res) => {
    t.error(err)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-16')
  })

  fastify.inject('/utf32', (err, res) => {
    t.error(err)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-32')
  })

  fastify.inject('/type-utf8', (err, res) => {
    t.error(err)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
  })

  fastify.inject('/type-utf16', (err, res) => {
    t.error(err)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-16')
  })

  fastify.inject('/type-utf32', (err, res) => {
    t.error(err)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-32')
  })

  fastify.inject('/no-space-type-utf32', (err, res) => {
    t.error(err)
    t.equal(res.headers['content-type'], 'application/json;charset=utf-32')
  })
})

test('Content type and charset set previously', t => {
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
    t.error(err)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-16')
  })
})

test('.status() is an alias for .code()', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.status(418).send()
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 418)
  })
})

test('.statusCode is getter and setter', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    t.ok(reply.statusCode, 200, 'default status value')
    reply.statusCode = 418
    t.ok(reply.statusCode, 418)
    reply.send()
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 418)
  })
})

test('reply.header setting multiple cookies as multiple Set-Cookie headers', t => {
  t.plan(7)

  const fastify = require('../../')()

  fastify.get('/headers', function (req, reply) {
    reply
      .header('set-cookie', 'one')
      .header('set-cookie', 'two')
      .header('set-cookie', 'three')
      .header('set-cookie', ['four', 'five', 'six'])
      .send({})
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(fastify.close.bind(fastify))

    sget({
      method: 'GET',
      url: 'http://127.0.0.1:' + fastify.server.address().port + '/headers'
    }, (err, response, body) => {
      t.error(err)
      t.ok(response.headers['set-cookie'])
      t.strictSame(response.headers['set-cookie'], ['one', 'two', 'three', 'four', 'five', 'six'])
    })
  })

  fastify.inject('/headers', (error, response) => {
    t.error(error)
    t.ok(response.headers['set-cookie'])
    t.strictSame(response.headers['set-cookie'], ['one', 'two', 'three', 'four', 'five', 'six'])
  })
})

test('should emit deprecation warning when trying to modify the reply.sent property', t => {
  t.plan(4)
  const fastify = Fastify()

  const deprecationCode = 'FSTDEP010'
  warning.emitted.delete(deprecationCode)

  process.removeAllListeners('warning')
  process.on('warning', onWarning)
  function onWarning (warning) {
    t.equal(warning.name, 'FastifyDeprecation')
    t.equal(warning.code, deprecationCode)
  }

  fastify.get('/', (req, reply) => {
    reply.sent = true

    reply.raw.end()
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.pass()

    process.removeListener('warning', onWarning)
  })
})

test('should emit deprecation warning when trying to use the reply.context.config property', t => {
  t.plan(4)
  const fastify = Fastify()

  const deprecationCode = 'FSTDEP019'
  warning.emitted.delete(deprecationCode)

  process.removeAllListeners('warning')
  process.on('warning', onWarning)
  function onWarning (warning) {
    t.equal(warning.name, 'FastifyDeprecation')
    t.equal(warning.code, deprecationCode)
  }

  fastify.get('/', (req, reply) => {
    req.log(reply.context.config)
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.pass()

    process.removeListener('warning', onWarning)
  })
})

test('should throw error when passing falsy value to reply.sent', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    try {
      reply.sent = false
    } catch (err) {
      t.equal(err.code, 'FST_ERR_REP_SENT_VALUE')
      t.equal(err.message, 'The only possible value for reply.sent is true.')
      reply.send()
    }
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.pass()
  })
})

test('should throw error when attempting to set reply.sent more than once', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.sent = true
    try {
      reply.sent = true
      t.fail('must throw')
    } catch (err) {
      t.equal(err.code, 'FST_ERR_REP_ALREADY_SENT')
    }
    reply.raw.end()
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.pass()
  })
})

test('should not throw error when attempting to set reply.sent if the underlining request was sent', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.raw.end()
    t.doesNotThrow(() => {
      reply.sent = true
    })
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.pass()
  })
})

test('reply.getResponseTime() should return 0 before the timer is initialised on the reply by setting up response listeners', t => {
  t.plan(1)
  const response = { statusCode: 200 }
  const reply = new Reply(response, null)
  t.equal(reply.getResponseTime(), 0)
})

test('reply.getResponseTime() should return a number greater than 0 after the timer is initialised on the reply by setting up response listeners', t => {
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
    t.ok(reply.getResponseTime() > 0)
    t.end()
  })

  fastify.inject({ method: 'GET', url: '/' })
})

test('reply.getResponseTime() should return the time since a request started while inflight', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.send('hello world')
    }
  })

  fastify.addHook('preValidation', (req, reply, done) => {
    t.not(reply.getResponseTime(), reply.getResponseTime())
    done()
  })

  fastify.addHook('onResponse', (req, reply) => {
    t.end()
  })

  fastify.inject({ method: 'GET', url: '/' })
})

test('reply.getResponseTime() should return the same value after a request is finished', t => {
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
    t.equal(reply.getResponseTime(), reply.getResponseTime())
    t.end()
  })

  fastify.inject({ method: 'GET', url: '/' })
})

test('reply should use the custom serializer', t => {
  t.plan(4)
  const fastify = Fastify()
  fastify.setReplySerializer((payload, statusCode) => {
    t.same(payload, { foo: 'bar' })
    t.equal(statusCode, 200)
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
    t.error(err)
    t.equal(res.payload, '{"foo":"bar bar"}')
  })
})

test('reply should use the right serializer in encapsulated context', t => {
  t.plan(9)

  const fastify = Fastify()
  fastify.setReplySerializer((payload) => {
    t.same(payload, { foo: 'bar' })
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
      t.same(payload, { john: 'doo' })
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
      t.same(payload, { sweet: 'potato' })
      payload.sweet = 'potato potato'
      return JSON.stringify(payload)
    })
    done()
  }, { prefix: 'sub' })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, '{"foo":"bar bar"}')
  })

  fastify.inject({
    method: 'GET',
    url: '/sub'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, '{"john":"too too"}')
  })

  fastify.inject({
    method: 'GET',
    url: '/sub/sub'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, '{"sweet":"potato potato"}')
  })
})

test('reply should use the right serializer in deep encapsulated context', t => {
  t.plan(8)

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
      t.same(payload, { john: 'doo' })
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
        t.same(payload, { john: 'deep' })
        payload.john = 'deep deep'
        return JSON.stringify(payload)
      })
      done()
    })
    done()
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, '{"foo":"bar"}')
  })

  fastify.inject({
    method: 'GET',
    url: '/sub'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, '{"john":"too too"}')
  })

  fastify.inject({
    method: 'GET',
    url: '/deep'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, '{"john":"deep deep"}')
  })
})

test('reply should use the route serializer', t => {
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
          t.same(payload, { john: 'doo' })
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
    t.error(err)
    t.equal(res.payload, '{"john":"too too"}')
  })
})

test('cannot set the replySerializer when the server is running', t => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    try {
      fastify.setReplySerializer(() => {})
      t.fail('this serializer should not be setup')
    } catch (e) {
      t.equal(e.code, 'FST_ERR_INSTANCE_ALREADY_LISTENING')
    }
  })
})

test('reply should not call the custom serializer for errors and not found', t => {
  t.plan(9)

  const fastify = Fastify()
  fastify.setReplySerializer((payload, statusCode) => {
    t.same(payload, { foo: 'bar' })
    t.equal(statusCode, 200)
    return JSON.stringify(payload)
  })

  fastify.get('/', (req, reply) => { reply.send({ foo: 'bar' }) })
  fastify.get('/err', (req, reply) => { reply.send(new Error('an error')) })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.payload, '{"foo":"bar"}')
  })

  fastify.inject({
    method: 'GET',
    url: '/err'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
  })

  fastify.inject({
    method: 'GET',
    url: '/not-existing'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

test('reply.then', t => {
  t.plan(4)

  function request () {}

  t.test('without an error', t => {
    t.plan(1)

    const response = new Writable()
    const reply = new Reply(response, request)

    reply.then(function () {
      t.pass('fulfilled called')
    })

    response.destroy()
  })

  t.test('with an error', t => {
    t.plan(1)

    const response = new Writable()
    const reply = new Reply(response, request)
    const _err = new Error('kaboom')

    reply.then(function () {
      t.fail('fulfilled called')
    }, function (err) {
      t.equal(err, _err)
    })

    response.destroy(_err)
  })

  t.test('with error but without reject callback', t => {
    t.plan(1)

    const response = new Writable()
    const reply = new Reply(response, request)
    const _err = new Error('kaboom')

    reply.then(function () {
      t.fail('fulfilled called')
    })

    t.pass()

    response.destroy(_err)
  })

  t.test('with error, without reject callback, with logger', t => {
    t.plan(1)

    const response = new Writable()
    const reply = new Reply(response, request)
    // spy logger
    reply.log = {
      warn: (message) => {
        t.equal(message, 'unhandled rejection on reply.then')
      }
    }
    const _err = new Error('kaboom')

    reply.then(function () {
      t.fail('fulfilled called')
    })

    response.destroy(_err)
  })
})

test('reply.sent should read from response.writableEnded if it is defined', t => {
  t.plan(1)

  const reply = new Reply({ writableEnded: true }, {}, {})

  t.equal(reply.sent, true)
})

test('redirect to an invalid URL should not crash the server', async t => {
  const fastify = Fastify()
  fastify.route({
    method: 'GET',
    url: '/redirect',
    handler: (req, reply) => {
      reply.log.warn = function mockWarn (obj, message) {
        t.equal(message, 'Invalid character in header content ["location"]')
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
    t.equal(response.statusCode, 500)
    t.same(JSON.parse(body), {
      statusCode: 500,
      code: 'ERR_INVALID_CHAR',
      error: 'Internal Server Error',
      message: 'Invalid character in header content ["location"]'
    })
  }
  {
    const { response } = await doGet(`http://127.0.0.1:${fastify.server.address().port}/redirect?useCase=2`)
    t.equal(response.statusCode, 302)
    t.equal(response.headers.location, '/?key=a%E2%80%99b')
  }

  {
    const { response } = await doGet(`http://127.0.0.1:${fastify.server.address().port}/redirect?useCase=3`)
    t.equal(response.statusCode, 302)
    t.equal(response.headers.location, '/?key=ab')
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
        t.equal(message, 'Invalid character in header content ["smile-encoded"]', 'only the first invalid header is logged')
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
  t.equal(response.statusCode, 500)
  t.same(JSON.parse(body), {
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
        t.equal(message, 'Invalid character in header content ["smile"]', 'only the first invalid header is logged')
      }

      reply.header('smile', '😄')
      reply.send(new Error('user land error'))
    }
  })

  await fastify.listen({ port: 0 })

  const { response, body } = await doGet(`http://127.0.0.1:${fastify.server.address().port}/bad-headers`)
  t.equal(response.statusCode, 500)
  t.same(JSON.parse(body), {
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
        t.equal(message, 'Invalid character in header content ["smile"]', 'only the first invalid header is logged')
      }

      reply.header('smile', '😄')
      reply.send(new Error('user land error'))
    }
  })

  fastify.setErrorHandler(function (error, request, reply) {
    t.equal(error.message, 'user land error', 'custom error handler receives the error')
    reply.status(500).send({ ops: true })
  })

  await fastify.listen({ port: 0 })

  const { response, body } = await doGet(`http://127.0.0.1:${fastify.server.address().port}/bad-headers`)
  t.equal(response.statusCode, 500)
  t.same(JSON.parse(body), {
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
    setHeader: () => {},
    hasHeader: () => false,
    getHeader: () => undefined,
    writeHead: () => {
      const err = new Error('kaboom')
      err.code = 'ERR_HTTP_HEADERS_SENT'
      throw err
    },
    write: () => {},
    headersSent: true
  })

  const log = {
    warn: (msg) => {
      t.equal(msg, 'Reply was already sent, did you forget to "return reply" in the "/hello" (GET) route?')
    }
  }

  const reply = new Reply(response, { [kRouteContext]: { onSend: null }, raw: { url: '/hello', method: 'GET' } }, log)

  try {
    reply.send('')
  } catch (err) {
    t.equal(err.code, 'ERR_HTTP_HEADERS_SENT')
  }
})
