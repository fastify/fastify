const fastify = require('./fastify')
const server = fastify()

const schema = {
  type: 'object',
  properties: {
    hello: {
      type: 'prrrr'
    }
  }
}

server.get('/', () => {})
server.get('/mee', { schema: { body: schema } }, () => {})

server.ready().catch(console.log)
