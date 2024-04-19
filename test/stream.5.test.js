'use strict'

const t = require('tap')
const test = t.test
const proxyquire = require('proxyquire')
const fs = require('node:fs')
const Readable = require('node:stream').Readable
const sget = require('simple-get').concat
const Fastify = require('..')

test('should destroy stream when response is ended', t => {
  t.plan(4)
  const stream = require('node:stream')
  const fastify = Fastify()

  fastify.get('/error', function (req, reply) {
    const reallyLongStream = new stream.Readable({
      read: function () { },
      destroy: function (err, callback) {
        t.ok('called')
        callback(err)
      }
    })
    reply.code(200).send(reallyLongStream)
    reply.raw.end(Buffer.from('hello\n'))
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget(`http://localhost:${fastify.server.address().port}/error`, function (err, response) {
      t.error(err)
      t.equal(response.statusCode, 200)
    })
  })
})

test('should mark reply as sent before pumping the payload stream into response for async route handler', t => {
  t.plan(3)

  const handleRequest = proxyquire('../lib/handleRequest', {
    './wrapThenable': (thenable, reply) => {
      thenable.then(function (payload) {
        t.equal(reply.sent, true)
      })
    }
  })

  const route = proxyquire('../lib/route', {
    './handleRequest': handleRequest
  })

  const Fastify = proxyquire('..', {
    './lib/route': route
  })

  const fastify = Fastify()

  fastify.get('/', async function (req, reply) {
    const stream = fs.createReadStream(__filename, 'utf8')
    return reply.code(200).send(stream)
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, fs.readFileSync(__filename, 'utf8'))
    fastify.close()
  })
})

test('reply.send handles aborted requests', t => {
  t.plan(2)

  const spyLogger = {
    level: 'error',
    fatal: () => { },
    error: () => {
      t.fail('should not log an error')
    },
    warn: () => { },
    info: () => { },
    debug: () => { },
    trace: () => { },
    child: () => { return spyLogger }
  }
  const fastify = Fastify({
    logger: spyLogger
  })

  fastify.get('/', (req, reply) => {
    setTimeout(() => {
      const stream = new Readable({
        read: function () {
          this.push(null)
        }
      })
      reply.send(stream)
    }, 6)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    const port = fastify.server.address().port
    const http = require('node:http')
    const req = http.get(`http://localhost:${port}`)
      .on('error', (err) => {
        t.equal(err.code, 'ECONNRESET')
        fastify.close()
      })

    setTimeout(() => {
      req.abort()
    }, 1)
  })
})

test('request terminated should not crash fastify', t => {
  t.plan(10)

  const spyLogger = {
    level: 'error',
    fatal: () => { },
    error: () => {
      t.fail('should not log an error')
    },
    warn: () => { },
    info: () => { },
    debug: () => { },
    trace: () => { },
    child: () => { return spyLogger }
  }
  const fastify = Fastify({
    logger: spyLogger
  })

  fastify.get('/', async (req, reply) => {
    const stream = new Readable()
    stream._read = () => { }
    reply.header('content-type', 'text/html; charset=utf-8')
    reply.header('transfer-encoding', 'chunked')
    stream.push('<h1>HTML</h1>')

    reply.send(stream)

    await new Promise((resolve) => { setTimeout(resolve, 100).unref() })

    stream.push('<h1>should display on second stream</h1>')
    stream.push(null)
    return reply
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    const port = fastify.server.address().port
    const http = require('node:http')
    const req = http.get(`http://localhost:${port}`, function (res) {
      const { statusCode, headers } = res
      t.equal(statusCode, 200)
      t.equal(headers['content-type'], 'text/html; charset=utf-8')
      t.equal(headers['transfer-encoding'], 'chunked')
      res.on('data', function (chunk) {
        t.equal(chunk.toString(), '<h1>HTML</h1>')
      })

      setTimeout(() => {
        req.destroy()

        // the server is not crash, we can connect it
        http.get(`http://localhost:${port}`, function (res) {
          const { statusCode, headers } = res
          t.equal(statusCode, 200)
          t.equal(headers['content-type'], 'text/html; charset=utf-8')
          t.equal(headers['transfer-encoding'], 'chunked')
          let payload = ''
          res.on('data', function (chunk) {
            payload += chunk.toString()
          })
          res.on('end', function () {
            t.equal(payload, '<h1>HTML</h1><h1>should display on second stream</h1>')
            t.pass('should end properly')
          })
        })
      }, 1)
    })
  })
})
