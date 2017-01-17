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

test('use two functions', t => {
  t.plan(5)

  const instance = middleman(function (err, a, b) {
    t.error(err)
    t.equal(a, req)
    t.equal(b, res)
  })
  const req = {}
  const res = {}
  var counter = 0

  instance.use(function (req, res, next) {
    t.is(counter++, 0, 'first function called')
    next()
  }).use(function (req, res, next) {
    t.is(counter++, 1, 'second function called')
    next()
  })

  instance.run(req, res)
})

test('stop the middleware chain if one errors', t => {
  t.plan(1)

  const instance = middleman(function (err, a, b) {
    t.ok(err, 'error is forwarded')
  })
  const req = {}
  const res = {}

  instance.use(function (req, res, next) {
    next(new Error('kaboom'))
  }).use(function (req, res, next) {
    t.fail('this should never be called')
    next()
  })

  instance.run(req, res)
})
