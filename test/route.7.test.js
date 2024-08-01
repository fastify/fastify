'use strict'

const stream = require('node:stream')
const split = require('split2')
const t = require('tap')
const test = t.test
const Fastify = require('..')

test("HEAD route should handle stream.on('error')", t => {
  t.plan(6)

  const resStream = stream.Readable.from('Hello with error!')
  const logStream = split(JSON.parse)
  const expectedError = new Error('Hello!')
  const fastify = Fastify({
    logger: {
      stream: logStream,
      level: 'error'
    }
  })

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    exposeHeadRoute: true,
    handler: (req, reply) => {
      process.nextTick(() => resStream.emit('error', expectedError))
      return resStream
    }
  })

  logStream.once('data', line => {
    const { message, stack } = expectedError
    t.same(line.err, { type: 'Error', message, stack })
    t.equal(line.msg, 'Error on Stream found for HEAD route')
    t.equal(line.level, 50)
  })

  fastify.inject({
    method: 'HEAD',
    url: '/more-coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], undefined)
  })
})

test('HEAD route should be exposed by default', t => {
  t.plan(7)

  const resStream = stream.Readable.from('Hello with error!')
  const resJson = { hello: 'world' }
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    path: '/without-flag',
    handler: (req, reply) => {
      return resStream
    }
  })

  fastify.route({
    exposeHeadRoute: true,
    method: 'GET',
    path: '/with-flag',
    handler: (req, reply) => {
      return resJson
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/without-flag'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'HEAD',
    url: '/with-flag'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.equal(res.headers['content-length'], `${Buffer.byteLength(JSON.stringify(resJson))}`)
    t.equal(res.body, '')
  })
})

test('HEAD route should be exposed if route exposeHeadRoute is set', t => {
  t.plan(7)

  const resBuffer = Buffer.from('I am a coffee!')
  const resJson = { hello: 'world' }
  const fastify = Fastify({ exposeHeadRoutes: false })

  fastify.route({
    exposeHeadRoute: true,
    method: 'GET',
    path: '/one',
    handler: (req, reply) => {
      return resBuffer
    }
  })

  fastify.route({
    method: 'GET',
    path: '/two',
    handler: (req, reply) => {
      return resJson
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/one'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/octet-stream')
    t.equal(res.headers['content-length'], `${resBuffer.byteLength}`)
    t.equal(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/two'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 404)
  })
})

test('Set a custom HEAD route before GET one without disabling exposeHeadRoutes (global)', t => {
  t.plan(6)

  const resBuffer = Buffer.from('I am a coffee!')
  const fastify = Fastify({
    exposeHeadRoutes: true
  })

  fastify.route({
    method: 'HEAD',
    path: '/one',
    handler: (req, reply) => {
      reply.header('content-type', 'application/pdf')
      reply.header('content-length', `${resBuffer.byteLength}`)
      reply.header('x-custom-header', 'some-custom-header')
      reply.send()
    }
  })

  fastify.route({
    method: 'GET',
    path: '/one',
    handler: (req, reply) => {
      return resBuffer
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/one'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/pdf')
    t.equal(res.headers['content-length'], `${resBuffer.byteLength}`)
    t.equal(res.headers['x-custom-header'], 'some-custom-header')
    t.equal(res.body, '')
  })
})

test('Set a custom HEAD route before GET one without disabling exposeHeadRoutes (route)', t => {
  t.plan(6)

  const fastify = Fastify()

  const resBuffer = Buffer.from('I am a coffee!')

  fastify.route({
    method: 'HEAD',
    path: '/one',
    handler: (req, reply) => {
      reply.header('content-type', 'application/pdf')
      reply.header('content-length', `${resBuffer.byteLength}`)
      reply.header('x-custom-header', 'some-custom-header')
      reply.send()
    }
  })

  fastify.route({
    method: 'GET',
    exposeHeadRoute: true,
    path: '/one',
    handler: (req, reply) => {
      return resBuffer
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/one'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/pdf')
    t.equal(res.headers['content-length'], `${resBuffer.byteLength}`)
    t.equal(res.headers['x-custom-header'], 'some-custom-header')
    t.equal(res.body, '')
  })
})

test('HEAD routes properly auto created for GET routes when prefixTrailingSlash: \'no-slash\'', t => {
  t.plan(2)

  const fastify = Fastify()

  fastify.register(function routes (f, opts, next) {
    f.route({
      method: 'GET',
      url: '/',
      exposeHeadRoute: true,
      prefixTrailingSlash: 'no-slash',
      handler: (req, reply) => {
        reply.send({ hello: 'world' })
      }
    })

    next()
  }, { prefix: '/prefix' })

  fastify.inject({ url: '/prefix/prefix', method: 'HEAD' }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

test('HEAD routes properly auto created for GET routes when prefixTrailingSlash: \'both\'', async t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.register(function routes (f, opts, next) {
    f.route({
      method: 'GET',
      url: '/',
      exposeHeadRoute: true,
      prefixTrailingSlash: 'both',
      handler: (req, reply) => {
        reply.send({ hello: 'world' })
      }
    })

    next()
  }, { prefix: '/prefix' })

  const doublePrefixReply = await fastify.inject({ url: '/prefix/prefix', method: 'HEAD' })
  const trailingSlashReply = await fastify.inject({ url: '/prefix/', method: 'HEAD' })
  const noneTrailingReply = await fastify.inject({ url: '/prefix', method: 'HEAD' })

  t.equal(doublePrefixReply.statusCode, 404)
  t.equal(trailingSlashReply.statusCode, 200)
  t.equal(noneTrailingReply.statusCode, 200)
})

test('GET route with body schema should throw', t => {
  t.plan(1)

  const fastify = Fastify()

  t.throws(() => {
    fastify.route({
      method: 'GET',
      path: '/get',
      schema: {
        body: {}
      },
      handler: function (req, reply) {
        reply.send({ hello: 'world' })
      }
    })
  }, new Error('Body validation schema for GET:/get route is not supported!'))
})

test('HEAD route with body schema should throw', t => {
  t.plan(1)

  const fastify = Fastify()

  t.throws(() => {
    fastify.route({
      method: 'HEAD',
      path: '/shouldThrow',
      schema: {
        body: {}
      },
      handler: function (req, reply) {
        reply.send({ hello: 'world' })
      }
    })
  }, new Error('Body validation schema for HEAD:/shouldThrow route is not supported!'))
})

test('[HEAD, GET] route with body schema should throw', t => {
  t.plan(1)

  const fastify = Fastify()

  t.throws(() => {
    fastify.route({
      method: ['HEAD', 'GET'],
      path: '/shouldThrowHead',
      schema: {
        body: {}
      },
      handler: function (req, reply) {
        reply.send({ hello: 'world' })
      }
    })
  }, new Error('Body validation schema for HEAD:/shouldThrowHead route is not supported!'))
})

test('GET route with body schema should throw - shorthand', t => {
  t.plan(1)

  const fastify = Fastify()

  t.throws(() => {
    fastify.get('/shouldThrow', {
      schema: {
        body: {}
      }
    },
    function (req, reply) {
      reply.send({ hello: 'world' })
    }
    )
  }, new Error('Body validation schema for GET:/shouldThrow route is not supported!'))
})

test('HEAD route with body schema should throw - shorthand', t => {
  t.plan(1)

  const fastify = Fastify()

  t.throws(() => {
    fastify.head('/shouldThrow2', {
      schema: {
        body: {}
      }
    },
    function (req, reply) {
      reply.send({ hello: 'world' })
    }
    )
  }, new Error('Body validation schema for HEAD:/shouldThrow2 route is not supported!'))
})
