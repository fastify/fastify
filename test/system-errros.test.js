'use strict'

const t = require('tap')
const Assert = require('assert')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')()

const systemErrors = {
  EvalError,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  URIError,
  AssertionError: Assert.AssertionError
}

fastify.get('/systemError', function (req, reply) {
  const promise = new Promise((resolve, reject) => {
    reject(new systemErrors[req.query.name]())
  })
  return promise
})

fastify.get('/assertError', function (req, reply) {
  const promise = new Promise((resolve, reject) => {
    reject(new systemErrors.AssertionError({}))
  })
  return promise
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  // Tap patched this event and we have no change to listen on it.
  // Since any test runs in a seperate process we don't have to restore it
  process.removeAllListeners('unhandledRejection')

  test('Should exit due to EvalError', t => {
    t.plan(2)

    process.once('unhandledRejection', (err) => {
      t.type(err, systemErrors.EvalError)
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/systemError?name=EvalError',
      timeout: 100
    }, (err, res) => {
      t.type(err, Error)
    })
  })

  test('Should exit due to RangeError', t => {
    t.plan(2)

    process.once('unhandledRejection', (err) => {
      t.type(err, systemErrors.RangeError)
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/systemError?name=RangeError',
      timeout: 100
    }, (err, res) => {
      t.type(err, Error)
    })
  })

  test('Should exit due to ReferenceError', t => {
    t.plan(2)

    process.once('unhandledRejection', (err) => {
      t.type(err, systemErrors.ReferenceError)
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/systemError?name=ReferenceError',
      timeout: 100
    }, (err, res) => {
      t.type(err, Error)
    })
  })

  test('Should exit due to SyntaxError', t => {
    t.plan(2)

    process.once('unhandledRejection', (err) => {
      t.type(err, systemErrors.SyntaxError)
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/systemError?name=SyntaxError',
      timeout: 100
    }, (err, res) => {
      t.type(err, Error)
    })
  })

  test('Should exit due to TypeError', t => {
    t.plan(2)

    process.once('unhandledRejection', (err) => {
      t.type(err, systemErrors.TypeError)
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/systemError?name=TypeError',
      timeout: 100
    }, (err, res) => {
      t.type(err, Error)
    })
  })

  test('Should exit due to AssertionError', t => {
    t.plan(2)

    process.once('unhandledRejection', (err) => {
      t.type(err, systemErrors.AssertionError)
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/assertError',
      timeout: 100
    }, (err, res) => {
      t.type(err, Error)
    })
  })
})
