'use strict'

const { Readable } = require('node:stream')
const { test } = require('tap')
const fp = require('fastify-plugin')
const Fastify = require('..')

test('Should accept a custom genReqId function', t => {
  t.plan(4)

  const fastify = Fastify({
    genReqId: function (req) {
      return 'a'
    }
  })

  fastify.get('/', (req, reply) => {
    t.ok(req.id)
    reply.send({ id: req.id })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    fastify.inject({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.equal(payload.id, 'a')
      fastify.close()
    })
  })
})

test('Custom genReqId function gets raw request as argument', t => {
  t.plan(9)

  const REQUEST_ID = 'REQ-1234'

  const fastify = Fastify({
    genReqId: function (req) {
      t.notOk('id' in req)
      t.notOk('raw' in req)
      t.ok(req instanceof Readable)
      // http.IncomingMessage does have `rawHeaders` property, but FastifyRequest does not
      const index = req.rawHeaders.indexOf('x-request-id')
      const xReqId = req.rawHeaders[index + 1]
      t.equal(xReqId, REQUEST_ID)
      t.equal(req.headers['x-request-id'], REQUEST_ID)
      return xReqId
    }
  })

  fastify.get('/', (req, reply) => {
    t.equal(req.id, REQUEST_ID)
    reply.send({ id: req.id })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    fastify.inject({
      method: 'GET',
      headers: {
        'x-request-id': REQUEST_ID
      },
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.equal(payload.id, REQUEST_ID)
      fastify.close()
    })
  })
})

test('Should handle properly requestIdHeader option', t => {
  t.plan(4)

  t.equal(Fastify({ requestIdHeader: '' }).initialConfig.requestIdHeader, false)
  t.equal(Fastify({ requestIdHeader: false }).initialConfig.requestIdHeader, false)
  t.equal(Fastify({ requestIdHeader: true }).initialConfig.requestIdHeader, 'request-id')
  t.equal(Fastify({ requestIdHeader: 'x-request-id' }).initialConfig.requestIdHeader, 'x-request-id')
})

test('Should accept option to set genReqId with setGenReqId option', t => {
  t.plan(9)

  const fastify = Fastify({
    genReqId: function (req) {
      return 'base'
    }
  })

  fastify.register(function (instance, opts, next) {
    instance.setGenReqId(function (req) {
      return 'foo'
    })
    instance.get('/', (req, reply) => {
      t.ok(req.id)
      reply.send({ id: req.id })
    })
    next()
  }, { prefix: 'foo' })

  fastify.register(function (instance, opts, next) {
    instance.setGenReqId(function (req) {
      return 'bar'
    })
    instance.get('/', (req, reply) => {
      t.ok(req.id)
      reply.send({ id: req.id })
    })
    next()
  }, { prefix: 'bar' })

  fastify.get('/', (req, reply) => {
    t.ok(req.id)
    reply.send({ id: req.id })
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'base')
    fastify.close()
  })

  fastify.inject({
    method: 'GET',
    url: '/foo'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'foo')
    fastify.close()
  })

  fastify.inject({
    method: 'GET',
    url: '/bar'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'bar')
    fastify.close()
  })
})

test('Should encapsulate setGenReqId', t => {
  t.plan(12)

  const fastify = Fastify({
    genReqId: function (req) {
      return 'base'
    }
  })

  const bazInstance = function (instance, opts, next) {
    instance.register(barInstance, { prefix: 'baz' })

    instance.setGenReqId(function (req) {
      return 'baz'
    })
    instance.get('/', (req, reply) => {
      t.ok(req.id)
      reply.send({ id: req.id })
    })
    next()
  }

  const barInstance = function (instance, opts, next) {
    instance.setGenReqId(function (req) {
      return 'bar'
    })
    instance.get('/', (req, reply) => {
      t.ok(req.id)
      reply.send({ id: req.id })
    })
    next()
  }

  const fooInstance = function (instance, opts, next) {
    instance.register(bazInstance, { prefix: 'baz' })
    instance.register(barInstance, { prefix: 'bar' })

    instance.setGenReqId(function (req) {
      return 'foo'
    })

    instance.get('/', (req, reply) => {
      t.ok(req.id)
      reply.send({ id: req.id })
    })
    next()
  }

  fastify.register(fooInstance, { prefix: 'foo' })

  fastify.get('/', (req, reply) => {
    t.ok(req.id)
    reply.send({ id: req.id })
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'base')
    fastify.close()
  })

  fastify.inject({
    method: 'GET',
    url: '/foo'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'foo')
    fastify.close()
  })

  fastify.inject({
    method: 'GET',
    url: '/foo/bar'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'bar')
    fastify.close()
  })

  fastify.inject({
    method: 'GET',
    url: '/foo/baz'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'baz')
    fastify.close()
  })
})

