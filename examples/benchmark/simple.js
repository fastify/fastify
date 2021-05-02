'use strict'

const fastify = require('../fastify')({
  logger: false
})

const schema = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          hello: {
            type: 'string'
          }
        }
      }
    }
  }
}

fastify
  .get('/', schema, function (req, reply) {
    reply
      .send({ hello: 'world' })
  })

fastify.listen(3000, (err, address) => {
  if (err) throw err
})
