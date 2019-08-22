const fastify = require('./fastify')
const fp = require('fastify-plugin')

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
server.register(fp(plugin, { name: 'your-plugin-name' }))
server.ready().catch(console.log)

function plugin (fastify, opts, next) {
  fastify.get('/mee', { schema: { body: schema } }, () => {})
  next()
}
