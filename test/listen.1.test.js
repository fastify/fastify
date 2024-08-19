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
  const doNotWarn = () => {
    t.fail('should not be deprecated')
  }
  process.on('warning', doNotWarn)

  const fastify = Fastify()
  t.teardown(() => {
    fastify.close()
    process.removeListener('warning', doNotWarn)
  })
  await fastify.listen()
  const address = fastify.server.address()
  t.equal(address.address, localhost)
  t.ok(address.port > 0)
})

test('Async/await listen with arguments', async t => {
  const doNotWarn = () => {
    t.fail('should not be deprecated')
  }
  process.on('warning', doNotWarn)

  const fastify = Fastify()
  t.teardown(() => {
    fastify.close()
    process.removeListener('warning', doNotWarn)
  })
  const addr = await fastify.listen({ port: 0, host: '0.0.0.0' })
  const address = fastify.server.address()
  t.equal(addr, `http://127.0.0.1:${address.port}`)
  t.same(address, {
    address: '0.0.0.0',
    family: 'IPv4',
    port: address.port
  })
})

test('listen accepts a callback', t => {
  t.plan(2)
  const doNotWarn = () => {
    t.fail('should not be deprecated')
  }
  process.on('warning', doNotWarn)

  const fastify = Fastify()
  t.teardown(() => {
    fastify.close()
    process.removeListener('warning', doNotWarn)
  })
  fastify.listen({ port: 0 }, (err) => {
    t.equal(fastify.server.address().address, localhost)
    t.error(err)
  })
})

test('listen accepts options and a callback', t => {
  t.plan(1)
  const doNotWarn = () => {
    t.fail('should not be deprecated')
  }
  process.on('warning', doNotWarn)

  const fastify = Fastify()
  t.teardown(() => {
    fastify.close()
    process.removeListener('warning', doNotWarn)
  })
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

test('listen works with undefined host', async t => {
  const doNotWarn = () => {
    t.fail('should not be deprecated')
  }
  process.on('warning', doNotWarn)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  t.teardown(() => {
    fastify.close()
    process.removeListener('warning', doNotWarn)
  })
  await fastify.listen({ host: undefined, port: 0 })
  const address = fastify.server.address()
  t.equal(address.address, localhost)
  t.ok(address.port > 0)
})

test('listen works with null host', async t => {
  const doNotWarn = () => {
    t.fail('should not be deprecated')
  }
  process.on('warning', doNotWarn)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  t.teardown(() => {
    fastify.close()
    process.removeListener('warning', doNotWarn)
  })
  await fastify.listen({ host: null, port: 0 })
  const address = fastify.server.address()
  t.equal(address.address, localhost)
  t.ok(address.port > 0)
})
