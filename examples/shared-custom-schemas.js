'use strict'

const fastify = require('../fastify')()

const Joi = require('joi')

const compile = schema => data => {
  return Joi.validate(data, schema)
}
fastify.setSchemaCompiler(compile)
fastify.setSchemaResolver((keyRef, allSchemas) => {
  return allSchemas[keyRef]
})

fastify
  .addSchema(
    Joi.object().keys({
      hello: Joi.string().required()
    }).required(),
    'hello-world'
  )
  .post('/the/url', { schema: { body: 'hello-world' } }, async function (req, reply) {
    return req.body
  })

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
