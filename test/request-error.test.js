'use strict'

const { connect } = require('net')
const sget = require('simple-get').concat
const t = require('tap')
const test = t.test
const Fastify = require('..')
const { kRequest } = require('../lib/symbols.js')

test('default 400 on request error', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.post('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    simulate: {
      error: true
    },
    body: {
      text: '12345678901234567890123456789012345678901234567890'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.same(JSON.parse(res.payload), {
      error: 'Bad Request',
      message: 'Simulated',
      statusCode: 400
    })
  })
})

test('default 400 on request error with custom error handler', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.setErrorHandler(function (err, request, reply) {
    t.type(request, 'object')
    t.type(request, fastify[kRequest].parent)
    reply
      .code(err.statusCode)
      .type('application/json; charset=utf-8')
      .send(err)
  })

  fastify.post('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    simulate: {
      error: true
    },
    body: {
      text: '12345678901234567890123456789012345678901234567890'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.same(JSON.parse(res.payload), {
      error: 'Bad Request',
      message: 'Simulated',
      statusCode: 400
    })
  })
})

test('default clientError handler ignores ECONNRESET', t => {
  t.plan(3)

  let logs = ''
  let response = ''

  const fastify = Fastify({
    bodyLimit: 1,
    keepAliveTimeout: 100,
    logger: {
      level: 'trace',
      stream: {
        write () {
          logs += JSON.stringify(arguments)
        }
      }
    }
  })

  fastify.get('/', (request, reply) => {
    reply.send('OK')

    process.nextTick(() => {
      const error = new Error()
      error.code = 'ECONNRESET'

      fastify.server.emit('clientError', error, request.raw.socket)
    })
  })

  fastify.listen({ port: 0 }, function (err) {
    t.error(err)
    t.teardown(() => { fastify.close() })

    const client = connect(fastify.server.address().port)

    client.on('data', chunk => {
      response += chunk.toString('utf-8')
    })

    client.on('end', () => {
      t.match(response, /^HTTP\/1.1 200 OK/)
      t.notMatch(logs, /ECONNRESET/)
    })

    client.resume()
    client.write('GET / HTTP/1.1\r\n')
    client.write('Host: example.com\r\n')
    client.write('Connection: close\r\n')
    client.write('\r\n\r\n')
  })
})

test('default clientError handler ignores sockets in destroyed state', t => {
  t.plan(1)

  const fastify = Fastify({
    bodyLimit: 1,
    keepAliveTimeout: 100
  })
  fastify.server.on('clientError', () => {
    // this handler is called after default handler, so we can make sure end was not called
    t.pass()
  })
  fastify.server.emit('clientError', new Error(), {
    destroyed: true,
    end () {
      t.fail('end should not be called')
    },
    destroy () {
      t.fail('destroy should not be called')
    }
  })
})

test('default clientError handler destroys sockets in writable state', t => {
  t.plan(2)

  const fastify = Fastify({
    bodyLimit: 1,
    keepAliveTimeout: 100
  })

  fastify.server.emit('clientError', new Error(), {
    destroyed: false,
    writable: true,
    encrypted: true,
    end () {
      t.fail('end should not be called')
    },
    destroy () {
      t.pass('destroy should be called')
    },
    write (response) {
      t.match(response, /^HTTP\/1.1 400 Bad Request/)
    }
  })
})

test('default clientError handler destroys http sockets in non-writable state', t => {
  t.plan(1)

  const fastify = Fastify({
    bodyLimit: 1,
    keepAliveTimeout: 100
  })

  fastify.server.emit('clientError', new Error(), {
    destroyed: false,
    writable: false,
    end () {
      t.fail('end should not be called')
    },
    destroy () {
      t.pass('destroy should be called')
    },
    write (response) {
      t.fail('write should not be called')
    }
  })
})

test('error handler binding', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.setErrorHandler(function (err, request, reply) {
    t.equal(this, fastify)
    reply
      .code(err.statusCode)
      .type('application/json; charset=utf-8')
      .send(err)
  })

  fastify.post('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    simulate: {
      error: true
    },
    body: {
      text: '12345678901234567890123456789012345678901234567890'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.same(JSON.parse(res.payload), {
      error: 'Bad Request',
      message: 'Simulated',
      statusCode: 400
    })
  })
})

