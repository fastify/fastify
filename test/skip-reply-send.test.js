'use strict'

const { test } = require('tap')
const split = require('split2')
const net = require('net')
const Fastify = require('../fastify')

process.removeAllListeners('warning')

const lifecycleHooks = [
  'onRequest',
  'preParsing',
  'preValidation',
  'preHandler',
  'preSerialization',
  'onSend',
  'onTimeout',
  'onResponse',
  'onError'
]

test('skip automatic reply.send() with reply.sent = true and a body', (t) => {
  const stream = split(JSON.parse)
  const app = Fastify({
    logger: {
      stream
    }
  })

  stream.on('data', (line) => {
    t.not(line.level, 40) // there are no errors
    t.not(line.level, 50) // there are no errors
  })

  app.get('/', (req, reply) => {
    reply.sent = true
    reply.raw.end('hello world')

    return Promise.resolve('this will be skipped')
  })

  return app.inject({
    method: 'GET',
    url: '/'
  }).then((res) => {
    t.equal(res.statusCode, 200)
    t.equal(res.body, 'hello world')
  })
})

test('skip automatic reply.send() with reply.sent = true and no body', (t) => {
  const stream = split(JSON.parse)
  const app = Fastify({
    logger: {
      stream
    }
  })

  stream.on('data', (line) => {
    t.not(line.level, 40) // there are no error
    t.not(line.level, 50) // there are no error
  })

  app.get('/', (req, reply) => {
    reply.sent = true
    reply.raw.end('hello world')

    return Promise.resolve()
  })

  return app.inject({
    method: 'GET',
    url: '/'
  }).then((res) => {
    t.equal(res.statusCode, 200)
    t.equal(res.body, 'hello world')
  })
})

test('skip automatic reply.send() with reply.sent = true and an error', (t) => {
  const stream = split(JSON.parse)
  const app = Fastify({
    logger: {
      stream
    }
  })

  let errorSeen = false

  stream.on('data', (line) => {
    if (line.level === 50) {
      errorSeen = true
      t.equal(line.err.message, 'kaboom')
      t.equal(line.msg, 'Promise errored, but reply.sent = true was set')
    }
  })

  app.get('/', (req, reply) => {
    reply.sent = true
    reply.raw.end('hello world')

    return Promise.reject(new Error('kaboom'))
  })

  return app.inject({
    method: 'GET',
    url: '/'
  }).then((res) => {
    t.equal(errorSeen, true)
    t.equal(res.statusCode, 200)
    t.equal(res.body, 'hello world')
  })
})

