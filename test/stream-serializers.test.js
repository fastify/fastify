'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const Reply = require('../lib/reply')

test('should serialize reply when response stream is ended', t => {
  t.plan(3)
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
    t.error(err)
    fastify.close()
  })
})
