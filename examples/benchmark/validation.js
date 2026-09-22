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
  },
  required: ['hello']
}

fastify
  .post('/', function (req, reply) {
    const validateBody = req.compileValidationSchema(schema, 'body')
    const validateQuery = req.compileValidationSchema(schema, 'querystring')

    reply.send({
      body: validateBody(req.body),
      query: validateQuery(req.query)
    })
  })

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) throw err
})
