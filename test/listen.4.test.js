'use strict'

const { test, before } = require('tap')
const dns = require('node:dns').promises
const dnsCb = require('node:dns')
const sget = require('simple-get').concat
const Fastify = require('../fastify')
const helper = require('./helper')

let localhostForURL

function getUrl (fastify, lookup) {
  const { port } = fastify.server.address()
  if (lookup.family === 6) {
    return `http://[${lookup.address}]:${port}/`
  } else {
    return `http://${lookup.address}:${port}/`
  }
}

before(async function () {
  [, localhostForURL] = await helper.getLoopbackHost()
})

test('listen twice on the same port without callback rejects', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 })
    .then(() => {
      const s2 = Fastify()
      t.teardown(s2.close.bind(s2))
      s2.listen({ port: fastify.server.address().port })
        .catch(err => {
          t.ok(err)
        })
    })
    .catch(err => t.error(err))
})

test('listen twice on the same port without callback rejects with (address)', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: 0 })
    .then(address => {
      const s2 = Fastify()
      t.teardown(s2.close.bind(s2))
      t.equal(address, `http://${localhostForURL}:${fastify.server.address().port}`)
      s2.listen({ port: fastify.server.address().port })
        .catch(err => {
          t.ok(err)
        })
    })
    .catch(err => t.error(err))
})

test('listen on invalid port without callback rejects', t => {
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  return fastify.listen({ port: -1 })
    .catch(err => {
      t.ok(err)
      return true
    })
})

test('listen logs the port as info', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const msgs = []
  fastify.log.info = function (msg) {
    msgs.push(msg)
  }

  fastify.listen({ port: 0 })
    .then(() => {
      t.ok(/http:\/\//.test(msgs[0]))
    })
})

test('listen on localhost binds IPv4 and IPv6 - promise interface', async t => {
  const localAddresses = await dns.lookup('localhost', { all: true })
  t.plan(2 * localAddresses.length)

  const app = Fastify()
  app.get('/', async () => 'hello localhost')
  t.teardown(app.close.bind(app))
  await app.listen({ port: 0, host: 'localhost' })

  for (const lookup of localAddresses) {
    await new Promise((resolve, reject) => {
      sget({
        method: 'GET',
        url: getUrl(app, lookup)
      }, (err, response, body) => {
        if (err) { return reject(err) }
        t.equal(response.statusCode, 200)
        t.same(body.toString(), 'hello localhost')
        resolve()
      })
    })
  }
})

test('listen on localhost binds to all interfaces (both IPv4 and IPv6 if present) - callback interface', t => {
  dnsCb.lookup('localhost', { all: true }, (err, lookups) => {
    t.plan(2 + (3 * lookups.length))
    t.error(err)

    const app = Fastify()
    app.get('/', async () => 'hello localhost')
    app.listen({ port: 0, host: 'localhost' }, (err) => {
      t.error(err)
      t.teardown(app.close.bind(app))

      for (const lookup of lookups) {
        sget({
          method: 'GET',
          url: getUrl(app, lookup)
        }, (err, response, body) => {
          t.error(err)
          t.equal(response.statusCode, 200)
          t.same(body.toString(), 'hello localhost')
        })
      }
    })
  })
})

test('addresses getter', async t => {
  let localAddresses = await dns.lookup('localhost', { all: true })

  t.plan(4)
  const app = Fastify()
  app.get('/', async () => 'hello localhost')

  t.same(app.addresses(), [], 'before ready')
  await app.ready()

  t.same(app.addresses(), [], 'after ready')
  await app.listen({ port: 0, host: 'localhost' })

  // fix citgm
  // dns lookup may have duplicated addresses (rhel8-s390x rhel8-ppc64le debian10-x64)

  localAddresses = [...new Set([...localAddresses.map(a => JSON.stringify({
    address: a.address,
    family: typeof a.family === 'number' ? 'IPv' + a.family : a.family
  }))])].sort()

  const appAddresses = app.addresses().map(a => JSON.stringify({
    address: a.address,
    family: typeof a.family === 'number' ? 'IPv' + a.family : a.family
  })).sort()

  t.same(appAddresses, localAddresses, 'after listen')

  await app.close()
  t.same(app.addresses(), [], 'after close')
})
