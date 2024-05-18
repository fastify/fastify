'use strict'

const os = require('node:os')
const path = require('node:path')
const fs = require('node:fs')
const { test, before } = require('tap')
const Fastify = require('..')
const helper = require('./helper')

let localhostForURL

before(async function () {
  [, localhostForURL] = await helper.getLoopbackHost()
})

// https://nodejs.org/api/net.html#net_ipc_support
if (os.platform() !== 'win32') {
  test('listen on socket', t => {
    t.plan(3)
    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const sockFile = path.join(os.tmpdir(), `${(Math.random().toString(16) + '0000000').slice(2, 10)}-server.sock`)
    try {
      fs.unlinkSync(sockFile)
    } catch (e) { }

    fastify.listen({ path: sockFile }, (err, address) => {
      t.error(err)
      t.strictSame(fastify.addresses(), [sockFile])
      t.equal(address, sockFile)
    })
  })
} else {
  test('listen on socket', t => {
    t.plan(3)
    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const sockFile = `\\\\.\\pipe\\${(Math.random().toString(16) + '0000000').slice(2, 10)}-server-sock`

    fastify.listen({ path: sockFile }, (err, address) => {
      t.error(err)
      t.strictSame(fastify.addresses(), [sockFile])
      t.equal(address, sockFile)
    })
  })
}

test('listen without callback with (address)', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: 0 })
    .then(address => {
      t.equal(address, `http://${localhostForURL}:${fastify.server.address().port}`)
    })
})

test('double listen without callback rejects', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: 0 })
    .then(() => {
      fastify.listen({ port: 0 })
        .catch(err => {
          t.ok(err)
        })
    })
    .catch(err => t.error(err))
})

test('double listen without callback with (address)', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: 0 })
    .then(address => {
      t.equal(address, `http://${localhostForURL}:${fastify.server.address().port}`)
      fastify.listen({ port: 0 })
        .catch(err => {
          t.ok(err)
        })
    })
    .catch(err => t.error(err))
})
