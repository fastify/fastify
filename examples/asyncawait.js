'use strict'

const fastify = require('../fastify')()

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

const result = async () => ({ hello: 'world' })

fastify
  .get('/await', schema, async (req, reply) => {
    reply.header('Content-Type', 'application/json').code(200)
    return result()
  })
  .get('/', schema, async (req, reply) => {
    reply.header('Content-Type', 'application/json').code(200)
    return { hello: 'world' }
  })

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
