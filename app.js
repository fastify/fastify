const Fastify = require('./fastify') // adjust path if needed

const fastify = Fastify()

fastify.get('/fooupdate', async () => 'Update')
fastify.get('/foodelete', async () => 'Delete')
fastify.get('/buildpatch/experimental', async () => 'Patch')
fastify.get('/mymethod/42', async () => 'Method')

console.log('\n🔧 With commonPrefix: false\n')
console.log(fastify.printRoutes({ commonPrefix: false }))

console.log('\n🧩 With commonPrefix: true\n')
console.log(fastify.printRoutes({ commonPrefix: true }))
