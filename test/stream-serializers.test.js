'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const Reply = require('../lib/reply')

test('should serialize reply when response stream is ended', (t, done) => {
  t.plan(1)
  const stream = require('node:stream')
  const fastify = Fastify({
    logger: {
      serializers: {
        res (reply) {
          t.type(reply, Reply)
          return reply
        }
      }
    }
  })

  fastify.get('/error', function (req, reply) {
    const reallyLongStream = new stream.Readable({
      read: () => { }
    })
    reply.code(200).send(reallyLongStream)
    reply.raw.end(Buffer.from('hello\n'))
  })

  fastify.inject({
    url: '/error',
    method: 'GET'
  }, (err) => {
    t.assert.ifError(err)
    fastify.close()
    done()
  })
})
