'use strict'

const t = require('tap')
const test = t.test
const { hookRunner, onSendHookRunner } = require('../../lib/hooks')

test('hookRunner - Basic', t => {
  t.plan(9)

  hookRunner([fn1, fn2, fn3], iterator, 'a', 'b', done)

  function iterator (fn, a, b, next) {
    return fn(a, b, next)
  }

  function fn1 (a, b, next) {
    t.strictEqual(a, 'a')
    t.strictEqual(b, 'b')
    next()
  }

  function fn2 (a, b, next) {
    t.strictEqual(a, 'a')
    t.strictEqual(b, 'b')
    next()
  }

  function fn3 (a, b, next) {
    t.strictEqual(a, 'a')
    t.strictEqual(b, 'b')
    next()
  }

  function done (err, a, b) {
    t.error(err)
    t.strictEqual(a, 'a')
    t.strictEqual(b, 'b')
  }
})

test('hookRunner - In case of error should skip to done', t => {
  t.plan(7)

  hookRunner([fn1, fn2, fn3], iterator, 'a', 'b', done)

  function iterator (fn, a, b, next) {
    return fn(a, b, next)
  }

  function fn1 (a, b, next) {
    t.strictEqual(a, 'a')
    t.strictEqual(b, 'b')
    next()
  }

  function fn2 (a, b, next) {
    t.strictEqual(a, 'a')
    t.strictEqual(b, 'b')
    next(new Error('kaboom'))
  }

  function fn3 () {
    t.fail('We should not be here')
  }

  function done (err, a, b) {
    t.strictEqual(err.message, 'kaboom')
    t.strictEqual(a, 'a')
    t.strictEqual(b, 'b')
  }
})

test('hookRunner - Should handle promises', t => {
  t.plan(9)

  hookRunner([fn1, fn2, fn3], iterator, 'a', 'b', done)

  function iterator (fn, a, b, next) {
    return fn(a, b, next)
  }

  function fn1 (a, b) {
    t.strictEqual(a, 'a')
    t.strictEqual(b, 'b')
    return Promise.resolve()
  }

  function fn2 (a, b) {
    t.strictEqual(a, 'a')
    t.strictEqual(b, 'b')
    return Promise.resolve()
  }

  function fn3 (a, b) {
    t.strictEqual(a, 'a')
    t.strictEqual(b, 'b')
    return Promise.resolve()
  }

  function done (err, a, b) {
    t.error(err)
    t.strictEqual(a, 'a')
    t.strictEqual(b, 'b')
  }
})

test('hookRunner - In case of error should skip to done (with promises)', t => {
  t.plan(7)

  hookRunner([fn1, fn2, fn3], iterator, 'a', 'b', done)

  function iterator (fn, a, b, next) {
    return fn(a, b, next)
  }

  function fn1 (a, b) {
    t.strictEqual(a, 'a')
    t.strictEqual(b, 'b')
    return Promise.resolve()
  }

  function fn2 (a, b) {
    t.strictEqual(a, 'a')
    t.strictEqual(b, 'b')
    return Promise.reject(new Error('kaboom'))
  }

  function fn3 () {
    t.fail('We should not be here')
  }

  function done (err, a, b) {
    t.strictEqual(err.message, 'kaboom')
    t.strictEqual(a, 'a')
    t.strictEqual(b, 'b')
  }
})

test('hookRunner - Be able to exit before its natural end', t => {
  t.plan(4)

  var shouldStop = false
  hookRunner([fn1, fn2, fn3], iterator, 'a', 'b', done)

  function iterator (fn, a, b, next) {
    if (shouldStop) {
      return undefined
    }
    return fn(a, b, next)
  }

  function fn1 (a, b, next) {
    t.strictEqual(a, 'a')
    t.strictEqual(b, 'b')
    next()
  }

  function fn2 (a, b) {
    t.strictEqual(a, 'a')
    t.strictEqual(b, 'b')
    shouldStop = true
    return Promise.resolve()
  }

  function fn3 () {
    t.fail('this should not be called')
  }

  function done () {
    t.fail('this should not be called')
  }
})

test('hookRunner - Promises that resolve to a value do not change the state', t => {
  t.plan(5)

  const originalState = { a: 'a', b: 'b' }

  hookRunner([fn1, fn2, fn3], iterator, originalState, 'b', done)

  function iterator (fn, state, b, next) {
    return fn(state, b, next)
  }

  function fn1 (state, b, next) {
    t.strictEqual(state, originalState)
    return Promise.resolve(null)
  }

  function fn2 (state, b, next) {
    t.strictEqual(state, originalState)
    return Promise.resolve('string')
  }

  function fn3 (state, b, next) {
    t.strictEqual(state, originalState)
    return Promise.resolve({ object: true })
  }

  function done (err, state, b) {
    t.error(err)
    t.strictEqual(state, originalState)
  }
})

