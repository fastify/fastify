'use strict'

const fastify = require('../fastify')({
  logger: false
})

const Readable = require('stream').Readable

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
    const stream = Readable.from(['hello world'])
    reply.send(stream)
  })

fastify.listen(3000, (err, address) => {
  if (err) throw err
  fastify.log.info(`server listening on ${address}`)
})
