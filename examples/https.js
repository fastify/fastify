'use strict'

const fs = require('fs')
const fastify = require('../fastify')({
  https: {
    key: fs.readFileSync('../test/https/fastify.key'),
    cert: fs.readFileSync('../test/https/fastify.cert')
  }
})

const schema = {
  response: {
    '2xx': {
      type: 'object',
      properties: {
        hello: {
          type: 'string'
        }
      }
    }
  }
}

fastify
  .get('/', schema, function (req, reply) {
    reply.header('Content-Type', 'application/json').code(200)
    reply.send({ hello: 'world' })
  })

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
