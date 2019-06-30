'use strict'

const net = require('net')
const t = require('tap')
const test = t.test
const Fastify = require('..')

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
  fastify.register(function (f, opts, next) {
    f.addHook('onClose', onClose)
    function onClose (instance, done) {
      t.ok(instance.prototype === fastify.prototype)
      t.strictEqual(instance, f)
      done()
    }

    next()
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

  fastify.register(function (f, opts, next) {
    f.addHook('onClose', (instance, done) => {
      t.is(order.shift(), 1)
      done()
    })

    next()
  })

  fastify.addHook('onClose', (instance, done) => {
    t.is(order.shift(), 2)
    done()
  })

  fastify.listen(0, err => {
    t.error(err)

    fastify.close((err) => {
      t.error(err)
      t.is(order.shift(), 3)
    })
  })
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

  function plugin (instance, opts, next) {
    instance.decorate('test', true)
    instance.addHook('onClose', onClose)
    t.ok(instance.prototype === fastify.prototype)

    function onClose (i, done) {
      t.ok(i.test)
      t.strictEqual(i, instance)
      done()
    }

    next()
  }

  fastify.close((err) => {
    t.error(err)
  })
})

test('Should return error while closing - injection', t => {
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
    t.strictEqual(res.statusCode, 200)
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
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    fastify.close()
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)

    const port = fastify.server.address().port
    const client = net.createConnection({ port: port }, () => {
      client.write('GET / HTTP/1.1\r\n\r\n')

      const newConnection = net.createConnection({ port: port })
      newConnection.on('error', err => {
        t.ok(err)
        t.ok(['ECONNREFUSED', 'ECONNRESET'].includes(err.code))

        client.end()
        t.end()
      })
    })
  })
})
