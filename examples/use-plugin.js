const fastify = require('../fastify')()
const http = require('http')
const server = http.createServer(fastify)

const opts = {
  schema: {
    out: {
      type: 'object',
      properties: {
        hello: {
          type: 'string'
        }
      }
    }
  }
}
fastify.register(require('./plugin'), opts, function (err) {
  if (err) throw err
})

server.listen(8000, function (err) {
  if (err) {
    throw err
  }

  console.log(`server listening on ${server.address().port}`)
})
