'use strict'

const stream = require('node:stream')
const t = require('tap')
const test = t.test
const Fastify = require('..')

test('Creates a HEAD route for a GET one with prefixTrailingSlash', async (t) => {
  t.plan(1)

  const fastify = Fastify()

  const arr = []
  fastify.register((instance, opts, next) => {
    instance.addHook('onRoute', (routeOptions) => {
      arr.push(`${routeOptions.method} ${routeOptions.url}`)
    })

    instance.route({
      method: 'GET',
      path: '/',
      exposeHeadRoute: true,
      prefixTrailingSlash: 'both',
      handler: (req, reply) => {
        reply.send({ here: 'is coffee' })
      }
    })

    next()
  }, { prefix: '/v1' })

  await fastify.ready()

  t.ok(true)
})

test('Will not create a HEAD route that is not GET', t => {
  t.plan(11)

  const fastify = Fastify({ exposeHeadRoutes: true })

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    handler: (req, reply) => {
      reply.send({ here: 'is coffee' })
    }
  })

  fastify.route({
    method: 'GET',
    path: '/some-light',
    handler: (req, reply) => {
      reply.send()
    }
  })

  fastify.route({
    method: 'POST',
    path: '/something',
    handler: (req, reply) => {
      reply.send({ look: 'It is something!' })
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/more-coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.same(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/some-light'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], undefined)
    t.equal(res.headers['content-length'], '0')
    t.equal(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/something'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 404)
  })
})

test('HEAD route should handle properly each response type', t => {
  t.plan(25)

  const fastify = Fastify({ exposeHeadRoutes: true })
  const resString = 'Found me!'
  const resJSON = { here: 'is Johnny' }
  const resBuffer = Buffer.from('I am a buffer!')
  const resStream = stream.Readable.from('I am a stream!')

  fastify.route({
    method: 'GET',
    path: '/json',
    handler: (req, reply) => {
      reply.send(resJSON)
    }
  })

  fastify.route({
    method: 'GET',
    path: '/string',
    handler: (req, reply) => {
      reply.send(resString)
    }
  })

  fastify.route({
    method: 'GET',
    path: '/buffer',
    handler: (req, reply) => {
      reply.send(resBuffer)
    }
  })

  fastify.route({
    method: 'GET',
    path: '/buffer-with-content-type',
    handler: (req, reply) => {
      reply.headers({ 'content-type': 'image/jpeg' })
      reply.send(resBuffer)
    }
  })

  fastify.route({
    method: 'GET',
    path: '/stream',
    handler: (req, reply) => {
      return resStream
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/json'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.equal(res.headers['content-length'], `${Buffer.byteLength(JSON.stringify(resJSON))}`)
    t.same(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/string'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/plain; charset=utf-8')
    t.equal(res.headers['content-length'], `${Buffer.byteLength(resString)}`)
    t.equal(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/buffer'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/octet-stream')
    t.equal(res.headers['content-length'], `${resBuffer.byteLength}`)
    t.equal(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/buffer-with-content-type'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'image/jpeg')
    t.equal(res.headers['content-length'], `${resBuffer.byteLength}`)
    t.equal(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/stream'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], undefined)
    t.equal(res.headers['content-length'], undefined)
    t.equal(res.body, '')
  })
})

test('HEAD route should respect custom onSend handlers', t => {
  t.plan(6)

  let counter = 0
  const resBuffer = Buffer.from('I am a coffee!')
  const fastify = Fastify({ exposeHeadRoutes: true })
  const customOnSend = (res, reply, payload, done) => {
    counter = counter + 1
    done(null, payload)
  }

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    handler: (req, reply) => {
      reply.send(resBuffer)
    },
    onSend: [customOnSend, customOnSend]
  })

  fastify.inject({
    method: 'HEAD',
    url: '/more-coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/octet-stream')
    t.equal(res.headers['content-length'], `${resBuffer.byteLength}`)
    t.equal(res.body, '')
    t.equal(counter, 2)
  })
})

test('route onSend can be function or array of functions', t => {
  t.plan(12)
  const counters = { single: 0, multiple: 0 }

  const resBuffer = Buffer.from('I am a coffee!')
  const fastify = Fastify({ exposeHeadRoutes: true })

  fastify.route({
    method: 'GET',
    path: '/coffee',
    handler: () => resBuffer,
    onSend: (res, reply, payload, done) => {
      counters.single += 1
      done(null, payload)
    }
  })

  const customOnSend = (res, reply, payload, done) => {
    counters.multiple += 1
    done(null, payload)
  }

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    handler: () => resBuffer,
    onSend: [customOnSend, customOnSend]
  })

  fastify.inject({ method: 'HEAD', url: '/coffee' }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/octet-stream')
    t.equal(res.headers['content-length'], `${resBuffer.byteLength}`)
    t.equal(res.body, '')
    t.equal(counters.single, 1)
  })

  fastify.inject({ method: 'HEAD', url: '/more-coffee' }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/octet-stream')
    t.equal(res.headers['content-length'], `${resBuffer.byteLength}`)
    t.equal(res.body, '')
    t.equal(counters.multiple, 2)
  })
})

test('no warning for exposeHeadRoute', async t => {
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    exposeHeadRoute: true,
    async handler () {
      return 'hello world'
    }
  })

  const listener = (w) => {
    t.fail('no warning')
  }

  process.on('warning', listener)

  await fastify.listen({ port: 0 })

  process.removeListener('warning', listener)

  await fastify.close()
})
