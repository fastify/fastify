'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('../fastify')

test('route-shorthand', t => {
  const methodsReader = new Fastify()
  const supportedMethods = methodsReader.supportedMethods

  t.plan(supportedMethods.length + 1)
  const test = t.test

  for (const method of supportedMethods) {
    test(`route-shorthand - ${method.toLowerCase()}`, t => {
      t.plan(3)
      const fastify = new Fastify()
      fastify[method.toLowerCase()]('/', function (req, reply) {
        t.equal(req.method, method)
        reply.send()
      })
      fastify.listen({ port: 0 }, function (err) {
        if (err) t.error(err)
        t.teardown(() => { fastify.close() })
        sget({
          method,
          url: 'http://localhost:' + fastify.server.address().port
        }, (err, response, body) => {
          t.error(err)
          t.equal(response.statusCode, 200)
        })
      })
    })
  }

  test('route-shorthand - all', t => {
    t.plan(3 * supportedMethods.length)
    const fastify = new Fastify()
    let currentMethod = ''
    fastify.all('/', function (req, reply) {
      t.equal(req.method, currentMethod)
      reply.send()
    })
    fastify.listen({ port: 0 }, async function (err) {
      if (err) t.error(err)
      t.teardown(() => { fastify.close() })
      for (const method of supportedMethods) {
        currentMethod = method
        await new Promise(resolve => sget({
          method,
          url: 'http://localhost:' + fastify.server.address().port
        }, (err, response, body) => {
          t.error(err)
          t.equal(response.statusCode, 200)
          resolve()
        })
        )
      }
    })
  })
})
