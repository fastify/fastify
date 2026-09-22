'use strict'

const fastify = require('../../fastify')({
  logger: false
})

const schema = {
  type: 'object',
  properties: {
    hello: {
      type: 'string'
    }
  }
}

fastify
  .get('/', function (req, reply) {
    const serialize = reply.compileSerializationSchema(schema, 200, 'application/json')
    reply.compileSerializationSchema(schema, 400, 'application/json')
    reply.compileSerializationSchema(schema, 200, 'application/vnd.custom+json')

    reply
      .header('content-type', 'application/json')
      .send(serialize({ hello: 'world' }))
  })

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) throw err
})
