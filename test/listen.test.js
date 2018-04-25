'use strict'

const os = require('os')
const path = require('path')
const fs = require('fs')
const test = require('tap').test
const Fastify = require('..')

test('listen accepts a port and a callback', t => {
  t.plan(3)
  const fastify = Fastify()
  fastify.listen(0, (err) => {
    fastify.server.unref()
    t.is(fastify.server.address().address, '127.0.0.1')
    t.error(err)
    t.pass()
    fastify.close()
  })
})

test('listen accepts a port, address, and callback', t => {
  t.plan(2)
  const fastify = Fastify()
  fastify.listen(0, '127.0.0.1', (err) => {
    fastify.server.unref()
    t.error(err)
    t.pass()
    fastify.close()
  })
})

test('listen accepts a port, address, backlog and callback', t => {
  t.plan(2)
  const fastify = Fastify()
  fastify.listen(0, '127.0.0.1', 511, (err) => {
    fastify.server.unref()
    t.error(err)
    t.pass()
    fastify.close()
  })
})

test('listen after Promise.resolve()', t => {
  t.plan(2)
  const f = Fastify()
  Promise.resolve()
    .then(() => {
      f.listen(0, (err) => {
        f.server.unref()
        t.error(err)
        t.pass()
        f.close()
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
  t.plan(2)
  const fastify = Fastify()
  fastify.listen(0, (err) => {
    t.error(err)
    fastify.listen(fastify.server.address().port, (err) => {
      t.ok(err)
      fastify.close()
    })
  })
})

test('listen twice on the same port', t => {
  t.plan(2)
  const fastify = Fastify()
  fastify.listen(0, (err) => {
    t.error(err)
    const s2 = Fastify()
    s2.listen(fastify.server.address().port, (err) => {
      fastify.close()
      t.ok(err)
    })
  })
})

// https://nodejs.org/api/net.html#net_ipc_support
if (os.platform() !== 'win32') {
  test('listen on socket', t => {
    t.plan(2)
    const fastify = Fastify()
    const sockFile = path.join(os.tmpdir(), 'server.sock')
    try {
      fs.unlinkSync(sockFile)
    } catch (e) { }
    fastify.listen(sockFile, (err) => {
      t.error(err)
      t.equal(sockFile, fastify.server.address())
      fastify.close()
    })
  })
}

test('listen without callback', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.listen(0)
    .then(() => {
      t.is(fastify.server.address().address, '127.0.0.1')
      fastify.close()
      t.end()
    })
})

test('double listen without callback rejects', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.listen(0)
    .then(() => {
      fastify.listen(0)
        .then(() => {
          t.error(new Error('second call to fastify.listen resolved'))
          fastify.close()
        })
        .catch(err => {
          t.ok(err)
          fastify.close()
        })
    })
    .catch(err => t.error(err))
})

test('listen twice on the same port without callback rejects', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.listen(0)
    .then(() => {
      const s2 = Fastify()
      s2.listen(fastify.server.address().port)
        .then(() => {
          fastify.close()
          s2.close()
          t.error(new Error('listen on port already in use resolved'))
        })
        .catch(err => {
          t.ok(err)
          fastify.close()
        })
    })
    .catch(err => t.error(err))
})

test('listen on invalid port without callback rejects', t => {
  const fastify = Fastify()

  return fastify.listen(-1)
    .catch(err => {
      t.ok(err)
      return fastify.close()
    })
})

test('listen logs the port as info', t => {
  t.plan(1)
  const fastify = Fastify()

  t.teardown(() => fastify.close())

  const msgs = []
  fastify.log.info = function (msg) {
    msgs.push(msg)
  }

  fastify.listen(0)
    .then(() => {
      t.ok(/http:\/\//.test(msgs[0]))
    })
})
