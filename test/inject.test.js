'use strict'

const t = require('tap')
const test = t.test
const Stream = require('stream')
const util = require('util')
const Fastify = require('..')
const FormData = require('form-data')

test('inject should exist', t => {
  t.plan(2)
  const fastify = Fastify()
  t.ok(fastify.inject)
  t.is(typeof fastify.inject, 'function')
})

test('should wait for the ready event', t => {
  t.plan(4)
  const fastify = Fastify()
  const payload = { hello: 'world' }

  fastify.register((instance, opts, done) => {
    instance.get('/', (req, reply) => {
      reply.send(payload)
    })

    setTimeout(done, 500)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.deepEqual(payload, JSON.parse(res.payload))
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], '17')
  })
})

test('inject get request', t => {
  t.plan(4)
  const fastify = Fastify()
  const payload = { hello: 'world' }

  fastify.get('/', (req, reply) => {
    reply.send(payload)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.deepEqual(payload, JSON.parse(res.payload))
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], '17')
  })
})

test('inject get request - code check', t => {
  t.plan(4)
  const fastify = Fastify()
  const payload = { hello: 'world' }

  fastify.get('/', (req, reply) => {
    reply.code(201).send(payload)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.deepEqual(payload, JSON.parse(res.payload))
    t.strictEqual(res.statusCode, 201)
    t.strictEqual(res.headers['content-length'], '17')
  })
})

test('inject get request - headers check', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.header('content-type', 'text/plain').send('')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual('', res.payload)
    t.strictEqual(res.headers['content-type'], 'text/plain')
    t.strictEqual(res.headers['content-length'], '0')
  })
})

test('inject get request - querystring', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send(req.query)
  })

  fastify.inject({
    method: 'GET',
    url: '/?hello=world'
  }, (err, res) => {
    t.error(err)
    t.deepEqual({ hello: 'world' }, JSON.parse(res.payload))
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], '17')
  })
})

test('inject get request - params', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/:hello', (req, reply) => {
    reply.send(req.params)
  })

  fastify.inject({
    method: 'GET',
    url: '/world'
  }, (err, res) => {
    t.error(err)
    t.deepEqual({ hello: 'world' }, JSON.parse(res.payload))
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], '17')
  })
})

