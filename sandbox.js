const fastify = require('./fastify')()
const fp = require('fastify-plugin')

fastify.get('/', (request, reply) => reply.send({ text: '/' }))
fastify.get('/api', (request, reply) => reply.send({ text: 'api' }))
// fastify.post('/api', (request, reply) => reply.send({ text: 'api' }))
// fastify.get('/api/tables', (request, reply) => reply.send({ text: 'tables' }))
// fastify.get('/api/tablesv2', (request, reply) => reply.send({ text: 'tablesv2' }))
// fastify.get('/api/rows', (request, reply) => reply.send({ text: 'rows' }))
// fastify.get('/db', (request, reply) => reply.send({ text: 'db' }))
// fastify.post('/db', (request, reply) => reply.send({ text: 'db' }))
// fastify.delete('/db', (request, reply) => reply.send({ text: 'db' }))

fastify.use(function helloWorld (instance, req, res) {
  console.log('Hello')
})

// fastify.use(require('cors')())

// fastify.use('/abc', function specialABC (instance, req, res) {
//   console.log('ABC')
// })

// fastify.register(fp((instance, opts, next) => {
//   instance.decorate('util', (a, b) => a + b)
//   next()
// })) // this is loaded last and as a nameless function

fastify.register(fp(function exampleFunc (instance, opts, next) {
  instance.decorate('util2', (a, b) => a - b)
  next()
}))

fastify.ready(err => {
  fastify.toString()
  console.log(fastify.dependencies)
})