test('onSendHookRunner - Basic', t => {
  t.plan(13)

  const originalRequest = { body: null }
  const originalReply = { request: originalRequest }
  const originalPayload = 'payload'

  onSendHookRunner([fn1, fn2, fn3], originalRequest, originalReply, originalPayload, done)

  function fn1 (request, reply, payload, next) {
    t.deepEqual(request, originalRequest)
    t.deepEqual(reply, originalReply)
    t.strictEqual(payload, originalPayload)
    next()
  }

  function fn2 (request, reply, payload, next) {
    t.deepEqual(request, originalRequest)
    t.deepEqual(reply, originalReply)
    t.strictEqual(payload, originalPayload)
    next()
  }

  function fn3 (request, reply, payload, next) {
    t.deepEqual(request, originalRequest)
    t.deepEqual(reply, originalReply)
    t.strictEqual(payload, originalPayload)
    next()
  }

  function done (err, request, reply, payload) {
    t.error(err)
    t.deepEqual(request, originalRequest)
    t.deepEqual(reply, originalReply)
    t.strictEqual(payload, originalPayload)
  }
})

test('onSendHookRunner - Can change the payload', t => {
  t.plan(7)

  const originalRequest = { body: null }
  const originalReply = { request: originalRequest }
  const v1 = { hello: 'world' }
  const v2 = { ciao: 'mondo' }
  const v3 = { winter: 'is coming' }
  const v4 = { winter: 'has come' }

  onSendHookRunner([fn1, fn2, fn3], originalRequest, originalReply, v1, done)

  function fn1 (request, reply, payload, next) {
    t.deepEqual(payload, v1)
    next(null, v2)
  }

  function fn2 (request, reply, payload, next) {
    t.deepEqual(payload, v2)
    next(null, v3)
  }

  function fn3 (request, reply, payload, next) {
    t.deepEqual(payload, v3)
    next(null, v4)
  }

  function done (err, request, reply, payload) {
    t.error(err)
    t.deepEqual(request, originalRequest)
    t.deepEqual(reply, originalReply)
    t.deepEqual(payload, v4)
  }
})

test('onSendHookRunner - In case of error should skip to done', t => {
  t.plan(6)

  const originalRequest = { body: null }
  const originalReply = { request: originalRequest }
  const v1 = { hello: 'world' }
  const v2 = { ciao: 'mondo' }

  onSendHookRunner([fn1, fn2, fn3], originalRequest, originalReply, v1, done)

  function fn1 (request, reply, payload, next) {
    t.deepEqual(payload, v1)
    next(null, v2)
  }

  function fn2 (request, reply, payload, next) {
    t.deepEqual(payload, v2)
    next(new Error('kaboom'))
  }

  function fn3 () {
    t.fail('We should not be here')
  }

  function done (err, request, reply, payload) {
    t.strictEqual(err.message, 'kaboom')
    t.deepEqual(request, originalRequest)
    t.deepEqual(reply, originalReply)
    t.deepEqual(payload, v2)
  }
})

test('onSendHookRunner - Should handle promises', t => {
  t.plan(7)

  const originalRequest = { body: null }
  const originalReply = { request: originalRequest }
  const v1 = { hello: 'world' }
  const v2 = { ciao: 'mondo' }
  const v3 = { winter: 'is coming' }
  const v4 = { winter: 'has come' }

  onSendHookRunner([fn1, fn2, fn3], originalRequest, originalReply, v1, done)

  function fn1 (request, reply, payload) {
    t.deepEqual(payload, v1)
    return Promise.resolve(v2)
  }

  function fn2 (request, reply, payload) {
    t.deepEqual(payload, v2)
    return Promise.resolve(v3)
  }

  function fn3 (request, reply, payload) {
    t.deepEqual(payload, v3)
    return Promise.resolve(v4)
  }

  function done (err, request, reply, payload) {
    t.error(err)
    t.deepEqual(request, originalRequest)
    t.deepEqual(reply, originalReply)
    t.deepEqual(payload, v4)
  }
})

test('onSendHookRunner - In case of error should skip to done (with promises)', t => {
  t.plan(6)

  const originalRequest = { body: null }
  const originalReply = { request: originalRequest }
  const v1 = { hello: 'world' }
  const v2 = { ciao: 'mondo' }

  onSendHookRunner([fn1, fn2, fn3], originalRequest, originalReply, v1, done)

  function fn1 (request, reply, payload) {
    t.deepEqual(payload, v1)
    return Promise.resolve(v2)
  }

  function fn2 (request, reply, payload) {
    t.deepEqual(payload, v2)
    return Promise.reject(new Error('kaboom'))
  }

  function fn3 () {
    t.fail('We should not be here')
  }

  function done (err, request, reply, payload) {
    t.strictEqual(err.message, 'kaboom')
    t.deepEqual(request, originalRequest)
    t.deepEqual(reply, originalReply)
    t.deepEqual(payload, v2)
  }
})

test('onSendHookRunner - Be able to exit before its natural end', t => {
  t.plan(2)

  const originalRequest = { body: null }
  const originalReply = { request: originalRequest }
  const v1 = { hello: 'world' }
  const v2 = { ciao: 'mondo' }

  onSendHookRunner([fn1, fn2, fn3], originalRequest, originalReply, v1, done)

  function fn1 (request, reply, payload, next) {
    t.deepEqual(payload, v1)
    next(null, v2)
  }

  function fn2 (request, reply, payload) {
    t.deepEqual(payload, v2)
  }

  function fn3 () {
    t.fail('this should not be called')
  }

  function done () {
    t.fail('this should not be called')
  }
})
