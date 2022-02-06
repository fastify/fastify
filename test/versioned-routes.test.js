'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const sget = require('simple-get').concat
const http = require('http')
const split = require('split2')
const append = require('vary').append
const proxyquire = require('proxyquire')

test('Should register a versioned route', t => {
  t.plan(11)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { version: '1.2.0' },
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
    t.same(JSON.parse(res.payload), { hello: 'world' })
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': '1.2.x'
    }
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': '1.2.0'
    }
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': '1.2.1'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

test('Should register a versioned route via route constraints', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { version: '1.2.0' },
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
    t.same(JSON.parse(res.payload), { hello: 'world' })
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': '1.2.x'
    }
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
    t.equal(res.statusCode, 200)
  })
})

test('Should register the same route with different versions', t => {
  t.plan(8)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { version: '1.2.0' },
    handler: (req, reply) => {
      reply.send('1.2.0')
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { version: '1.3.0' },
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
    t.equal(res.statusCode, 200)
    t.equal(res.payload, '1.3.0')
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': '1.2.x'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.payload, '1.2.0')
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': '2.x'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
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
    constraints: { version: '1.2.0' },
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
    t.same(JSON.parse(res.payload), { hello: 'world' })
    t.equal(res.statusCode, 200)
  })
})

test('Versioned route but not version header should return a 404', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { version: '1.2.0' },
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

test('Should register a versioned route', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { version: '1.2.0' },
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
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'Accept-Version': '2.x'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 404)
    })
  })
})

test('Shorthand route declaration', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.get('/', { constraints: { version: '1.2.0' } }, (req, reply) => {
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
    t.same(JSON.parse(res.payload), { hello: 'world' })
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': '1.2.1'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

test('The not found handler should not erase the Accept-Version header', t => {
  t.plan(13)
  const fastify = Fastify()

  fastify.addHook('onRequest', function (req, reply, done) {
    t.same(req.headers['accept-version'], '2.x')
    done()
  })

  fastify.addHook('preValidation', function (req, reply, done) {
    t.same(req.headers['accept-version'], '2.x')
    done()
  })

  fastify.addHook('preHandler', function (req, reply, done) {
    t.same(req.headers['accept-version'], '2.x')
    done()
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { version: '1.2.0' },
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.setNotFoundHandler(function (req, reply) {
    t.same(req.headers['accept-version'], '2.x')
    // we check if the symbol is exposed on key or not
    for (const key in req.headers) {
      t.same(typeof key, 'string')
    }

    for (const key of Object.keys(req.headers)) {
      t.same(typeof key, 'string')
    }

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
    t.same(res.payload, 'not found handler')
    t.equal(res.statusCode, 404)
  })
})

test('Bad accept version (inject)', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { version: '1.2.0' },
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': 'a.b.c'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'Accept-Version': 12
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

test('Bas accept version (server)', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { version: '1.2.0' },
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
        'Accept-Version': 'a.b.c'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 404)
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'Accept-Version': 12
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 404)
    })
  })
})

test('test log stream', t => {
  t.plan(3)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    logger: {
      stream,
      level: 'info'
    }
  })

  fastify.get('/', { constraints: { version: '1.2.0' } }, function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    http.get({
      hostname: 'localhost',
      port: fastify.server.address().port,
      path: '/',
      method: 'GET',
      headers: {
        'Accept-Version': '1.x'
      }
    })

    stream.once('data', listenAtLogLine => {
      stream.once('data', line => {
        t.equal(line.req.version, '1.x')
        stream.once('data', line => {
          t.equal(line.req.version, '1.x')
        })
      })
    })
  })
})

test('Should register a versioned route with custom versioning strategy', t => {
  t.plan(8)

  const customVersioning = {
    name: 'version',
    storage: function () {
      let versions = {}
      return {
        get: (version) => { return versions[version] || null },
        set: (version, store) => { versions[version] = store },
        del: (version) => { delete versions[version] },
        empty: () => { versions = {} }
      }
    },
    deriveConstraint: (req, ctx) => {
      return req.headers.accept
    },
    mustMatchWhenDerived: true,
    validate: () => true
  }

  const fastify = Fastify({
    constraints: {
      version: customVersioning
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { version: 'application/vnd.example.api+json;version=2' },
    handler: (req, reply) => {
      reply.send({ hello: 'from route v2' })
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { version: 'application/vnd.example.api+json;version=3' },
    handler: (req, reply) => {
      reply.send({ hello: 'from route v3' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      Accept: 'application/vnd.example.api+json;version=2'
    }
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'from route v2' })
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      Accept: 'application/vnd.example.api+json;version=3'
    }
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'from route v3' })
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      Accept: 'application/vnd.example.api+json;version=4'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

test('Should get error using an invalid a versioned route, using default validation (deprecated versioning option)', t => {
  t.plan(1)

  const fastify = Fastify({
    versioning: {
      storage: function () {
        let versions = {}
        return {
          get: (version) => { return versions[version] || null },
          set: (version, store) => { versions[version] = store },
          del: (version) => { delete versions[version] },
          empty: () => { versions = {} }
        }
      },
      deriveVersion: (req, ctx) => {
        return req.headers.accept
      }
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { version: 'application/vnd.example.api+json;version=1' },
    handler: (req, reply) => {
      reply.send({ hello: 'cant match route v1' })
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    // not a string version
    constraints: { version: 2 },
    handler: (req, reply) => {
      reply.send({ hello: 'cant match route v2' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      Accept: 'application/vnd.example.api+json;version=2'
    }
  }, (err, res) => {
    t.equal(err.message, 'Version constraint should be a string.')
  })
})

test('Vary header check (for documentation example)', t => {
  t.plan(8)
  const fastify = Fastify()
  fastify.addHook('onSend', async (req, reply) => {
    if (req.headers['accept-version']) { // or the custom header you are using
      let value = reply.getHeader('Vary') || ''
      const header = Array.isArray(value) ? value.join(', ') : String(value)
      if ((value = append(header, 'Accept-Version'))) { // or the custom header you are using
        reply.header('Vary', value)
      }
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { version: '1.2.0' },
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
    t.same(JSON.parse(res.payload), { hello: 'world' })
    t.equal(res.statusCode, 200)
    t.equal(res.headers.vary, 'Accept-Version')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
    t.equal(res.statusCode, 200)
    t.equal(res.headers.vary, undefined)
  })
})

test('Should trigger a warning when a versioned route is registered via version option', t => {
  t.plan(4)

  function onWarning (code) {
    t.equal(code, 'FSTDEP008')
  }
  const warning = {
    emit: onWarning
  }

  const route = proxyquire('../lib/route', { './warnings': warning })
  const fastify = proxyquire('..', { './lib/route.js': route })()

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
    t.same(JSON.parse(res.payload), { hello: 'world' })
    t.equal(res.statusCode, 200)
  })
})
