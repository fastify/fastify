'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const sget = require('simple-get').concat

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
  t.plan(1)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: '1234', listenTextResolver: () => 'hardcoded text' }, (err) => {
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
    t.equal(req.hostname, 'localhost')
    t.equal(req.port, 8000)
    res.send('ok')
  })
  app.listen({ port: 8000 }, () => {
    sget('http://localhost:8000/host', () => { t.end() })
  })
})
