'use strict'

const fastify = require('../fastify')({
  logger: true
})

fastify.register(require('../lib/timing-plugin'))

fastify.get('/', function (req, reply) {
  reply.send({ hello: 'world' })
})

fastify.get('/slow', function (req, reply) {
  setTimeout(() => {
    reply.send({ message: 'slow response' })
  }, 100)
})

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    throw err
  }
  console.log(`Server listening at ${address}`)
  console.log(`\nExample usage:`)
  console.log(`  GET /          - Basic request with X-Response-Time header`)
  console.log(`  GET /slow      - Request with 100ms delay`)
  console.log(`\nTo use custom header name, register the plugin with options:`)
  console.log(`  fastify.register(require('../lib/timing-plugin'), {`)
  console.log(`    headerName: 'X-Custom-Response-Time'`)
  console.log(`  })`)
})
