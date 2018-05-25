'use strict'

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

test('Should return 503 while closing - injection', t => {
  t.plan(8)
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
        t.error(err)
        t.strictEqual(res.statusCode, 503)
        t.strictEqual(res.headers['content-type'], 'application/json')
        t.strictEqual(res.headers['content-length'], '80')
        t.strictEqual(res.headers['connection'], 'close')
        t.deepEqual(JSON.parse(res.payload), {
          error: 'Service Unavailable',
          message: 'Service Unavailable',
          statusCode: 503
        })
      })
    }, 100)
  })
})
