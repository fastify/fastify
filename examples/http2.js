'use strict'

const fs = require('fs')
const path = require('path')
const fastify = require('../fastify')({
  http2: true,
  https: {
    key: fs.readFileSync(path.join(__dirname, '../test/https/fastify.key')),
    cert: fs.readFileSync(path.join(__dirname, '../test/https/fastify.cert'))
  },
  logger: true
})

const opts = {
  schema: {
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
}

fastify
  .get('/', opts, function (req, reply) {
    reply.header('Content-Type', 'application/json').code(200)
    reply.send({ hello: 'world' })
  })

fastify.listen(3000, err => {
  if (err) throw err
})
