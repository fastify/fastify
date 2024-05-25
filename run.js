'use strict'
const Fastify = require('.')

const fastify = Fastify({ http2: true })

fastify.addHook('onSend', (request, reply, payload, done) => {
  reply.writeEarlyHints({ Link: '</style.css>; rel=preload; as=style' })
  done()
})

fastify.get('/', function (request, reply) {
  reply.send('Hello, world!')
})

fastify.listen({ port: 3000 }, err => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log('Server listening on port 3000')
})
