'use strict'

const { test, before } = require('tap')
const Fastify = require('..')
const helper = require('./helper')

let localhostForURL

before(async function () {
  [, localhostForURL] = await helper.getLoopbackHost()
})

test('register after listen using Promise.resolve()', t => {
  t.plan(1)
  const f = Fastify()

  const handler = (req, res) => res.send({})
  Promise.resolve()
    .then(() => {
      f.get('/', handler)
      f.register((f2, options, done) => {
        f2.get('/plugin', handler)
        done()
      })
      return f.ready()
    })
    .catch(t.error)
    .then(() => t.pass('resolved'))
})

test('double listen errors', t => {
  t.plan(3)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: 0 }, (err) => {
    t.error(err)
    fastify.listen({ port: fastify.server.address().port }, (err, address) => {
      t.equal(address, null)
      t.ok(err)
    })
  })
})

test('double listen errors callback with (err, address)', t => {
  t.plan(4)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: 0 }, (err1, address1) => {
    t.equal(address1, `http://${localhostForURL}:${fastify.server.address().port}`)
    t.error(err1)
    fastify.listen({ port: fastify.server.address().port }, (err2, address2) => {
      t.equal(address2, null)
      t.ok(err2)
    })
  })
})

test('nonlocalhost double listen errors callback with (err, address)', t => {
  t.plan(4)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ host: '::1', port: 0 }, (err, address) => {
    t.equal(address, `http://${'[::1]'}:${fastify.server.address().port}`)
    t.error(err)
    fastify.listen({ host: '::1', port: fastify.server.address().port }, (err2, address2) => {
      t.equal(address2, null)
      t.ok(err2)
    })
  })
})

test('listen twice on the same port', t => {
  t.plan(4)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: 0 }, (err1, address1) => {
    t.equal(address1, `http://${localhostForURL}:${fastify.server.address().port}`)
    t.error(err1)
    const s2 = Fastify()
    t.teardown(s2.close.bind(s2))
    s2.listen({ port: fastify.server.address().port }, (err2, address2) => {
      t.equal(address2, null)
      t.ok(err2)
    })
  })
})

test('listen twice on the same port callback with (err, address)', t => {
  t.plan(4)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: 0 }, (err1, address1) => {
    const _port = fastify.server.address().port
    t.equal(address1, `http://${localhostForURL}:${_port}`)
    t.error(err1)
    const s2 = Fastify()
    t.teardown(s2.close.bind(s2))
    s2.listen({ port: _port }, (err2, address2) => {
      t.equal(address2, null)
      t.ok(err2)
    })
  })
})
