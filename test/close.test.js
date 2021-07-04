'use strict'

const net = require('net')
const t = require('tap')
const test = t.test
const Fastify = require('..')
const { Client } = require('undici')

test('close callback', t => {
  t.plan(4)
  const fastify = Fastify()
  fastify.addHook('onClose', onClose)
  function onClose (instance, done) {
    t.type(fastify, instance)
    done()
  }

  fastify.listen(0, err => {
    t.error(err)

    fastify.close((err) => {
      t.error(err)
      t.ok('close callback')
    })
  })
})

test('inside register', t => {
  t.plan(5)
  const fastify = Fastify()
  fastify.register(function (f, opts, done) {
    f.addHook('onClose', onClose)
    function onClose (instance, done) {
      t.ok(instance.prototype === fastify.prototype)
      t.equal(instance, f)
      done()
    }

    done()
  })

  fastify.listen(0, err => {
    t.error(err)

    fastify.close((err) => {
      t.error(err)
      t.ok('close callback')
    })
  })
})

test('close order', t => {
  t.plan(5)
  const fastify = Fastify()
  const order = [1, 2, 3]

  fastify.register(function (f, opts, done) {
    f.addHook('onClose', (instance, done) => {
      t.equal(order.shift(), 1)
      done()
    })

    done()
  })

  fastify.addHook('onClose', (instance, done) => {
    t.equal(order.shift(), 2)
    done()
  })

  fastify.listen(0, err => {
    t.error(err)

    fastify.close((err) => {
      t.error(err)
      t.equal(order.shift(), 3)
    })
  })
})

test('close order - async', async t => {
  t.plan(3)
  const fastify = Fastify()
  const order = [1, 2, 3]

  fastify.register(function (f, opts, done) {
    f.addHook('onClose', async instance => {
      t.equal(order.shift(), 1)
    })

    done()
  })

  fastify.addHook('onClose', () => {
    t.equal(order.shift(), 2)
  })

  await fastify.listen(0)
  await fastify.close()

  t.equal(order.shift(), 3)
})

test('should not throw an error if the server is not listening', t => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onClose', onClose)
  function onClose (instance, done) {
    t.type(fastify, instance)
    done()
  }

  fastify.close((err) => {
    t.error(err)
  })
})

test('onClose should keep the context', t => {
  t.plan(4)
  const fastify = Fastify()
  fastify.register(plugin)

  function plugin (instance, opts, done) {
    instance.decorate('test', true)
    instance.addHook('onClose', onClose)
    t.ok(instance.prototype === fastify.prototype)

    function onClose (i, done) {
      t.ok(i.test)
      t.equal(i, instance)
      done()
    }

    done()
  }

  fastify.close((err) => {
    t.error(err)
  })
})

test('Should return error while closing (promise) - injection', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('onClose', (instance, done) => { done() })

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    fastify.close()

    process.nextTick(() => {
      fastify.inject({
        method: 'GET',
        url: '/'
      }).catch(err => {
        t.ok(err)
        t.equal(err.message, 'Server is closed')
      })
    }, 100)
  })
})

test('Should return error while closing (callback) - injection', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('onClose', (instance, done) => {
    setTimeout(done, 150)
  })

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    fastify.close()

    setTimeout(() => {
      fastify.inject({
        method: 'GET',
        url: '/'
      }, (err, res) => {
        t.ok(err)
        t.equal(err.message, 'Server is closed')
      })
    }, 100)
  })
})

t.test('Current opened connection should continue to work after closing and return "connection: close" header - return503OnClosing: false', t => {
  const fastify = Fastify({
    return503OnClosing: false
  })

  fastify.get('/', (req, reply) => {
    fastify.close()
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)

    const port = fastify.server.address().port
    const client = net.createConnection({ port: port }, () => {
      client.write('GET / HTTP/1.1\r\n\r\n')

      client.once('data', data => {
        t.match(data.toString(), /Connection:\s*keep-alive/i)
        t.match(data.toString(), /200 OK/i)

        client.write('GET / HTTP/1.1\r\n\r\n')

        client.once('data', data => {
          t.match(data.toString(), /Connection:\s*close/i)
          t.match(data.toString(), /200 OK/i)

          // Test that fastify closes the TCP connection
          client.once('close', () => {
            t.end()
          })
        })
      })
    })
  })
})

t.test('Current opened connection should not accept new incoming connections', t => {
  t.plan(3)
  const fastify = Fastify()
  fastify.get('/', (req, reply) => {
    fastify.close()
    setTimeout(() => {
      reply.send({ hello: 'world' })
    }, 250)
  })

  fastify.listen(0, err => {
    t.error(err)
    const instance = new Client('http://localhost:' + fastify.server.address().port)
    instance.request({ path: '/', method: 'GET' }).then(data => {
      t.equal(data.statusCode, 200)
    })
    instance.request({ path: '/', method: 'GET' }).then(data => {
      t.equal(data.statusCode, 503)
    })
  })
})

test('Cannot be reopened the closed server without listen callback', async t => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.listen(0)
  await fastify.close()

  try {
    await fastify.listen(0)
  } catch (err) {
    t.ok(err)
    t.equal(err.code, 'FST_ERR_REOPENED_CLOSE_SERVER')
  }
})

test('Cannot be reopened the closed server has listen callback', async t => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.listen(0)
  await fastify.close()

  await new Promise((resolve, reject) => {
    fastify.listen(0, err => {
      reject(err)
    })
  }).catch(err => {
    t.equal(err.code, 'FST_ERR_REOPENED_CLOSE_SERVER')
    t.ok(err)
  })
})
