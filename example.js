'use strict'

const fastify = require('.')()
const http = require('http')
const server = http.createServer(fastify)

const schema = {
  out: {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    }
  }
}

fastify
  .get('/', schema, function (req, reply) {
    reply(null, { hello: 'world' })
  })
  .post('/', schema, function (req, reply) {
    reply(null, { hello: 'world' })
  })

server.listen(3000, function (err) {
  if (err) {
    throw err
  }

  console.log(`server listening on ${server.address().port}`)
})
