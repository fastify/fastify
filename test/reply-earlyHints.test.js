'use strict'

const Fastify = require('..')
const tap = require('tap')

const testResBody = 'Hello, world!'

tap.test('Happy flow - string argument', (t) => {
  const fastify = Fastify({
    http2: true,
    logger: {
      level: 'debug'
    }
  })

  fastify.get('/', async (request, reply) => {
    reply.writeEarlyHints({
      link: '</styles.css>; rel=preload; as=style'
    })

    return testResBody
  })

  fastify.listen({ port: 0 }, (err, address) => {
    t.error(err)

    const client = require('http2').connect(address)
    const req = client.request({
      ':path': '/'
    })

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
