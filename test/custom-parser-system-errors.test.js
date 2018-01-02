'use strict'

const t = require('tap')
const Assert = require('assert')
const test = t.test
const querystring = require('querystring')
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

fastify.addContentTypeParser('application/systemError', function (req) {
  const query = querystring.parse(req.url.replace(/^.*\?/, ''))
  return Promise.reject(new systemErrors[query.name]())
})

fastify.addContentTypeParser('application/assertError', function (req) {
  return Promise.reject(new systemErrors.AssertionError({}))
})

fastify.post('/', function (req, reply) {
  reply
  .code(500)
  .type('text/plain')
  .send('an error happened')
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
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/?name=EvalError',
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/systemError'
      }
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
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/?name=RangeError',
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/systemError'
      }
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
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/?name=ReferenceError',
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/systemError'
      }
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
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/?name=SyntaxError',
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/systemError'
      }
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
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/?name=TypeError',
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/systemError'
      }
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
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/assertError'
      }
    }, (err, res) => {
      t.type(err, Error)
    })
  })
})
