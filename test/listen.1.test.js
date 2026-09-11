'use strict'

const os = require('node:os')
const path = require('node:path')
const { EventEmitter } = require('node:events')
const { networkInterfaces } = require('node:os')
const { test, before } = require('node:test')
const Fastify = require('..')
const helper = require('./helper')
const { assertNoWarning } = require('./helper')

let localhost
let localhostForURL

before(async function () {
  [localhost, localhostForURL] = await helper.getLoopbackHost()
})

test('listen works without arguments', async t => {
  assertNoWarning(t)

  const fastify = Fastify()

  await fastify.listen()
  const address = fastify.server.address()
  t.assert.strictEqual(address.address, localhost)
  t.assert.ok(address.port > 0)
  await fastify.close()
})

test('Async/await listen with arguments', async t => {
  assertNoWarning(t)

  const fastify = Fastify()

  const addr = await fastify.listen({ port: 0, host: '0.0.0.0' })
  const address = fastify.server.address()
  const { protocol, hostname, port, pathname } = new URL(addr)
  t.assert.strictEqual(protocol, 'http:')
  t.assert.ok(Object.values(networkInterfaces())
    .flat()
    .filter(({ internal }) => internal)
    .some(({ address }) => address === hostname))
  t.assert.strictEqual(pathname, '/')
  t.assert.strictEqual(Number(port), address.port)
  t.assert.deepEqual(address, {
    address: '0.0.0.0',
    family: 'IPv4',
    port: address.port
  })
  await fastify.close()
})

test('listen accepts a callback', (t, done) => {
  t.plan(2)
  assertNoWarning(t)

  const fastify = Fastify()

  fastify.listen({ port: 0 }, (err) => {
    t.assert.ifError(err)
    t.assert.strictEqual(fastify.server.address().address, localhost)
    fastify.close(done)
  })
})

test('listen accepts options and a callback', (t, done) => {
  t.plan(1)
  assertNoWarning(t)

  const fastify = Fastify()
  fastify.listen({
    port: 0,
    host: 'localhost',
    backlog: 511,
    exclusive: false,
    readableAll: false,
    writableAll: false,
    ipv6Only: false
  }, (err) => {
    t.assert.ifError(err)
    fastify.close(done)
  })
})

test('listen after Promise.resolve()', (t, done) => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())
  Promise.resolve()
    .then(() => {
      fastify.listen({ port: 0 }, (err, address) => {
        fastify.server.unref()
        t.assert.strictEqual(address, `http://${localhostForURL}:${fastify.server.address().port}`)
        t.assert.ifError(err)
        done()
      })
    })
})

test('listen works with undefined host', async t => {
  assertNoWarning(t)

  const fastify = Fastify()
  await fastify.listen({ host: undefined, port: 0 })
  const address = fastify.server.address()
  t.assert.strictEqual(address.address, localhost)
  t.assert.ok(address.port > 0)
  await fastify.close()
})

test('listen works with null host', async t => {
  assertNoWarning(t)

  const fastify = Fastify()

  await fastify.listen({ host: null, port: 0 })
  const address = fastify.server.address()
  t.assert.strictEqual(address.address, localhost)
  t.assert.ok(address.port > 0)
  await fastify.close()
})

function getSocketPath () {
  const id = (Math.random().toString(16) + '0000000').slice(2, 10)
  return os.platform() !== 'win32'
    ? path.join(os.tmpdir(), `${id}-server.sock`)
    : `\\\\.\\pipe\\${id}-server-sock`
}

test('listen options follow the Node.js priority of handle, port and path', async t => {
  const handle = new EventEmitter()
  const cases = [
    { name: '{ handle }', actual: { handle }, expect: { handle } },
    { name: '{ handle, path }', actual: { handle, path: '/tmp/a.sock' }, expect: { handle } },
    { name: '{ handle, host }', actual: { handle, host: '127.0.0.1' }, expect: { handle } },
    { name: '{ handle, host, port }', actual: { handle, host: '127.0.0.1', port: 1 }, expect: { handle } },
    { name: '{ path }', actual: { path: '/tmp/a.sock' }, expect: { path: '/tmp/a.sock' } },
    { name: '{ path, host }', actual: { path: '/tmp/a.sock', host: '127.0.0.1' }, expect: { path: '/tmp/a.sock' } },
    { name: '{ path, port }', actual: { path: '/tmp/a.sock', port: 1 }, expect: { host: 'localhost', port: 1 } },
    { name: '{ path, host, port }', actual: { path: '/tmp/a.sock', host: '127.0.0.1', port: 1 }, expect: { host: '127.0.0.1', port: 1 } },
    { name: '{ port }', actual: { port: 1 }, expect: { host: 'localhost', port: 1 } },
    { name: '{ host }', actual: { host: '127.0.0.1' }, expect: { host: '127.0.0.1', port: 0 } },
    { name: '{ host, port }', actual: { host: '127.0.0.1', port: 1 }, expect: { host: '127.0.0.1', port: 1 } }
  ]
  t.plan(cases.length)

  for (const { name, actual, expect } of cases) {
    let listenOptions

    const fastify = Fastify({
      serverFactory () {
        const server = new EventEmitter()
        server.address = () => '/it-never-really-listens'
        server.close = (done) => { done() }
        server.listen = (options) => {
          // only the options of the first server are of interest here, any
          // further one is a secondary binding built from them
          if (listenOptions === undefined) {
            listenOptions = { ...options }
            delete listenOptions.cb
          }
          process.nextTick(() => server.emit('listening'))
        }
        return server
      }
    })

    await fastify.listen({ ...actual })
    await fastify.close()

    t.assert.deepStrictEqual(listenOptions, expect, name)
  }
})

test('listen on a path and a port listens on the port', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  await fastify.listen({ path: getSocketPath(), port: 0 })

  const address = fastify.server.address()
  t.assert.strictEqual(address.address, localhost)
  t.assert.ok(address.port > 0)
})

test('listen works with a host and no port', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  await fastify.listen({ host: localhost })

  const address = fastify.server.address()
  t.assert.strictEqual(address.address, localhost)
  t.assert.ok(address.port > 0)
})

test('listen does not modify the options it is given', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  const listenOptions = Object.freeze({ path: getSocketPath(), port: 0, host: localhost })
  await fastify.listen(listenOptions)

  t.assert.deepStrictEqual(Object.keys(listenOptions), ['path', 'port', 'host'])
})
