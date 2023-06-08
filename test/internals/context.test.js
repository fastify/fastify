'use strict'

const { test } = require('tap')

const { kRouteContext } = require('../../lib/symbols')
const Context = require('../../lib/context')

const Fastify = require('../..')

test('context', context => {
  context.plan(1)

  context.test('Should not contain undefined as key prop', async t => {
    const app = Fastify()

    app.get('/', (req, reply) => {
      t.type(req[kRouteContext], Context)
      t.type(reply[kRouteContext], Context)
      t.notOk('undefined' in reply[kRouteContext])
      t.notOk('undefined' in req[kRouteContext])

      reply.send('hello world!')
    })

    try {
      await app.inject('/')
    } catch (e) {
      t.fail(e)
    }

    t.plan(4)
  })
})
