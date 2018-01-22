'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('that it correctly loads decorators across plugins', (t) => {
  const fastify = Fastify()

  let timesCalled = 0
  const pluginWithDecorator = (fastify, opts, next) => {
    fastify.decorate('someFunc', () => {
      timesCalled++
      return 'world'
    })
    next()
  }

  const pluginToInject = (fastify, opts, next) => {
    fastify.get('/hello', (req, res) => {
      t.type(fastify.someFunc, 'function')
      res.end(fastify.someFunc())
    })
    next()
  }

  fastify.register(pluginWithDecorator)
  fastify.register(pluginToInject)

  fastify.ready(() => {
    fastify.inject({
      method: 'GET',
      url: '/hello'
    }, (err, res) => {
      if (err) throw err
      t.equal(timesCalled, 1)
      t.equal(res.payload, '"world"')
      t.end()
    })
  })
})
