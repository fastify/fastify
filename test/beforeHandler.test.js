'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('beforeHandler', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.post('/', {
    beforeHandler: (req, reply, done) => {
      req.body.beforeHandler = true
      done()
    }
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { beforeHandler: true, hello: 'world' })
  })
})

test('beforeHandler should be called after preHandler hook', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addHook('preHandler', (req, reply, next) => {
    req.body.check = 'a'
    next()
  })

  fastify.post('/', {
    beforeHandler: (req, reply, done) => {
      req.body.check += 'b'
      done()
    }
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { check: 'ab', hello: 'world' })
  })
})

test('beforeHandler should be unique per route', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', {
    beforeHandler: (req, reply, done) => {
      req.body.hello = 'earth'
      done()
    }
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.post('/no', (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'earth' })
  })

  fastify.inject({
    method: 'POST',
    url: '/no',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('beforeHandler should handle errors', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', {
    beforeHandler: (req, reply, done) => {
      done(new Error('kaboom'))
    }
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.equal(res.statusCode, 500)
    t.deepEqual(payload, {
      message: 'kaboom',
      error: 'Internal Server Error',
      statusCode: 500
    })
  })
})

test('beforeHandler should handle errors with custom status code', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', {
    beforeHandler: (req, reply, done) => {
      reply.code(401)
      done(new Error('go away'))
    }
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.equal(res.statusCode, 401)
    t.deepEqual(payload, {
      message: 'go away',
      error: 'Unauthorized',
      statusCode: 401
    })
  })
})

test('beforeHandler could accept an array of functions', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.post('/', {
    beforeHandler: [
      (req, reply, done) => {
        req.body.beforeHandler = 'a'
        done()
      },
      (req, reply, done) => {
        req.body.beforeHandler += 'b'
        done()
      }
    ]
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { beforeHandler: 'ab', hello: 'world' })
  })
})

test('beforeHandler does not interfere with preHandler', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('preHandler', (req, reply, next) => {
    req.body.check = 'a'
    next()
  })

  fastify.post('/', {
    beforeHandler: (req, reply, done) => {
      req.body.check += 'b'
      done()
    }
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.post('/no', (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'post',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { check: 'ab', hello: 'world' })
  })

  fastify.inject({
    method: 'post',
    url: '/no',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { check: 'a', hello: 'world' })
  })
})

test('beforeHandler should keep the context', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.decorate('foo', 42)

  fastify.post('/', {
    beforeHandler: function (req, reply, done) {
      t.strictEqual(this.foo, 42)
      this.foo += 1
      req.body.foo = this.foo
      done()
    }
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { foo: 43, hello: 'world' })
  })
})
