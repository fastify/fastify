'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../..')
const loggerUtils = require('../../lib/logger')

test('time resolution', t => {
  t.plan(2)
  t.is(typeof loggerUtils.now, 'function')
  t.is(typeof loggerUtils.now(), 'number')
})

test('The logger should add a unique id for every request', t => {
  const ids = []

  const fastify = Fastify()
  fastify.get('/', (req, reply) => {
    t.ok(req.raw.id)
    reply.send({ id: req.raw.id })
  })

  fastify.listen(0, err => {
    t.error(err)
    const queue = new Queue()
    for (var i = 0; i < 10; i++) {
      queue.add(checkId)
    }
    queue.add(() => {
      fastify.close()
      t.end()
    })
  })

  function checkId (done) {
    fastify.inject({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.ok(ids.indexOf(payload.id) === -1, 'the id should not be duplicated')
      ids.push(payload.id)
      done()
    })
  }
})

test('The logger should reuse request id header for req.id', t => {
  const fastify = Fastify()
  fastify.get('/', (req, reply) => {
    t.ok(req.raw.id)
    reply.send({ id: req.raw.id })
  })

  fastify.listen(0, err => {
    t.error(err)

    fastify.inject({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'Request-Id': 'request-id-1'
      }
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.ok(payload.id === 'request-id-1', 'the request id from the header should be returned')
      fastify.close()
      t.end()
    })
  })
})

function Queue () {
  this.q = []
  this.running = false
}

Queue.prototype.add = function add (job) {
  this.q.push(job)
  if (!this.running) this.run()
}

Queue.prototype.run = function run () {
  this.running = true
  const job = this.q.shift()
  job(() => {
    if (this.q.length) {
      this.run()
    } else {
      this.running = false
    }
  })
}