function testHandlerOrBeforeHandlerHook (test, hookOrHandler) {
  const idx = hookOrHandler === 'handler' ? lifecycleHooks.indexOf('preHandler') : lifecycleHooks.indexOf(hookOrHandler)
  const previousHooks = lifecycleHooks.slice(0, idx)
  const nextHooks = lifecycleHooks.slice(idx + 1)

  test(`Hijacking inside ${hookOrHandler} skips all the following hooks and handler execution`, t => {
    t.plan(4)
    const test = t.test

    test('Sending a response using reply.raw => onResponse hook is called', t => {
      const stream = split(JSON.parse)
      const app = Fastify({
        logger: {
          stream
        }
      })

      stream.on('data', (line) => {
        t.not(line.level, 40) // there are no errors
        t.not(line.level, 50) // there are no errors
      })

      previousHooks.forEach(h => app.addHook(h, async (req, reply) => t.pass(`${h} should be called`)))

      if (hookOrHandler === 'handler') {
        app.get('/', (req, reply) => {
          reply.hijack()
          reply.raw.end(`hello from ${hookOrHandler}`)
        })
      } else {
        app.addHook(hookOrHandler, async (req, reply) => {
          reply.hijack()
          reply.raw.end(`hello from ${hookOrHandler}`)
        })
        app.get('/', (req, reply) => t.fail('Handler should not be called'))
      }

      nextHooks.forEach(h => {
        if (h === 'onResponse') {
          app.addHook(h, async (req, reply) => t.pass(`${h} should be called`))
        } else {
          app.addHook(h, async (req, reply) => t.fail(`${h} should not be called`))
        }
      })

      return app.inject({
        method: 'GET',
        url: '/'
      }).then((res) => {
        t.equal(res.statusCode, 200)
        t.equal(res.body, `hello from ${hookOrHandler}`)
      })
    })

    test('Sending a response using req.socket => onResponse not called', t => {
      const stream = split(JSON.parse)
      const app = Fastify({
        logger: {
          stream
        }
      })
      t.teardown(() => app.close())

      stream.on('data', (line) => {
        t.not(line.level, 40) // there are no errors
        t.not(line.level, 50) // there are no errors
      })

      previousHooks.forEach(h => app.addHook(h, async (req, reply) => t.pass(`${h} should be called`)))

      if (hookOrHandler === 'handler') {
        app.get('/', (req, reply) => {
          reply.hijack()
          req.socket.write('HTTP/1.1 200 OK\r\n\r\n')
          req.socket.write(`hello from ${hookOrHandler}`)
          req.socket.end()
        })
      } else {
        app.addHook(hookOrHandler, async (req, reply) => {
          reply.hijack()
          req.socket.write('HTTP/1.1 200 OK\r\n\r\n')
          req.socket.write(`hello from ${hookOrHandler}`)
          req.socket.end()
        })
        app.get('/', (req, reply) => t.fail('Handler should not be called'))
      }

      nextHooks.forEach(h => app.addHook(h, async (req, reply) => t.fail(`${h} should not be called`)))

      app.listen({ port: 0 }, err => {
        t.error(err)
        const client = net.createConnection({ port: (app.server.address()).port }, () => {
          client.write('GET / HTTP/1.1\r\n\r\n')

          let chunks = ''
          client.setEncoding('utf8')
          client.on('data', data => {
            chunks += data
          })

          client.on('end', function () {
            t.match(chunks, new RegExp(`hello from ${hookOrHandler}`, 'i'))
            t.end()
          })
        })
      })
    })

    test('Throwing an error doesnt trigger any hooks', t => {
      const stream = split(JSON.parse)
      const app = Fastify({
        logger: {
          stream
        }
      })
      t.teardown(() => app.close())

      let errorSeen = false
      stream.on('data', (line) => {
        if (hookOrHandler === 'handler') {
          if (line.level === 40) {
            errorSeen = true
            t.equal(line.err.code, 'FST_ERR_REP_ALREADY_SENT')
          }
        } else {
          t.not(line.level, 40) // there are no errors
          t.not(line.level, 50) // there are no errors
        }
      })

      previousHooks.forEach(h => app.addHook(h, async (req, reply) => t.pass(`${h} should be called`)))

      if (hookOrHandler === 'handler') {
        app.get('/', (req, reply) => {
          reply.hijack()
          throw new Error('This wil be skipped')
        })
      } else {
        app.addHook(hookOrHandler, async (req, reply) => {
          reply.hijack()
          throw new Error('This wil be skipped')
        })
        app.get('/', (req, reply) => t.fail('Handler should not be called'))
      }

      nextHooks.forEach(h => app.addHook(h, async (req, reply) => t.fail(`${h} should not be called`)))

      return Promise.race([
        app.inject({ method: 'GET', url: '/' }),
        new Promise((resolve, reject) => setTimeout(resolve, 1000))
      ]).then((err, res) => {
        t.error(err)
        if (hookOrHandler === 'handler') {
          t.equal(errorSeen, true)
        }
      })
    })

    test('Calling reply.send() after hijacking logs a warning', t => {
      const stream = split(JSON.parse)
      const app = Fastify({
        logger: {
          stream
        }
      })

      let errorSeen = false

      stream.on('data', (line) => {
        if (line.level === 40) {
          errorSeen = true
          t.equal(line.err.code, 'FST_ERR_REP_ALREADY_SENT')
        }
      })

      previousHooks.forEach(h => app.addHook(h, async (req, reply) => t.pass(`${h} should be called`)))

      if (hookOrHandler === 'handler') {
        app.get('/', (req, reply) => {
          reply.hijack()
          reply.send('hello from reply.send()')
        })
      } else {
        app.addHook(hookOrHandler, async (req, reply) => {
          reply.hijack()
          return reply.send('hello from reply.send()')
        })
        app.get('/', (req, reply) => t.fail('Handler should not be called'))
      }

      nextHooks.forEach(h => app.addHook(h, async (req, reply) => t.fail(`${h} should not be called`)))

      return Promise.race([
        app.inject({ method: 'GET', url: '/' }),
        new Promise((resolve, reject) => setTimeout(resolve, 1000))
      ]).then((err, res) => {
        t.error(err)
        t.equal(errorSeen, true)
      })
    })
  })
}

testHandlerOrBeforeHandlerHook(test, 'onRequest')
testHandlerOrBeforeHandlerHook(test, 'preParsing')
testHandlerOrBeforeHandlerHook(test, 'preValidation')
testHandlerOrBeforeHandlerHook(test, 'preHandler')
testHandlerOrBeforeHandlerHook(test, 'handler')
