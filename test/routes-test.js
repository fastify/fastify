const Fastify = require('fastify')

const app = Fastify()

app.get('/fooupdate', async () => 'update')
app.get('/foodelete', async () => 'delete')
app.get('/buildpatch', async () => 'buildpatch')
app.get('/buildpatch/experimental', async () => 'experimental')
app.get('/mymethod', async () => 'mymethod')
app.get('/mymethod/42', async () => '42')

app.ready(() => {
  console.log('With commonPrefix: true')
  console.log(app.printRoutes({ commonPrefix: true }))

  console.log('\nWith commonPrefix: false')
  console.log(app.printRoutes({ commonPrefix: false }))
})
