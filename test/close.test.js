'use strict'

const t = require('tap')
const test = t.test
const fastify = require('..')()

function onClose (instance, done) {
  t.type(fastify, instance)
  done()
}

test('hooks - add onClose', t => {
  t.plan(3)
  try {
    fastify.addHook('onClose', onClose)
    t.ok('should not throw')
  } catch (e) {
    t.fail()
  }

  fastify.listen(0, err => {
    t.error(err)

    try {
      fastify.close()
      t.ok('Should no throw')
    } catch (e) {
      t.fail(e)
    }
  })
})

test('close callback', t => {
  t.plan(3)
  fastify.addHook('onClose', onClose)

  fastify.listen(0, err => {
    t.error(err)

    fastify.close((err) => {
      t.error(err)
      t.ok('close callback')
    })
  })
})

test('inside register', t => {
  t.plan(3)
  fastify.register(function (f, opts, next) {
    f.addHook('onClose', onClose)
    next()
  })

  fastify.listen(0, err => {
    t.error(err)

    fastify.close((err) => {
      t.error(err)
      t.ok('close callback')
    })
  })
})
