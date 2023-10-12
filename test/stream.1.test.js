'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fs = require('node:fs')
const Fastify = require('../fastify')

test('should respond with a stream', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    const stream = fs.createReadStream(__filename, 'utf8')
    reply.code(200).send(stream)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget(`http://localhost:${fastify.server.address().port}`, function (err, response, data) {
      t.error(err)
      t.equal(response.headers['content-type'], undefined)
      t.equal(response.statusCode, 200)

      fs.readFile(__filename, (err, expected) => {
        t.error(err)
        t.equal(expected.toString(), data.toString())
      })
    })
  })
})

test('should respond with a stream (error)', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/error', function (req, reply) {
    const stream = fs.createReadStream('not-existing-file', 'utf8')
    reply.code(200).send(stream)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget(`http://localhost:${fastify.server.address().port}/error`, function (err, response) {
      t.error(err)
      t.equal(response.statusCode, 500)
    })
  })
})

test('should trigger the onSend hook', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send(fs.createReadStream(__filename, 'utf8'))
  })

  fastify.addHook('onSend', (req, reply, payload, done) => {
    t.ok(payload._readableState)
    reply.header('Content-Type', 'application/javascript')
    done()
  })

  fastify.inject({
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.headers['content-type'], 'application/javascript')
    t.equal(res.payload, fs.readFileSync(__filename, 'utf8'))
    fastify.close()
  })
})

test('should trigger the onSend hook only twice if pumping the stream fails, first with the stream, second with the serialized error', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send(fs.createReadStream('not-existing-file', 'utf8'))
  })

  let counter = 0
  fastify.addHook('onSend', (req, reply, payload, done) => {
    if (counter === 0) {
      t.ok(payload._readableState)
    } else if (counter === 1) {
      const error = JSON.parse(payload)
      t.equal(error.statusCode, 500)
    }
    counter++
    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget(`http://localhost:${fastify.server.address().port}`, function (err, response) {
      t.error(err)
      t.equal(response.statusCode, 500)
    })
  })
})
