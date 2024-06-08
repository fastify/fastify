'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const sget = require('simple-get').concat
const undici = require('undici')

test('listen should accept null port', t => {
  t.plan(1)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: null }, (err) => {
    t.error(err)
  })
})

test('listen should accept undefined port', t => {
  t.plan(1)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: undefined }, (err) => {
    t.error(err)
  })
})

test('listen should accept stringified number port', t => {
  t.plan(1)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: '1234' }, (err) => {
    t.error(err)
  })
})

test('listen should accept log text resolution function', t => {
  t.plan(3)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({
    host: '127.0.0.1',
    port: '1234',
    listenTextResolver: (address) => {
      t.equal(address, 'http://127.0.0.1:1234')
      t.pass('executed')
      return 'hardcoded text'
    }
  }, (err) => {
    t.error(err)
  })
})

test('listen should reject string port', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  try {
    await fastify.listen({ port: 'hello-world' })
  } catch (error) {
    t.equal(error.code, 'ERR_SOCKET_BAD_PORT')
  }

  try {
    await fastify.listen({ port: '1234hello' })
  } catch (error) {
    t.equal(error.code, 'ERR_SOCKET_BAD_PORT')
  }
})

test('Test for hostname and port', t => {
  const app = Fastify()
  t.teardown(app.close.bind(app))
  app.get('/host', (req, res) => {
    const host = 'localhost:8000'
    t.equal(req.host, host)
    t.equal(req.hostname, req.host.split(':')[0])
    t.equal(req.port, Number(req.host.split(':')[1]))
    res.send('ok')
  })
  app.listen({ port: 8000 }, () => {
    sget('http://localhost:8000/host', () => { t.end() })
  })
})

test('abort signal', t => {
  t.test('listen should not start server', t => {
    t.plan(2)
    function onClose (instance, done) {
      t.type(fastify, instance)
      done()
    }
    const controller = new AbortController()

    const fastify = Fastify()
    fastify.addHook('onClose', onClose)
    fastify.listen({ port: 1234, signal: controller.signal }, (err) => {
      t.error(err)
    })
    controller.abort()
    t.equal(fastify.server.listening, false)
  })

  t.test('listen should not start server if already aborted', t => {
    t.plan(2)
    function onClose (instance, done) {
      t.type(fastify, instance)
      done()
    }

    const controller = new AbortController()
    controller.abort()
    const fastify = Fastify()
    fastify.addHook('onClose', onClose)
    fastify.listen({ port: 1234, signal: controller.signal }, (err) => {
      t.error(err)
    })
    t.equal(fastify.server.listening, false)
  })

  t.test('listen should throw if received invalid signal', t => {
    t.plan(2)
    const fastify = Fastify()

    try {
      fastify.listen({ port: 1234, signal: {} }, (err) => {
        t.error(err)
      })
      t.fail()
    } catch (e) {
      t.equal(e.code, 'FST_ERR_LISTEN_OPTIONS_INVALID')
      t.equal(e.message, 'Invalid listen options: \'Invalid options.signal\'')
    }
  })

  t.end()
})

t.test('#5180 - preClose should be called before closing secondary server', t => {
  t.plan(2)
  const fastify = Fastify({ forceCloseConnections: true })
  let flag = false
  t.teardown(fastify.close.bind(fastify))

  fastify.addHook('preClose', async () => {
    flag = true
  })

  fastify.get('/', async (req, reply) => {
    await new Promise((resolve) => {
      setTimeout(() => resolve(1), 1000)
    })

    return { hello: 'world' }
  })

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)
    const addresses = fastify.addresses()
    const mainServerAddress = fastify.server.address()
    let secondaryAddress
    for (const addr of addresses) {
      if (addr.family !== mainServerAddress.family) {
        secondaryAddress = addr
        secondaryAddress.address = secondaryAddress.family === 'IPv6'
          ? `[${secondaryAddress.address}]`
          : secondaryAddress.address
        break
      }
    }

    if (!secondaryAddress) {
      t.pass('no secondary server')
      return
    }

    undici.request(`http://${secondaryAddress.address}:${secondaryAddress.port}/`)
      .then(
        () => { t.fail('Request should not succeed') },
        () => { t.ok(flag) }
      )

    setTimeout(() => {
      fastify.close()
    }, 250)
  })
})
