'use strict'

const os = require('os')
const path = require('path')
const fs = require('fs')
const { test, before } = require('tap')
const Fastify = require('..')
const dns = require('dns').promises

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

test('listen accepts a callback', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen((err) => {
    t.equal(fastify.server.address().address, localhost)
    t.error(err)
  })
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

test('listen accepts options and a callback', t => {
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

test('listen after Promise.resolve()', t => {
  t.plan(2)
  const f = Fastify()
  t.teardown(f.close.bind(f))
  Promise.resolve()
    .then(() => {
      f.listen(0, (err, address) => {
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
  fastify.listen(0, (err) => {
    t.error(err)
    fastify.listen(fastify.server.address().port, (err, address) => {
      t.equal(address, null)
      t.ok(err)
    })
  })
})

test('double listen errors callback with (err, address)', t => {
  t.plan(4)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen(0, (err1, address1) => {
    t.equal(address1, `http://${localhostForURL}:${fastify.server.address().port}`)
    t.error(err1)
    fastify.listen(fastify.server.address().port, (err2, address2) => {
      t.equal(address2, null)
      t.ok(err2)
    })
  })
})

test('listen twice on the same port', t => {
  t.plan(4)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen(0, (err1, address1) => {
    t.equal(address1, `http://${localhostForURL}:${fastify.server.address().port}`)
    t.error(err1)
    const s2 = Fastify()
    t.teardown(s2.close.bind(s2))
    s2.listen(fastify.server.address().port, (err2, address2) => {
      t.equal(address2, null)
      t.ok(err2)
    })
  })
})

test('listen twice on the same port callback with (err, address)', t => {
  t.plan(4)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen(0, (err1, address1) => {
    const _port = fastify.server.address().port
    t.equal(address1, `http://${localhostForURL}:${_port}`)
    t.error(err1)
    const s2 = Fastify()
    t.teardown(s2.close.bind(s2))
    s2.listen(_port, (err2, address2) => {
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

    const sockFile = path.join(os.tmpdir(), `${(Math.random().toString(16) + '0000000').substr(2, 8)}-server.sock`)
    try {
      fs.unlinkSync(sockFile)
    } catch (e) { }

    fastify.listen(sockFile, (err, address) => {
      t.error(err)
      t.equal(sockFile, fastify.server.address())
      t.equal(address, sockFile)
    })
  })
}

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

test('listen without callback with (address)', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen(0)
    .then(address => {
      t.equal(address, `http://${localhostForURL}:${fastify.server.address().port}`)
    })
})

test('double listen without callback rejects', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen(0)
    .then(() => {
      fastify.listen(0)
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
  fastify.listen(0)
    .then(address => {
      t.equal(address, `http://${localhostForURL}:${fastify.server.address().port}`)
      fastify.listen(0)
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

  fastify.listen(0)
    .then(() => {
      const s2 = Fastify()
      t.teardown(s2.close.bind(s2))
      s2.listen(fastify.server.address().port)
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
  fastify.listen(0)
    .then(address => {
      const s2 = Fastify()
      t.teardown(s2.close.bind(s2))
      t.equal(address, `http://${localhostForURL}:${fastify.server.address().port}`)
      s2.listen(fastify.server.address().port)
        .catch(err => {
          t.ok(err)
        })
    })
    .catch(err => t.error(err))
})

test('listen on invalid port without callback rejects', t => {
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  return fastify.listen(-1)
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

  fastify.listen(0)
    .then(() => {
      t.ok(/http:\/\//.test(msgs[0]))
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
  const address = await fastify.listen('\\\\.\\pipe\\testPipe', 511)
  t.equal(address, '\\\\.\\pipe\\testPipe')
})
