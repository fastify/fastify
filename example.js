'use strict'

const beo = require('.')()
const http = require('http')
const server = http.createServer(beo)

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

beo.get('/', schema, function (req, reply) {
  reply(null, { hello: 'world' })
})

server.listen(3000, function (err) {
  if (err) {
    throw err
  }

  console.log(`server listening on ${server.address().port}`)
})
