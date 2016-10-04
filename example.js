'use strict'

const beo = require('.')()
const http = require('http')
const server = http.createServer(beo)

beo.route({
  method: 'GET',
  url: '/',
  schema: {
    out: {
      type: 'object',
      properties: {
        hello: {
          type: 'string'
        }
      }
    }
  },
  handler: function (req, reply) {
    reply(null, { hello: 'world' })
  }
})

server.listen(3000, function (err) {
  if (err) {
    throw err
  }

  console.log(`server listening on ${server.address().port}`)
})
