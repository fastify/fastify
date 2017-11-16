'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fs = require('fs')
const resolve = require('path').resolve
const zlib = require('zlib')
const pump = require('pump')
const Fastify = require('..')

test('should respond with a stream', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    const stream = fs.createReadStream(process.cwd() + '/test/stream.test.js', 'utf8')
    reply.code(200).send(stream)
  })

  fastify.get('/error', function (req, reply) {
    const stream = fs.createReadStream('not-existing-file', 'utf8')
    reply.code(200).send(stream)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget(`http://localhost:${fastify.server.address().port}`, function (err, response) {
      t.error(err)
      t.strictEqual(response.headers['content-type'], 'application/octet-stream')
      t.strictEqual(response.statusCode, 200)

      response.on('error', err => {
        t.error(err)
      })
      response.on('end', () => {
        t.pass('Correctly close the stream')
      })
    })

    sget(`http://localhost:${fastify.server.address().port}/error`, function (err, response) {
      t.type(err, Error)
      t.equal(err.code, 'ECONNRESET')
      t.pass('Correctly close the stream')
    })
  })
})

test('onSend hook stream', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.addHook('onSend', (req, reply, payload, next) => {
    reply.header('Content-Encoding', 'gzip')
    next(null, pump(
      fs.createReadStream(resolve(process.cwd() + '/test/stream.test.js'), 'utf8'),
      zlib.createGzip(),
      t.error
    ))
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, res => {
    t.strictEqual(res.headers['content-encoding'], 'gzip')
    const file = fs.readFileSync(resolve(process.cwd() + '/test/stream.test.js'), 'utf8')
    const payload = zlib.gunzipSync(res.rawPayload)
    t.strictEqual(payload.toString('utf-8'), file)
    fastify.close()
  })
})
