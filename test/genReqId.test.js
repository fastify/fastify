const { test } = require('tap')
const Fastify = require('..')

test('Should accept a custom genReqId function', t => {
  t.plan(4)

  const fastify = Fastify({
    genReqId: function (req) {
      return 'a'
    }
  })

  fastify.get('/', (req, reply) => {
    t.ok(req.raw.id)
    reply.send({ id: req.raw.id })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.inject({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.equal(payload.id, 'a')
      fastify.close()
    })
  })
})
