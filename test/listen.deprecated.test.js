'use strict'

// Tests for deprecated `.listen` signature. This file should be
// removed when the deprecation is complete.

const { test, before } = require('tap')
const Fastify = require('..')
const helper = require('./helper')

let localhost
let localhostForURL

process.removeAllListeners('warning')

before(async () => {
  [localhost, localhostForURL] = await helper.getLoopbackHost()
})

test('listen accepts a port and a callback', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen(0, (err) => {
    t.equal(fastify.server.address().address, localhost)
    t.error(err)
  })
})

test('listen accepts a port and a callback with (err, address)', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen(0, (err, address) => {
    t.equal(address, `http://${localhostForURL}:${fastify.server.address().port}`)
    t.error(err)
  })
})

test('listen accepts a port, address, and callback', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen(0, localhost, (err) => {
    t.error(err)
  })
})

test('listen accepts options, backlog and a callback', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({
    port: 0,
    host: 'localhost'
  }, 511, (err) => {
    t.error(err)
  })
})

test('listen accepts options (no port), backlog and a callback', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({
    host: 'localhost'
  }, 511, (err) => {
    t.error(err)
  })
})

test('listen accepts options (no host), backlog and a callback', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({
    port: 0
  }, 511, (err) => {
    t.error(err)
  })
})

test('listen accepts options (no port, no host), backlog and a callback', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({
    ipv6Only: false
  }, 511, (err) => {
    t.error(err)
  })
})

test('listen accepts a port, address and a callback with (err, address)', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen(0, localhost, (err, address) => {
    t.equal(address, `http://${localhostForURL}:${fastify.server.address().port}`)
    t.error(err)
  })
})

test('listen accepts a port, address, backlog and callback', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen(0, localhost, 511, (err) => {
    t.error(err)
  })
})

test('listen accepts a port, address, backlog and callback with (err, address)', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen(0, localhost, 511, (err, address) => {
    t.equal(address, `http://${localhostForURL}:${fastify.server.address().port}`)
    t.error(err)
  })
})

test('listen without callback (port zero)', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen(0)
    .then(() => {
      t.equal(fastify.server.address().address, localhost)
    })
})

test('listen without callback (port not given)', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen()
    .then(() => {
      t.equal(fastify.server.address().address, localhost)
    })
})

test('listen null without callback with (address)', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen(null)
    .then(address => {
      t.equal(address, `http://${localhostForURL}:${fastify.server.address().port}`)
    })
})

test('listen without port without callback with (address)', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen()
    .then(address => {
      t.equal(address, `http://${localhostForURL}:${fastify.server.address().port}`)
    })
})

test('listen with undefined without callback with (address)', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen(undefined)
    .then(address => {
      t.equal(address, `http://${localhostForURL}:${fastify.server.address().port}`)
    })
})

test('listen when firstArg is string(pipe) and without backlog', async t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  const address = await fastify.listen('\\\\.\\pipe\\testPipe')
  t.equal(address, '\\\\.\\pipe\\testPipe')
})

test('listen when firstArg is string(pipe) and with backlog', async t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  const address = await fastify.listen('\\\\.\\pipe\\testPipe2', 511)
  t.equal(address, '\\\\.\\pipe\\testPipe2')
})

test('listen when firstArg is { path: string(pipe) } and with backlog and callback', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ path: '\\\\.\\pipe\\testPipe3' }, 511, (err, address) => {
    t.error(err)
    t.equal(address, '\\\\.\\pipe\\testPipe3')
  })
})

test('listen accepts a port as string, and callback', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  const port = 3000
  fastify.listen(port.toString(), localhost, (err) => {
    t.equal(fastify.server.address().port, port)
    t.error(err)
  })
})

test('listen accepts a port as string, address and callback', t => {
  t.plan(3)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  const port = 3000
  fastify.listen(port.toString(), localhost, (err) => {
    t.equal(fastify.server.address().port, port)
    t.equal(fastify.server.address().address, localhost)
    t.error(err)
  })
})

test('listen with invalid port string without callback with (address)', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen('-1')
    .then(address => {
      t.equal(address, `http://${localhostForURL}:${fastify.server.address().port}`)
    })
})
