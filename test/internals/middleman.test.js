'use strict'

const middleman = require('../../lib/middleman')
const t = require('tap')
const test = t.test

test('use no function', t => {
  t.plan(3)

  const instance = middleman(function (err, a, b) {
    t.error(err)
    t.equal(a, req)
    t.equal(b, res)
  })

  const req = {}
  const res = {}

  instance.run(req, res)
})

test('use a function', t => {
  t.plan(5)

  const instance = middleman(function (err, a, b) {
    t.error(err)
    t.equal(a, req)
    t.equal(b, res)
  })
  const req = {}
  const res = {}

  t.equal(instance.use(function (req, res, next) {
    t.pass('function called')
    next()
  }), instance)

  instance.run(req, res)
})
