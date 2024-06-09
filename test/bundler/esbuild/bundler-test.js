'use strict'

const t = require('tap')
const test = t.test
const fastifySuccess = require('./dist/success')
const fastifyFailPlugin = require('./dist/failPlugin')

test('Bundled package should work', (t) => {
  t.plan(4)
  fastifySuccess.ready((err) => {
    t.error(err)
    fastifySuccess.inject(
      {
        method: 'GET',
        url: '/'
      },
      (error, res) => {
        t.error(error)
        t.equal(res.statusCode, 200)
        t.same(res.json(), { hello: 'world' })
      }
    )
  })
})

test('Bundled package should not work with bad plugin version', (t) => {
  t.plan(1)
  fastifyFailPlugin.ready((err) => {
    t.match(err.message, /expected '9.x' fastify version/i)
  })
})