test('encapsulated error handler binding', t => {
  t.plan(7)

  const fastify = Fastify()

  fastify.register(function (app, opts, done) {
    app.decorate('hello', 'world')
    t.equal(app.hello, 'world')
    app.post('/', function (req, reply) {
      reply.send({ hello: 'world' })
    })
    app.setErrorHandler(function (err, request, reply) {
      t.equal(this.hello, 'world')
      reply
        .code(err.statusCode)
        .type('application/json; charset=utf-8')
        .send(err)
    })
    done()
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    simulate: {
      error: true
    },
    body: {
      text: '12345678901234567890123456789012345678901234567890'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.same(res.json(), {
      error: 'Bad Request',
      message: 'Simulated',
      statusCode: 400
    })
    t.equal(fastify.hello, undefined)
  })
})

test('default clientError replies with bad request on reused keep-alive connection', t => {
  t.plan(2)

  let response = ''

  const fastify = Fastify({
    bodyLimit: 1,
    keepAliveTimeout: 100
  })

  fastify.get('/', (request, reply) => {
    reply.send('OK\n')
  })

  fastify.listen({ port: 0 }, function (err) {
    t.error(err)
    fastify.server.unref()

    const client = connect(fastify.server.address().port)

    client.on('data', chunk => {
      response += chunk.toString('utf-8')
    })

    client.on('end', () => {
      t.match(response, /^HTTP\/1.1 200 OK.*HTTP\/1.1 400 Bad Request/s)
    })

    client.resume()
    client.write('GET / HTTP/1.1\r\n')
    client.write('Host: example.com\r\n')
    client.write('\r\n\r\n')
    client.write('GET /?a b HTTP/1.1\r\n')
    client.write('Host: example.com\r\n')
    client.write('Connection: close\r\n')
    client.write('\r\n\r\n')
  })
})

test('request.routeOptions should be immutable', t => {
  t.plan(14)
  const fastify = Fastify()
  const handler = function (req, res) {
    t.equal('POST', req.routeOptions.method)
    t.equal('/', req.routeOptions.url)
    t.throws(() => { req.routeOptions = null }, new TypeError('Cannot set property routeOptions of #<Request> which has only a getter'))
    t.throws(() => { req.routeOptions.method = 'INVALID' }, new TypeError('Cannot assign to read only property \'method\' of object \'#<Object>\''))
    t.throws(() => { req.routeOptions.url = '//' }, new TypeError('Cannot assign to read only property \'url\' of object \'#<Object>\''))
    t.throws(() => { req.routeOptions.bodyLimit = 0xDEADBEEF }, new TypeError('Cannot assign to read only property \'bodyLimit\' of object \'#<Object>\''))
    t.throws(() => { req.routeOptions.attachValidation = true }, new TypeError('Cannot assign to read only property \'attachValidation\' of object \'#<Object>\''))
    t.throws(() => { req.routeOptions.logLevel = 'invalid' }, new TypeError('Cannot assign to read only property \'logLevel\' of object \'#<Object>\''))
    t.throws(() => { req.routeOptions.version = '95.0.1' }, new TypeError('Cannot assign to read only property \'version\' of object \'#<Object>\''))
    t.throws(() => { req.routeOptions.prefixTrailingSlash = true }, new TypeError('Cannot assign to read only property \'prefixTrailingSlash\' of object \'#<Object>\''))
    t.throws(() => { req.routeOptions.newAttribute = {} }, new TypeError('Cannot add property newAttribute, object is not extensible'))

    for (const key of Object.keys(req.routeOptions)) {
      if (typeof req.routeOptions[key] === 'object' && req.routeOptions[key] !== null) {
        t.fail('Object.freeze must run recursively on nested structures to ensure that routeOptions is immutable.')
      }
    }

    res.send({})
  }
  fastify.post('/', {
    bodyLimit: 1000,
    handler
  })
  fastify.listen({ port: 0 }, function (err) {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: [],
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
    })
  })
})

test('test request.routeOptions.version', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.route({
    method: 'POST',
    url: '/version',
    constraints: { version: '1.2.0' },
    handler: function (request, reply) {
      t.equal('1.2.0', request.routeOptions.version)
      reply.send({})
    }
  })

  fastify.route({
    method: 'POST',
    url: '/version-undefined',
    handler: function (request, reply) {
      t.equal(undefined, request.routeOptions.version)
      reply.send({})
    }
  })
  fastify.listen({ port: 0 }, function (err) {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/version',
      headers: { 'Content-Type': 'application/json', 'Accept-Version': '1.2.0' },
      body: [],
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/version-undefined',
      headers: { 'Content-Type': 'application/json' },
      body: [],
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
    })
  })
})
