'use strict'

const { connect } = require('net')
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
    t.type(request, fastify[kRequest])
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

  fastify.listen(0, function (err) {
    t.error(err)
    fastify.server.unref()

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
    client.write('Connection: close\r\n')
    client.write('\r\n\r\n')
  })
})

test('default clientError handler ignores sockets in destroyed state', t => {
  t.plan(1)

  const fastify = Fastify({
    bodyLimit: 1,
    keepAliveTimeout: 100,
    logger: {
      level: 'trace'
    }
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
  t.plan(1)

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
