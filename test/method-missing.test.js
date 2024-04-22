const http = require('http')
const { test } = require('tap')
const Fastify = require('../fastify')

test('missing method from http client', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.listen({ port: 3000 }, (err) => {
    t.error(err)

    const port = fastify.server.address().port
    const req = http.request({
      port,
      method: 'REBIND',
      path: '/'
    }, (res) => {
      t.equal(res.statusCode, 404)
      t.end()
      fastify.close()
    })

    req.end()
  })
})
