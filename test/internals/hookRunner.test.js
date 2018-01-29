'use strict'

const t = require('tap')
const test = t.test
const Fast = require('../../lib/hookRunner')

test('Basic', t => {
  t.plan(9)

  const v1 = { hello: 'world' }
  const v2 = { ciao: 'mondo' }
  const v3 = { winter: 'is coming' }
  const v4 = { winter: 'has come' }
  const context = { context: true }

  const fast = Fast([fn1, fn2, fn3], context)
  t.is(typeof fast, 'function')
  fast(iterator.bind({ a: 'a', b: 'b' }), v1, done)

  function iterator (fn, value, next) {
    return fn(this.a, this.b, value, next)
  }

  function fn1 (a, b, value, done) {
    t.strictEqual(value, v1)
    t.strictEqual(this, context)
    done(null, v2)
  }

  function fn2 (a, b, value, done) {
    t.strictEqual(value, v2)
    t.strictEqual(this, context)
    done(null, v3)
  }

  function fn3 (a, b, value, done) {
    t.strictEqual(value, v3)
    t.strictEqual(this, context)
    done(null, v4)
  }

  function done (err, value) {
    t.error(err)
    t.strictEqual(value, v4)
  }
})

test('In case of error should skip to done', t => {
  t.plan(7)

  const v1 = { hello: 'world' }
  const v2 = { ciao: 'mondo' }
  const context = { context: true }

  const fast = Fast([fn1, fn2, fn3], context)
  t.is(typeof fast, 'function')
  fast(iterator.bind({ a: 'a', b: 'b' }), v1, done)

  function iterator (fn, value, next) {
    return fn(this.a, this.b, value, next)
  }

  function fn1 (a, b, value, done) {
    t.strictEqual(value, v1)
    t.strictEqual(this, context)
    done(null, v2)
  }

  function fn2 (a, b, value, done) {
    t.strictEqual(value, v2)
    t.strictEqual(this, context)
    done(new Error('kaboom'))
  }

  function fn3 (a, b, value, done) {
    t.fail('We should not be here')
  }

  function done (err, value) {
    t.is(err.message, 'kaboom')
    t.strictEqual(value, v2)
  }
})

test('Clean next', t => {
  t.plan(9)

  const v1 = { hello: 'world' }
  const context = { context: true }

  const fast = Fast([fn1, fn2, fn3], context)
  t.is(typeof fast, 'function')
  fast(iterator.bind({ a: 'a', b: 'b' }), v1, done)

  function iterator (fn, value, next) {
    return fn(this.a, this.b, value, next)
  }

  function fn1 (a, b, value, done) {
    t.strictEqual(value, v1)
    t.strictEqual(this, context)
    done()
  }

  function fn2 (a, b, value, done) {
    t.strictEqual(value, v1)
    t.strictEqual(this, context)
    done()
  }

  function fn3 (a, b, value, done) {
    t.strictEqual(value, v1)
    t.strictEqual(this, context)
    done()
  }

  function done (err, value) {
    t.error(err)
    t.strictEqual(value, v1)
  }
})

test('Should handle promises', t => {
  t.plan(9)

  const v1 = { hello: 'world' }
  const v2 = { ciao: 'mondo' }
  const v3 = { winter: 'is coming' }
  const v4 = { winter: 'has come' }
  const context = { context: true }

  const fast = Fast([fn1, fn2, fn3], context)
  t.is(typeof fast, 'function')
  fast(iterator.bind({ a: 'a', b: 'b' }), v1, done)

  function iterator (fn, value, next) {
    return fn(this.a, this.b, value, next)
  }

  function fn1 (a, b, value) {
    t.strictEqual(value, v1)
    t.strictEqual(this, context)
    return new Promise((resolve, reject) => {
      resolve(v2)
    })
  }

  function fn2 (a, b, value, done) {
    t.strictEqual(value, v2)
    t.strictEqual(this, context)
    return new Promise((resolve, reject) => {
      resolve(v3)
    })
  }

  function fn3 (a, b, value, done) {
    t.strictEqual(value, v3)
    t.strictEqual(this, context)
    return new Promise((resolve, reject) => {
      resolve(v4)
    })
  }

  function done (err, value) {
    t.error(err)
    t.strictEqual(value, v4)
  }
})

test('In case of error should skip to done (with promises)', t => {
  t.plan(7)

  const v1 = { hello: 'world' }
  const v2 = { ciao: 'mondo' }
  const context = { context: true }

  const fast = Fast([fn1, fn2, fn3], context)
  t.is(typeof fast, 'function')
  fast(iterator.bind({ a: 'a', b: 'b' }), v1, done)

  function iterator (fn, value, next) {
    return fn(this.a, this.b, value, next)
  }

  function fn1 (a, b, value, done) {
    t.strictEqual(value, v1)
    t.strictEqual(this, context)
    return new Promise((resolve, reject) => {
      resolve(v2)
    })
  }

  function fn2 (a, b, value, done) {
    t.strictEqual(value, v2)
    t.strictEqual(this, context)
    return new Promise((resolve, reject) => {
      reject(new Error('kaboom'))
    })
  }

  function fn3 (a, b, value, done) {
    t.fail('We should not be here')
  }

  function done (err, value) {
    t.is(err.message, 'kaboom')
    t.strictEqual(value, v2)
  }
})

test('Be able to exit before its natural end', t => {
  t.plan(5)

  const v1 = { hello: 'world' }
  const v2 = { ciao: 'mondo' }
  const v3 = { winter: 'is coming' }
  const context = { context: true }

  const fast = Fast([fn1, fn2, fn3], context)
  t.is(typeof fast, 'function')
  fast(iterator.bind({ a: 'a', b: 'b' }), v1, done)

  function iterator (fn, value, next) {
    if (value.winter) {
      return undefined
    }
    return fn(this.a, this.b, value, next)
  }

  function fn1 (a, b, value, done) {
    t.strictEqual(value, v1)
    t.strictEqual(this, context)
    done(null, v2)
  }

  function fn2 (a, b, value, done) {
    t.strictEqual(value, v2)
    t.strictEqual(this, context)
    done(null, v3)
  }

  function fn3 () {
    t.fail('this should not be called')
  }

  function done () {
    t.fail('this should not be called')
  }
})