test('Should encapsulate setGenReqId', t => {
  t.plan(12)

  const fastify = Fastify({
    genReqId: function (req) {
      return 'base'
    }
  })

  const bazInstance = function (instance, opts, next) {
    instance.register(barInstance, { prefix: 'baz' })

    instance.setGenReqId(function (req) {
      return 'baz'
    })
    instance.get('/', (req, reply) => {
      t.ok(req.id)
      reply.send({ id: req.id })
    })
    next()
  }

  const barInstance = function (instance, opts, next) {
    instance.setGenReqId(function (req) {
      return 'bar'
    })
    instance.get('/', (req, reply) => {
      t.ok(req.id)
      reply.send({ id: req.id })
    })
    next()
  }

  const fooInstance = function (instance, opts, next) {
    instance.register(bazInstance, { prefix: 'baz' })
    instance.register(barInstance, { prefix: 'bar' })

    instance.setGenReqId(function (req) {
      return 'foo'
    })

    instance.get('/', (req, reply) => {
      t.ok(req.id)
      reply.send({ id: req.id })
    })
    next()
  }

  fastify.register(fooInstance, { prefix: 'foo' })

  fastify.get('/', (req, reply) => {
    t.ok(req.id)
    reply.send({ id: req.id })
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'base')
    fastify.close()
  })

  fastify.inject({
    method: 'GET',
    url: '/foo'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'foo')
    fastify.close()
  })

  fastify.inject({
    method: 'GET',
    url: '/foo/bar'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'bar')
    fastify.close()
  })

  fastify.inject({
    method: 'GET',
    url: '/foo/baz'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'baz')
    fastify.close()
  })
})

test('Should not alter parent of genReqId', t => {
  t.plan(6)

  const fastify = Fastify()

  const fooInstance = function (instance, opts, next) {
    instance.setGenReqId(function (req) {
      return 'foo'
    })

    instance.get('/', (req, reply) => {
      t.ok(req.id)
      reply.send({ id: req.id })
    })
    next()
  }

  fastify.register(fooInstance, { prefix: 'foo' })

  fastify.get('/', (req, reply) => {
    t.ok(req.id)
    reply.send({ id: req.id })
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'req-1')
    fastify.close()
  })

  fastify.inject({
    method: 'GET',
    url: '/foo'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'foo')
    fastify.close()
  })
})

test('Should have child instance user parent genReqId', t => {
  t.plan(6)

  const fastify = Fastify({
    genReqId: function (req) {
      return 'foo'
    }
  })

  const fooInstance = function (instance, opts, next) {
    instance.get('/', (req, reply) => {
      t.ok(req.id)
      reply.send({ id: req.id })
    })
    next()
  }

  fastify.register(fooInstance, { prefix: 'foo' })

  fastify.get('/', (req, reply) => {
    t.ok(req.id)
    reply.send({ id: req.id })
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'foo')
    fastify.close()
  })

  fastify.inject({
    method: 'GET',
    url: '/foo'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'foo')
    fastify.close()
  })
})

test('genReqId set on root scope when using fastify-plugin', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.register(fp(function (fastify, options, done) {
    fastify.setGenReqId(function (req) {
      return 'not-encapsulated'
    })
    fastify.get('/not-encapsulated-1', (req, reply) => {
      t.ok(req.id)
      reply.send({ id: req.id })
    })
    done()
  }))

  fastify.get('/not-encapsulated-2', (req, reply) => {
    t.ok(req.id)
    reply.send({ id: req.id })
  })

  fastify.inject({
    method: 'GET',
    url: '/not-encapsulated-1'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'not-encapsulated')
    fastify.close()
  })

  fastify.inject({
    method: 'GET',
    url: '/not-encapsulated-2'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'not-encapsulated')
    fastify.close()
  })
})
