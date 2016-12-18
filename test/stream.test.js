'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const fs = require('fs')
const fastify = require('..')()

test('should respond with a stream', t => {
  t.plan(1)
  try {
    fastify.get('/', function (req, reply) {
      const stream = fs.createReadStream(process.cwd() + '/test/stream.test.js', 'utf8')
      reply.code(200).send(stream)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('should respond with a stream', t => {
  t.plan(1)
  try {
    fastify.get('/error', function (req, reply) {
      const stream = fs.createReadStream('not-existing-file', 'utf8')
      reply.code(200).send(stream)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('should get a stream response', t => {
    t.plan(3)
    request(`http://localhost:${fastify.server.address().port}`)
      .on('response', response => {
        t.strictEqual(response.headers['content-type'], 'application/octet-stream')
        t.strictEqual(response.statusCode, 200)
      })
      .on('error', err => {
        t.error(err)
      })
      .on('end', () => {
        t.pass('Correctly close the stream')
      })
  })

  test('should get an errored stream response', t => {
    t.plan(2)
    request(`http://localhost:${fastify.server.address().port}/error`)
      .on('response', response => {
        t.fail()
      })
      .on('error', err => {
        t.type(err, Error)
        t.pass('Correctly close the stream')
      })
      .on('end', () => {
        t.fail()
      })
  })
})
