'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')

test('trust proxy', (t) => {
  t.plan(5)
  const app = fastify({
    trustProxy: true
  })
  app.get('/trustproxy', function (req, reply) {
    t.ok(req.raw.ip, 'ip is defined')
    t.ok(req.raw.hostname, 'hostname is defined')
    t.equal(req.raw.ip, '1.1.1.1', 'gets ip from x-forwarder-for')
    t.equal(req.raw.hostname, 'example.com', 'gets hostname from x-forwarded-host')
    reply.code(200).send({ip: req.ip, hostname: req.hostname})
  })

  t.tearDown(app.close.bind(app))

  app.listen(0, (err) => {
    app.server.unref()
    t.error(err)
    sget(
      {
        method: 'GET',
        headers: {
          'X-Forwarded-For': '1.1.1.1',
          'X-Forwarded-Host': 'example.com'
        },
        url: 'http://localhost:' + app.server.address().port + '/trustproxy'
      },
      () => {}
    )
  })
})
