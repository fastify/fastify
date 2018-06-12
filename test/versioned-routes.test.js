'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const sget = require('simple-get').concat

test('Should register a versioned route', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    version: '1.2.0',
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': '1.x'
    }
  }, (err, res) => {
    t.error(err)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
    t.strictEqual(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': '1.2.1'
    }
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 404)
  })
})

test('Should register the same route with different versions', t => {
  t.plan(8)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    version: '1.2.0',
    handler: (req, reply) => {
      reply.send('1.2.0')
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    version: '1.3.0',
    handler: (req, reply) => {
      reply.send('1.3.0')
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': '1.x'
    }
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.payload, '1.3.0')
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': '1.2.x'
    }
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.payload, '1.2.0')
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': '2.x'
    }
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 404)
  })
})

test('The versioned route should take precedence', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.send({ winter: 'is coming' })
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    version: '1.2.0',
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': '1.x'
    }
  }, (err, res) => {
    t.error(err)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
    t.strictEqual(res.statusCode, 200)
  })
})

test('Versioned route but not version header should return a 404', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    version: '1.2.0',
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 404)
  })
})

test('Should register a versioned route', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    version: '1.2.0',
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'Accept-Version': '1.x'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'Accept-Version': '2.x'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
    })
  })
})

test('Shorthand route declaration', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.get('/', { version: '1.2.0' }, (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': '1.x'
    }
  }, (err, res) => {
    t.error(err)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
    t.strictEqual(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': '1.2.1'
    }
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 404)
  })
})

test('The not found handler should not use the Accept-Version header', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    version: '1.2.0',
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.setNotFoundHandler(function (req, reply) {
    t.notOk(req.headers['accept-version'])
    reply.code(404).send('not found handler')
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': '2.x'
    }
  }, (err, res) => {
    t.error(err)
    t.deepEqual(res.payload, 'not found handler')
    t.strictEqual(res.statusCode, 404)
  })
})
