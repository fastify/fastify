'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const sget = require('simple-get').concat
const undici = require('undici')

test('listen should accept null port', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  await t.assert.doesNotReject(
    fastify.listen({ port: null })
  )
})

test('listen should accept undefined port', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  await t.assert.doesNotReject(
    fastify.listen({ port: undefined })
  )
})

test('listen should accept stringified number port', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  await t.assert.doesNotReject(
    fastify.listen({ port: '1234' })
  )
})

test('listen should accept log text resolution function', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  await t.assert.doesNotReject(
    fastify.listen({
      host: '127.0.0.1',
      port: '1234',
      listenTextResolver: (address) => {
        t.assert.strictEqual(address, 'http://127.0.0.1:1234')
        return 'hardcoded text'
      }
    })
  )
})

test('listen should reject string port', async (t) => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  try {
    await fastify.listen({ port: 'hello-world' })
  } catch (error) {
    t.assert.strictEqual(error.code, 'ERR_SOCKET_BAD_PORT')
  }

  try {
    await fastify.listen({ port: '1234hello' })
  } catch (error) {
    t.assert.strictEqual(error.code, 'ERR_SOCKET_BAD_PORT')
  }
})

test('Test for hostname and port', (t, end) => {
  const app = Fastify()
  t.after(() => app.close())
  app.get('/host', (req, res) => {
    const host = 'localhost:8000'
    t.assert.strictEqual(req.host, host)
    t.assert.strictEqual(req.hostname, req.host.split(':')[0])
    t.assert.strictEqual(req.port, Number(req.host.split(':')[1]))
    res.send('ok')
  })

  app.listen({ port: 8000 }, () => {
    sget('http://localhost:8000/host', () => { end() })
  })
})

test('abort signal', async t => {
  await t.test('listen should not start server', (t, end) => {
    t.plan(2)
    function onClose (instance, done) {
      t.assert.equal(instance, fastify)
      done()
      end()
    }
    const controller = new AbortController()

    const fastify = Fastify()
    fastify.addHook('onClose', onClose)
    fastify.listen({ port: 1234, signal: controller.signal }, (err) => {
      t.assert.ifError(err)
    })
    controller.abort()
    t.assert.strictEqual(fastify.server.listening, false)
  })

  await t.test('listen should not start server if already aborted', (t, end) => {
    t.plan(2)
    function onClose (instance, done) {
      t.assert.equal(instance, fastify)
      done()
      end()
    }

    const controller = new AbortController()
    controller.abort()
    const fastify = Fastify()
    fastify.addHook('onClose', onClose)
    fastify.listen({ port: 1234, signal: controller.signal }, (err) => {
      t.assert.ifError(err)
    })
    t.assert.strictEqual(fastify.server.listening, false)
  })

  await t.test('listen should throw if received invalid signal', t => {
    t.plan(2)
    const fastify = Fastify()

    try {
      fastify.listen({ port: 1234, signal: {} }, (err) => {
        t.assert.ifError(err)
      })
      t.assert.fail('should throw')
    } catch (e) {
      t.assert.strictEqual(e.code, 'FST_ERR_LISTEN_OPTIONS_INVALID')
      t.assert.strictEqual(e.message, 'Invalid listen options: \'Invalid options.signal\'')
    }
  })
})

test('#5180 - preClose should be called before closing secondary server', (t, end) => {
  t.plan(2)
  const fastify = Fastify({ forceCloseConnections: true })
  let flag = false
  t.after(() => fastify.close())

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
    t.assert.ifError(err)
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
      t.assert.ok(true, 'Secondary address not found')
      return
    }

    undici.request(`http://${secondaryAddress.address}:${secondaryAddress.port}/`)
      .then(
        () => { t.assert.fail('Request should not succeed') },
        () => {
          t.assert.ok(flag)
          end()
        }
      )

    setTimeout(() => {
      fastify.close()
    }, 250)
  })
})
