'use strict'

const { test, before } = require('tap')
const Fastify = require('..')
const helper = require('./helper')

let localhost
let localhostForURL

before(async function () {
  [localhost, localhostForURL] = await helper.getLoopbackHost()
})

test('listen works without arguments', async t => {
  process.on('warning', () => {
    t.fail('should not be deprecated')
  })

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  await fastify.listen()
  const address = fastify.server.address()
  t.equal(address.address, localhost)
  t.ok(address.port > 0)
})

test('Async/await listen with arguments', async t => {
  process.on('warning', () => {
    t.fail('should not be deprecated')
  })

  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  const addr = await fastify.listen({ port: 0, host: '0.0.0.0' })
  const address = fastify.server.address()
  t.equal(addr, `http://${address.address}:${address.port}`)
})

test('Promise listen with arguments', t => {
  process.on('warning', () => {
    t.fail('should not be deprecated')
  })

  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: 0, host: '0.0.0.0' }).then(addr => {
    const address = fastify.server.address()
    t.equal(addr, `http://${address.address}:${address.port}`)
  })
})

test('listen accepts a callback', t => {
  process.on('warning', () => {
    t.fail('should not be deprecated')
  })

  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: 0 }, (err) => {
    t.equal(fastify.server.address().address, localhost)
    t.error(err)
  })
})

test('listen accepts options and a callback', t => {
  process.on('warning', () => {
    t.fail('should not be deprecated')
  })

  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({
    port: 0,
    host: 'localhost',
    backlog: 511,
    exclusive: false,
    readableAll: false,
    writableAll: false,
    ipv6Only: false
  }, (err) => {
    t.error(err)
  })
})

test('listen after Promise.resolve()', t => {
  t.plan(2)
  const f = Fastify()
  t.teardown(f.close.bind(f))
  Promise.resolve()
    .then(() => {
      f.listen({ port: 0 }, (err, address) => {
        f.server.unref()
        t.equal(address, `http://${localhostForURL}:${f.server.address().port}`)
        t.error(err)
      })
    })
})
