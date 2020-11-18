'use strict'

const sget = require('simple-get').concat
const { test } = require('tap')
const Fastify = require('..')
const semver = require('semver')

process.removeAllListeners('warning')

test('Should emit a warning when accessing request.req instead of request.raw', t => {
  t.plan(4)

  process.on('warning', onWarning)
  function onWarning (warning) {
    t.strictEqual(warning.name, 'FastifyDeprecation')
    t.strictEqual(warning.code, 'FSTDEP001')
    t.strictEqual(warning.message, 'You are accessing the Node.js core request object via "request.req", Use "request.raw" instead.')
  }

  const fastify = Fastify()

  fastify.get('/', (request, reply) => {
    reply.send(request.req.method + request.req.method)
  })

  fastify.inject({
    method: 'GET',
    path: '/'
  }, (err, res) => {
    t.error(err)
    process.removeListener('warning', onWarning)
  })
})

test('Should emit a warning when accessing reply.res instead of reply.raw', t => {
  t.plan(4)

  process.on('warning', onWarning)
  function onWarning (warning) {
    t.strictEqual(warning.name, 'FastifyDeprecation')
    t.strictEqual(warning.code, 'FSTDEP002')
    t.strictEqual(warning.message, 'You are accessing the Node.js core response object via "reply.res", Use "reply.raw" instead.')
  }

  const fastify = Fastify()

  fastify.get('/', (request, reply) => {
    reply.send(reply.res.statusCode + reply.res.statusCode)
  })

  fastify.inject({
    method: 'GET',
    path: '/'
  }, (err, res) => {
    t.error(err)
    process.removeListener('warning', onWarning)
  })
})

test('Should emit a warning when using two arguments Content Type Parser instead of three arguments', t => {
  t.plan(7)

  process.on('warning', onWarning)
  function onWarning (warning) {
    t.strictEqual(warning.name, 'FastifyDeprecation')
    t.strictEqual(warning.code, 'FSTDEP003')
    t.strictEqual(warning.message, 'You are using the legacy Content Type Parser function signature. Use the one suggested in the documentation instead.')
  }

  const fastify = Fastify()

  fastify.addContentTypeParser('x/foo', function (req, done) {
    done(null, 'OK')
  })

  fastify.post('/', (request, reply) => {
    reply.send(request.body)
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'x/foo' },
      body: '{"hello":"world"}'
    }, (err, response, body) => {
      t.error(err)
      t.is(response.statusCode, 200)
      t.is(body.toString(), 'OK')
      process.removeListener('warning', onWarning)
      fastify.close()
    })
  })
})

test('Should emit a warning when using payload less preParsing hook', t => {
  t.plan(7)

  process.on('warning', onWarning)
  function onWarning (warning) {
    t.strictEqual(warning.name, 'FastifyDeprecation')
    t.strictEqual(warning.code, 'FSTDEP004')
    t.strictEqual(warning.message, 'You are using the legacy preParsing hook signature. Use the one suggested in the documentation instead.')
  }

  const fastify = Fastify()

  fastify.addHook('preParsing', function (request, reply, done) {
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.send('OK')
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.is(response.statusCode, 200)
      t.is(body.toString(), 'OK')
      process.removeListener('warning', onWarning)
      fastify.close()
    })
  })
})

if (semver.gte(process.versions.node, '13.0.0')) {
  test('Should emit a warning when accessing request.connection instead of request.socket on Node process greater than 13.0.0', t => {
    t.plan(4)

    process.on('warning', onWarning)
    function onWarning (warning) {
      t.strictEqual(warning.name, 'FastifyDeprecation')
      t.strictEqual(warning.code, 'FSTDEP005')
      t.strictEqual(warning.message, 'You are accessing the deprecated "request.connection" property. Use "request.socket" instead.')

      // removed listener before light-my-request emit second warning
      process.removeListener('warning', onWarning)
    }

    const fastify = Fastify()

    fastify.get('/', (request, reply) => {
      reply.send(request.connection)
    })

    fastify.inject({
      method: 'GET',
      path: '/'
    }, (err, res) => {
      t.error(err)
      process.removeListener('warning', onWarning)
    })
  })
}
