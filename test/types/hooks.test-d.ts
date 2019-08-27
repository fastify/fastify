import fastify from '../../fastify'

// Not sure how else to test this other than just making sure these definitions are valid

fastify().addHook('onRequest', (request, reply, done) => {
  // some code
  done()
})

fastify().addHook('preParsing', (request, reply, done) => {
  // some code
  done()
})

fastify().addHook('preValidation', (request, reply, done) => {
  // some code
  done()
})

fastify().addHook('preHandler', (request, reply, done) => {
  // some code
  done()
})

fastify().addHook('preSerialization', (request, reply, payload, done) => {
  // some code
  done()
})

fastify().addHook('onError', (request, reply, error, done) => {
  // some code
  done()
})

fastify().addHook('onSend', (request, reply, payload, done) => {
  // some code
  done()
})

fastify().addHook('onResponse', (request, reply, done) => {
  // some code
  done()
})
