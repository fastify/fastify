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
  reply.code(500)
  reply.send(new systemErrors[req.query.name]())
})

fastify.get('/assertError', function (req, reply) {
  reply.code(500)
  reply.send(new systemErrors.AssertionError({}))
})

fastify.setErrorHandler((err) => {
  return Promise.reject(err)
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  // Tap patched this event and we have no chance to listen on it.
  // Since any test runs in a seperate process we don't have to restore it
  process.removeAllListeners('unhandledRejection')

  test('Should exit due to EvalError', t => {
    t.plan(2)

    process.once('unhandledRejection', (err) => {
      req.abort()
      t.type(err, systemErrors.EvalError)
    })

    let req = sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/systemError?name=EvalError'
    }, (err, res) => {
      t.type(err, Error)
    })
  })

  test('Should exit due to RangeError', t => {
    t.plan(2)

    process.once('unhandledRejection', (err) => {
      req.abort()
      t.type(err, systemErrors.RangeError)
    })

    let req = sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/systemError?name=RangeError'
    }, (err, res) => {
      t.type(err, Error)
    })
  })

  test('Should exit due to ReferenceError', t => {
    t.plan(2)

    process.once('unhandledRejection', (err) => {
      req.abort()
      t.type(err, systemErrors.ReferenceError)
    })

    let req = sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/systemError?name=ReferenceError'
    }, (err, res) => {
      t.type(err, Error)
    })
  })

  test('Should exit due to SyntaxError', t => {
    t.plan(2)

    process.once('unhandledRejection', (err) => {
      req.abort()
      t.type(err, systemErrors.SyntaxError)
    })

    let req = sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/systemError?name=SyntaxError'
    }, (err, res) => {
      t.type(err, Error)
    })
  })

  test('Should exit due to TypeError', t => {
    t.plan(2)

    process.once('unhandledRejection', (err) => {
      req.abort()
      t.type(err, systemErrors.TypeError)
    })

    let req = sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/systemError?name=TypeError'
    }, (err, res) => {
      t.type(err, Error)
    })
  })

  test('Should exit due to AssertionError', t => {
    t.plan(2)

    process.once('unhandledRejection', (err) => {
      req.abort()
      t.type(err, systemErrors.AssertionError)
    })

    let req = sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/assertError'
    }, (err, res) => {
      t.type(err, Error)
    })
  })
})
