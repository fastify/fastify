'use strict'

const fastify = require('../fastify')()

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
    reply.header('Content-Type', 'application-json').code(200)
    reply.reply(null, { hello: 'world' })
  })
  .post('/', schema, function (req, reply) {
    reply(null, { hello: 'world' })
  })
  .head('/', {}, function (req, reply) {
    reply(null)
  })
  .delete('/', schema, function (req, reply) {
    reply(null, { hello: 'world' })
  })
  .patch('/', schema, function (req, reply) {
    reply(null, { hello: 'world' })
  })

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
