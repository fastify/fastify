'use strict'

const os = require('os')
const path = require('path')
const fs = require('fs')
const { test, before } = require('tap')
const dns = require('dns').promises
const dnsCb = require('dns')
const sget = require('simple-get').concat
const Fastify = require('..')

let localhost
let localhostForURL

before(async function () {
  const lookup = await dns.lookup('localhost')
  localhost = lookup.address
  if (lookup.family === 6) {
    localhostForURL = `[${lookup.address}]`
  } else {
    localhostForURL = localhost
  }
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
  const lookups = await dns.lookup('localhost', { all: true })
  t.plan(2 * lookups.length)

  const app = Fastify()
  app.get('/', async () => 'hello localhost')
  t.teardown(app.close.bind(app))
  await app.listen({ port: 0, host: 'localhost' })

  for (const lookup of lookups) {
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
  t.plan(4)
  const app = Fastify()
  app.get('/', async () => 'hello localhost')

  t.same(app.addresses(), [], 'before ready')
  await app.ready()

  t.same(app.addresses(), [], 'after ready')
  await app.listen({ port: 0, host: 'localhost' })
  const { port } = app.server.address()
  const localAddresses = await dns.lookup('localhost', { all: true })
  for (const address of localAddresses) {
    address.port = port
    if (typeof address.family === 'number') {
      address.family = 'IPv' + address.family
    }
  }
  const appAddresses = app.addresses()
  for (const address of appAddresses) {
    if (typeof address.family === 'number') {
      address.family = 'IPv' + address.family
    }
  }
  localAddresses.sort((a, b) => a.address.localeCompare(b.address))
  appAddresses.sort((a, b) => a.address.localeCompare(b.address))
  t.same(appAddresses, localAddresses, 'after listen')

  await app.close()
  t.same(app.addresses(), [], 'after close')
})

function getUrl (fastify, lookup) {
  const { port } = fastify.server.address()
  if (lookup.family === 6) {
    return `http://[${lookup.address}]:${port}/`
  } else {
    return `http://${lookup.address}:${port}/`
  }
}
