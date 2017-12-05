'use strict'

const t = require('tap')
const sget = require('simple-get')
const fs = require('fs')

const test = t.test
const Fastify = require('..')

test('default 500', t => {
  t.plan(3)

  const fastify = Fastify()

  t.tearDown(fastify.close.bind(fastify))

  fastify.addContentTypeParser('*', function (req, done) {
    var data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      done(data)
    })
  })

  fastify.post('/', (req, res) => {
    res.send(req.body)
  })

  fastify.listen(0, function (err) {
    t.error(err)

    const fileStream = fs.createReadStream(__filename)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/',
      body: fileStream
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
    })
  })
})
