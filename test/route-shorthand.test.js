'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const Fastify = require('..')

test('route-shorthand', async (t) => {
  const methodsReader = new Fastify()
  const supportedMethods = methodsReader.supportedMethods

  for (const method of supportedMethods) {
    await t.test(`route-shorthand - ${method.toLowerCase()}`, async (t) => {
      t.plan(2)
      const fastify = new Fastify()
      fastify[method.toLowerCase()]('/', (req, reply) => {
        t.assert.strictEqual(req.method, method)
        reply.send()
      })
      await fastify.listen({ port: 0 })
      t.after(() => fastify.close())

      await new Promise((resolve, reject) => {
        sget({
          method,
          url: `http://localhost:${fastify.server.address().port}`
        }, (err, response, body) => {
          if (err) {
            t.assert.ifError(err)
            return reject(err)
          }
          t.assert.strictEqual(response.statusCode, 200)
          resolve()
        })
      })
    })
  }

  await t.test('route-shorthand - all', async (t) => {
    t.plan(2 * supportedMethods.length)
    const fastify = new Fastify()
    let currentMethod = ''
    fastify.all('/', function (req, reply) {
      t.assert.strictEqual(req.method, currentMethod)
      reply.send()
    })
    await fastify.listen({ port: 0 })
    t.after(() => fastify.close())

    for (const method of supportedMethods) {
      currentMethod = method
      await new Promise((resolve, reject) => {
        sget({
          method,
          url: `http://localhost:${fastify.server.address().port}`
        }, (err, response, body) => {
          if (err) {
            t.assert.ifError(err)
            return reject(err)
          }
          t.assert.strictEqual(response.statusCode, 200)
          resolve()
        })
      })
    }
  })
})
