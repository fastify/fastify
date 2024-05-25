'use strict'

const Fastify = require('..')
const { test } = require('tap')
const http = require('http')
const http2 = require('http2')

const testResBody = 'Hello, world!'

test('sends early hints', (t) => {
  t.plan(6)

  const fastify = Fastify({
    logger: false
  })

  fastify.get('/', async (request, reply) => {
    reply.writeEarlyHints({
      link: '</styles.css>; rel=preload; as=style'
    }, () => {
      t.pass('callback called')
    })

    return testResBody
  })

  fastify.listen({ port: 0 }, (err, address) => {
    t.error(err)

    const req = http.get(address)

    req.on('information', (res) => {
      t.equal(res.statusCode, 103)
      t.equal(res.headers.link, '</styles.css>; rel=preload; as=style')
    })

    req.on('response', (res) => {
      t.equal(res.statusCode, 200)

      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        t.equal(data, testResBody)
        fastify.close(t.end)
      })
    })
  })
})

test('sends early hints (http2)', (t) => {
  t.plan(6)

  const fastify = Fastify({
    http2: true,
    logger: false
  })

  fastify.get('/', async (request, reply) => {
    reply.writeEarlyHints({
      link: '</styles.css>; rel=preload; as=style'
    })

    return testResBody
  })

  fastify.listen({ port: 0 }, (err, address) => {
    t.error(err)

    const client = http2.connect(address)
    const req = client.request()

    req.on('headers', (headers) => {
      t.not(headers, undefined)
      t.equal(headers[':status'], 103)
      t.equal(headers.link, '</styles.css>; rel=preload; as=style')
    })

    req.on('response', (headers) => {
      t.equal(headers[':status'], 200)
    })

    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })

    req.on('end', () => {
      t.equal(data, testResBody)
      client.close()
      fastify.close(t.end)
    })

    req.end()
  })
})
