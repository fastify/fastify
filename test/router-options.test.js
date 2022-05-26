'use strict'

const test = require('tap').test
const sget = require('simple-get')
const Fastify = require('../')
const { FST_ERR_BAD_URL } = require('../lib/errors')

function getUrl (app) {
  const { address, port } = app.server.address()
  if (address === '::1') {
    return `http://[${address}]:${port}`
  } else {
    return `http://${address}:${port}`
  }
}

test('Should honor ignoreTrailingSlash option', t => {
  t.plan(4)
  const fastify = Fastify({
    ignoreTrailingSlash: true
  })

  fastify.get('/test', (req, res) => {
    res.send('test')
  })

  fastify.listen({ port: 0 }, (err) => {
    t.teardown(() => { fastify.close() })
    if (err) t.threw(err)

    const baseUrl = getUrl(fastify)

    sget.concat(baseUrl + '/test', (err, res, data) => {
      if (err) t.threw(err)
      t.equal(res.statusCode, 200)
      t.equal(data.toString(), 'test')
    })

    sget.concat(baseUrl + '/test/', (err, res, data) => {
      if (err) t.threw(err)
      t.equal(res.statusCode, 200)
      t.equal(data.toString(), 'test')
    })
  })
})

test('Should honor ignoreDuplicateSlashes option', t => {
  t.plan(4)
  const fastify = Fastify({
    ignoreDuplicateSlashes: true
  })

  fastify.get('/test//test///test', (req, res) => {
    res.send('test')
  })

  fastify.listen({ port: 0 }, (err) => {
    t.teardown(() => { fastify.close() })
    if (err) t.threw(err)

    const baseUrl = getUrl(fastify)

    sget.concat(baseUrl + '/test/test/test', (err, res, data) => {
      if (err) t.threw(err)
      t.equal(res.statusCode, 200)
      t.equal(data.toString(), 'test')
    })

    sget.concat(baseUrl + '/test//test///test', (err, res, data) => {
      if (err) t.threw(err)
      t.equal(res.statusCode, 200)
      t.equal(data.toString(), 'test')
    })
  })
})

test('Should honor ignoreTrailingSlash and ignoreDuplicateSlashes options', t => {
  t.plan(4)
  const fastify = Fastify({
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true
  })

  fastify.get('/test//test///test', (req, res) => {
    res.send('test')
  })

  fastify.listen({ port: 0 }, (err) => {
    t.teardown(() => { fastify.close() })
    if (err) t.threw(err)

    const baseUrl = getUrl(fastify)

    sget.concat(baseUrl + '/test/test/test/', (err, res, data) => {
      if (err) t.threw(err)
      t.equal(res.statusCode, 200)
      t.equal(data.toString(), 'test')
    })

    sget.concat(baseUrl + '/test//test///test//', (err, res, data) => {
      if (err) t.threw(err)
      t.equal(res.statusCode, 200)
      t.equal(data.toString(), 'test')
    })
  })
})

test('Should honor maxParamLength option', t => {
  t.plan(4)
  const fastify = Fastify({ maxParamLength: 10 })

  fastify.get('/test/:id', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/test/123456789'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/test/123456789abcd'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 404)
  })
})

test('Should expose router options via getters on request and reply', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.get('/test/:id', (req, reply) => {
    t.equal(reply.context.config.url, '/test/:id')
    t.equal(reply.context.config.method, 'GET')
    t.equal(req.routerPath, '/test/:id')
    t.equal(req.routerMethod, 'GET')
    t.equal(req.is404, false)
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/test/123456789'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })
})

test('Should set is404 flag for unmatched paths', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.setNotFoundHandler((req, reply) => {
    t.equal(req.is404, true)
    reply.code(404).send({ error: 'Not Found', message: 'Four oh for', statusCode: 404 })
  })

  fastify.inject({
    method: 'GET',
    url: '/nonexist/123456789'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 404)
  })
})

test('Should honor frameworkErrors option', t => {
  t.plan(3)
  const fastify = Fastify({
    frameworkErrors: function (err, req, res) {
      if (err instanceof FST_ERR_BAD_URL) {
        t.ok(true)
      } else {
        t.fail()
      }
      res.send(`${err.message} - ${err.code}`)
    }
  })

  fastify.get('/test/:id', (req, res) => {
    res.send('{ hello: \'world\' }')
  })

  fastify.inject(
    {
      method: 'GET',
      url: '/test/%world'
    },
    (err, res) => {
      t.error(err)
      t.equal(res.body, '\'/test/%world\' is not a valid url component - FST_ERR_BAD_URL')
    }
  )
})
