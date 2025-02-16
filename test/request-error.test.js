'use strict'

const { connect } = require('node:net')
const sget = require('simple-get').concat
const { test } = require('node:test')
const Fastify = require('..')
const { kRequest } = require('../lib/symbols.js')

test('default 400 on request error', (t, done) => {
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
    t.assert.ifError(err)
    t.assert.strictEqual(res.statusCode, 400)
    t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
    t.assert.deepStrictEqual(JSON.parse(res.payload), {
      error: 'Bad Request',
      message: 'Simulated',
      statusCode: 400
    })
    done()
  })
})

test('default 400 on request error with custom error handler', (t, done) => {
  t.plan(6)

  const fastify = Fastify()

  fastify.setErrorHandler(function (err, request, reply) {
    t.assert.strictEqual(typeof request, 'object')
    t.assert.strictEqual(request instanceof fastify[kRequest].parent, true)
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
    t.assert.ifError(err)
    t.assert.strictEqual(res.statusCode, 400)
    t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
    t.assert.deepStrictEqual(JSON.parse(res.payload), {
      error: 'Bad Request',
      message: 'Simulated',
      statusCode: 400
    })
    done()
  })
})

test('default clientError handler ignores ECONNRESET', (t, done) => {
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
    t.assert.ifError(err)
    t.after(() => fastify.close())

    const client = connect(fastify.server.address().port)

    client.on('data', chunk => {
      response += chunk.toString('utf-8')
    })

    client.on('end', () => {
      t.assert.match(response, /^HTTP\/1.1 200 OK/)
      t.assert.notEqual(logs, /ECONNRESET/)
      done()
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
    t.assert.ok('end should not be called')
  })
  fastify.server.emit('clientError', new Error(), {
    destroyed: true,
    end () {
      t.assert.fail('end should not be called')
    },
    destroy () {
      t.assert.fail('destroy should not be called')
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
      t.assert.fail('end should not be called')
    },
    destroy () {
      t.assert.ok('destroy should be called')
    },
    write (response) {
      t.assert.match(response, /^HTTP\/1.1 400 Bad Request/)
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
      t.assert.fail('end should not be called')
    },
    destroy () {
      t.assert.ok('destroy should be called')
    },
    write (response) {
      t.assert.fail('write should not be called')
    }
  })
})

test('error handler binding', (t, done) => {
  t.plan(5)

  const fastify = Fastify()

  fastify.setErrorHandler(function (err, request, reply) {
    t.assert.strictEqual(this, fastify)
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
    t.assert.ifError(err)
    t.assert.strictEqual(res.statusCode, 400)
    t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
    t.assert.deepStrictEqual(JSON.parse(res.payload), {
      error: 'Bad Request',
      message: 'Simulated',
      statusCode: 400
    })
    done()
  })
})

