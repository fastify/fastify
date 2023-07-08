'use strict'

const net = require('net')
const t = require('tap')
const Fastify = require('../fastify')

t.test('Will return 505 HTTP error if HTTP version (2.0 when server is 1.1) is not supported', t => {
  const fastify = Fastify()

  t.teardown(fastify.close.bind(fastify))

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    const port = fastify.server.address().port
    const client = net.createConnection({ port }, () => {
      client.write('GET / HTTP/2.0\r\nHost: example.com\r\n\r\n')

      client.once('data', data => {
        t.match(data.toString(), /505 HTTP Version Not Supported/i)
        client.end(() => {
          t.end()
        })
      })
    })
  })
})
