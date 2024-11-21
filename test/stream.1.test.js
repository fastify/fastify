'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const fs = require('node:fs')
const Fastify = require('../fastify')

test('should respond with a stream', (t, done) => {
  t.plan(6)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    const stream = fs.createReadStream(__filename, 'utf8')
    reply.code(200).send(stream)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => { fastify.close() })

    sget(`http://localhost:${fastify.server.address().port}`, function (err, response, data) {
      t.assert.ifError(err)
      t.assert.strictEqual(response.headers['content-type'], undefined)
      t.assert.strictEqual(response.statusCode, 200)
      fs.readFile(__filename, (err, expected) => {
        t.assert.ifError(err)
        t.assert.strictEqual(expected.toString(), data.toString())
        done()
      })
    })
  })
})

test('should respond with a stream (error)', (t, done) => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/error', function (req, reply) {
    const stream = fs.createReadStream('not-existing-file', 'utf8')
    reply.code(200).send(stream)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => { fastify.close() })

    sget(`http://localhost:${fastify.server.address().port}/error`, function (err, response) {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 500)
      fastify.close()
      done()
    })
  })
})

test('should trigger the onSend hook', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send(fs.createReadStream(__filename, 'utf8'))
  })

  fastify.addHook('onSend', (req, reply, payload, done) => {
    t.assert.ok(payload._readableState)
    reply.header('Content-Type', 'application/javascript')
    done()
  })

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.equal(response.statusCode, 200)
  t.assert.equal(response.headers['content-type'], 'application/javascript')
  t.assert.equal(response.payload, fs.readFileSync(__filename, 'utf8'))
  fastify.close()
})

test('should trigger the onSend hook only twice if pumping the stream fails, first with the stream, second with the serialized error', (t, done) => {
  t.plan(5)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send(fs.createReadStream('not-existing-file', 'utf8'))
  })

  let counter = 0
  fastify.addHook('onSend', (req, reply, payload, done) => {
    if (counter === 0) {
      t.assert.ok(payload._readableState)
    } else if (counter === 1) {
      const error = JSON.parse(payload)
      t.assert.strictEqual(error.statusCode, 500)
    }
    counter++
    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => { fastify.close() })

    sget(`http://localhost:${fastify.server.address().port}`, function (err, response) {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 500)
      fastify.close()
      done()
    })
  })
})