test('encapsulated error handler binding', (t, done) => {
  t.plan(7)

  const fastify = Fastify()

  fastify.register(function (app, opts, done) {
    app.decorate('hello', 'world')
    t.assert.strictEqual(app.hello, 'world')
    app.post('/', function (req, reply) {
      reply.send({ hello: 'world' })
    })
    app.setErrorHandler(function (err, request, reply) {
      t.assert.strictEqual(this.hello, 'world')
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
    t.assert.ifError(err)
    t.assert.strictEqual(res.statusCode, 400)
    t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
    t.assert.deepStrictEqual(res.json(), {
      error: 'Bad Request',
      message: 'Simulated',
      statusCode: 400
    })
    t.assert.strictEqual(fastify.hello, undefined)
    done()
  })
})

test('default clientError replies with bad request on reused keep-alive connection', (t, done) => {
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
    t.assert.ifError(err)
    fastify.server.unref()

    const client = connect(fastify.server.address().port)

    client.on('data', chunk => {
      response += chunk.toString('utf-8')
    })

    client.on('end', () => {
      t.assert.match(response, /^HTTP\/1.1 200 OK.*HTTP\/1.1 400 Bad Request/s)
      done()
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

test('request.routeOptions should be immutable', (t, done) => {
  t.plan(14)
  const fastify = Fastify()
  const handler = function (req, res) {
    t.assert.strictEqual('POST', req.routeOptions.method)
    t.assert.strictEqual('/', req.routeOptions.url)
    t.assert.throws(() => { req.routeOptions = null }, new TypeError('Cannot set property routeOptions of #<Request> which has only a getter'))
    t.assert.throws(() => { req.routeOptions.method = 'INVALID' }, new TypeError('Cannot assign to read only property \'method\' of object \'#<Object>\''))
    t.assert.throws(() => { req.routeOptions.url = '//' }, new TypeError('Cannot assign to read only property \'url\' of object \'#<Object>\''))
    t.assert.throws(() => { req.routeOptions.bodyLimit = 0xDEADBEEF }, new TypeError('Cannot assign to read only property \'bodyLimit\' of object \'#<Object>\''))
    t.assert.throws(() => { req.routeOptions.attachValidation = true }, new TypeError('Cannot assign to read only property \'attachValidation\' of object \'#<Object>\''))
    t.assert.throws(() => { req.routeOptions.logLevel = 'invalid' }, new TypeError('Cannot assign to read only property \'logLevel\' of object \'#<Object>\''))
    t.assert.throws(() => { req.routeOptions.version = '95.0.1' }, new TypeError('Cannot assign to read only property \'version\' of object \'#<Object>\''))
    t.assert.throws(() => { req.routeOptions.prefixTrailingSlash = true }, new TypeError('Cannot assign to read only property \'prefixTrailingSlash\' of object \'#<Object>\''))
    t.assert.throws(() => { req.routeOptions.newAttribute = {} }, new TypeError('Cannot add property newAttribute, object is not extensible'))

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
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: [],
      json: true
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      done()
    })
  })
})

test('request.routeOptions.method is an uppercase string /1', (t, done) => {
  t.plan(4)
  const fastify = Fastify()
  const handler = function (req, res) {
    t.assert.strictEqual('POST', req.routeOptions.method)
    res.send({})
  }

  fastify.post('/', {
    bodyLimit: 1000,
    handler
  })
  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: [],
      json: true
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      done()
    })
  })
})

test('request.routeOptions.method is an uppercase string /2', (t, done) => {
  t.plan(4)
  const fastify = Fastify()
  const handler = function (req, res) {
    t.assert.strictEqual('POST', req.routeOptions.method)
    res.send({})
  }

  fastify.route({
    url: '/',
    method: 'POST',
    bodyLimit: 1000,
    handler
  })
  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: [],
      json: true
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      done()
    })
  })
})

test('request.routeOptions.method is an uppercase string /3', (t, done) => {
  t.plan(4)
  const fastify = Fastify()
  const handler = function (req, res) {
    t.assert.strictEqual('POST', req.routeOptions.method)
    res.send({})
  }

  fastify.route({
    url: '/',
    method: 'pOSt',
    bodyLimit: 1000,
    handler
  })
  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: [],
      json: true
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      done()
    })
  })
})

test('request.routeOptions.method is an array with uppercase string', (t, done) => {
  t.plan(4)
  const fastify = Fastify()
  const handler = function (req, res) {
    t.assert.deepStrictEqual(['POST'], req.routeOptions.method)
    res.send({})
  }

  fastify.route({
    url: '/',
    method: ['pOSt'],
    bodyLimit: 1000,
    handler
  })
  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: [],
      json: true
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      done()
    })
  })
})

test('test request.routeOptions.version', (t, done) => {
  t.plan(7)
  const fastify = Fastify()

  fastify.route({
    method: 'POST',
    url: '/version',
    constraints: { version: '1.2.0' },
    handler: function (request, reply) {
      t.assert.strictEqual('1.2.0', request.routeOptions.version)
      reply.send({})
    }
  })

  fastify.route({
    method: 'POST',
    url: '/version-undefined',
    handler: function (request, reply) {
      t.assert.strictEqual(undefined, request.routeOptions.version)
      reply.send({})
    }
  })
  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    let pending = 2

    function completed () {
      if (--pending === 0) {
        done()
      }
    }

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/version',
      headers: { 'Content-Type': 'application/json', 'Accept-Version': '1.2.0' },
      body: [],
      json: true
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      completed()
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/version-undefined',
      headers: { 'Content-Type': 'application/json' },
      body: [],
      json: true
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      completed()
    })
  })
})
