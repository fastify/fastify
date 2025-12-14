'use strict'

const fastify = require('../fastify')({
  logger: true,

  // Enable logging to be utilized by the plugin
  disableRequestLogging: false
})

// Function that triggers when the plugin is registered
function customLogger (fastify, options, done) {
  fastify.addHook('onRequest', (request, reply, done) => {
    request.log.info({
      req: request,
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      ip: request.ip
    }, 'Custom Request Log')
    done()
  })
  done()
}

// Register the plugin
fastify.register(customLogger)

fastify.get('/', async (request, reply) => {
  return { hello: 'world' }
})

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err
})