test('inject get request - wildcard', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/test/*', (req, reply) => {
    reply.send(req.params)
  })

  fastify.inject({
    method: 'GET',
    url: '/test/wildcard'
  }, (err, res) => {
    t.error(err)
    t.deepEqual({ '*': 'wildcard' }, JSON.parse(res.payload))
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], '16')
  })
})

test('inject get request - headers', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send(req.headers)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    t.strictEqual('world', JSON.parse(res.payload).hello)
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], '69')
  })
})

test('inject post request', t => {
  t.plan(4)
  const fastify = Fastify()
  const payload = { hello: 'world' }

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: payload
  }, (err, res) => {
    t.error(err)
    t.deepEqual(payload, JSON.parse(res.payload))
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], '17')
  })
})

test('inject post request - send stream', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    headers: { 'content-type': 'application/json' },
    payload: getStream()
  }, (err, res) => {
    t.error(err)
    t.deepEqual('{"hello":"world"}', res.payload)
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], '17')
  })
})

test('inject get request - reply stream', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send(getStream())
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.deepEqual('{"hello":"world"}', res.payload)
    t.strictEqual(res.statusCode, 200)
  })
})

test('inject promisify - waiting for ready event', t => {
  t.plan(1)
  const fastify = Fastify()
  const payload = { hello: 'world' }

  fastify.get('/', (req, reply) => {
    reply.send(payload)
  })

  const injectParams = {
    method: 'GET',
    url: '/'
  }
  fastify.inject(injectParams)
    .then(res => {
      t.strictEqual(res.statusCode, 200)
    })
    .catch(t.fail)
})

test('inject promisify - after the ready event', t => {
  t.plan(2)
  const fastify = Fastify()
  const payload = { hello: 'world' }

  fastify.get('/', (req, reply) => {
    reply.send(payload)
  })

  fastify.ready(err => {
    t.error(err)

    const injectParams = {
      method: 'GET',
      url: '/'
    }
    fastify.inject(injectParams)
      .then(res => {
        t.strictEqual(res.statusCode, 200)
      })
      .catch(t.fail)
  })
})

test('inject promisify - when the server is up', t => {
  t.plan(2)
  const fastify = Fastify()
  const payload = { hello: 'world' }

  fastify.get('/', (req, reply) => {
    reply.send(payload)
  })

  fastify.ready(err => {
    t.error(err)

    // setTimeout because the ready event don't set "started" flag
    // in this iteration of the 'event loop'
    setTimeout(() => {
      const injectParams = {
        method: 'GET',
        url: '/'
      }
      fastify.inject(injectParams)
        .then(res => {
          t.strictEqual(res.statusCode, 200)
        })
        .catch(t.fail)
    }, 10)
  })
})

test('should reject in error case', t => {
  t.plan(1)
  const fastify = Fastify()

  const error = new Error('DOOM!')
  fastify.register((instance, opts, done) => {
    setTimeout(done, 500, error)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  })
    .catch(e => {
      t.strictEqual(e, error)
    })
})

test('inject a multipart request using form-body', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addContentTypeParser('*', function (req, payload, done) {
    let body = ''
    payload.on('data', d => {
      body += d
    })
    payload.on('end', () => {
      done(null, body)
    })
  })
  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  const form = new FormData()
  form.append('my_field', 'my value')

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: form
  })
    .then(response => {
      t.equal(response.statusCode, 200)
      t.ok(/Content-Disposition: form-data; name="my_field"/.test(response.payload))
    })
})

// https://github.com/hapijs/shot/blob/master/test/index.js#L836
function getStream () {
  const Read = function () {
    Stream.Readable.call(this)
  }
  util.inherits(Read, Stream.Readable)
  const word = '{"hello":"world"}'
  let i = 0

  Read.prototype._read = function (size) {
    this.push(word[i] ? word[i++] : null)
  }

  return new Read()
}

test('should error the promise if ready errors', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register((instance, opts) => {
    return Promise.reject(new Error('kaboom'))
  }).after(function () {
    t.pass('after is called')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }).then(() => {
    t.fail('this should not be called')
  }).catch(err => {
    t.ok(err)
    t.strictequal(err.message, 'kaboom')
  })
})

test('should throw error if callback specified and if ready errors', t => {
  t.plan(2)
  const fastify = Fastify()
  const error = new Error('kaboom')

  fastify.register((instance, opts) => {
    return Promise.reject(error)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, err => {
    t.ok(err)
    t.strictEqual(err, error)
  })
})

test('should support builder-style injection with ready app', async (t) => {
  t.plan(3)
  const fastify = Fastify()
  const payload = { hello: 'world' }

  fastify.get('/', (req, reply) => {
    reply.send(payload)
  })

  await fastify.ready()
  const res = await fastify.inject().get('/').end()
  t.deepEqual(payload, JSON.parse(res.payload))
  t.strictEqual(res.statusCode, 200)
  t.strictEqual(res.headers['content-length'], '17')
})

test('should support builder-style injection with non-ready app', async (t) => {
  t.plan(3)
  const fastify = Fastify()
  const payload = { hello: 'world' }

  fastify.get('/', (req, reply) => {
    reply.send(payload)
  })

  const res = await fastify.inject().get('/').end()
  t.deepEqual(payload, JSON.parse(res.payload))
  t.strictEqual(res.statusCode, 200)
  t.strictEqual(res.headers['content-length'], '17')
})

test('should handle errors in builder-style injection correctly', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.register((instance, opts, done) => {
    done(new Error('Kaboom'))
  })

  try {
    await fastify.inject().get('/')
  } catch (err) {
    t.ok(err)
    t.strictEqual(err.message, 'Kaboom')
  }
})
