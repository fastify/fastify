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

const requestTimeout = 200

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
    t.plan(3)

    process.once('unhandledRejection', (err) => {
      t.type(err, systemErrors.EvalError)
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/?name=EvalError',
      timeout: requestTimeout,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/systemError'
      }
    }, (err, res) => {
      t.error(err)
      t.strictEqual(res.statusCode, 500)
    })
  })

  test('Should exit due to RangeError', t => {
    t.plan(3)

    process.once('unhandledRejection', (err) => {
      t.type(err, systemErrors.RangeError)
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/?name=RangeError',
      timeout: requestTimeout,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/systemError'
      }
    }, (err, res) => {
      t.error(err)
      t.strictEqual(res.statusCode, 500)
    })
  })

  test('Should exit due to ReferenceError', t => {
    t.plan(3)

    process.once('unhandledRejection', (err) => {
      t.type(err, systemErrors.ReferenceError)
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/?name=ReferenceError',
      timeout: requestTimeout,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/systemError'
      }
    }, (err, res) => {
      t.error(err)
      t.strictEqual(res.statusCode, 500)
    })
  })

  test('Should exit due to SyntaxError', t => {
    t.plan(3)

    process.once('unhandledRejection', (err) => {
      t.type(err, systemErrors.SyntaxError)
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/?name=SyntaxError',
      timeout: requestTimeout,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/systemError'
      }
    }, (err, res) => {
      t.error(err)
      t.strictEqual(res.statusCode, 500)
    })
  })

  test('Should exit due to TypeError', t => {
    t.plan(3)

    process.once('unhandledRejection', (err) => {
      t.type(err, systemErrors.TypeError)
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/?name=TypeError',
      timeout: requestTimeout,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/systemError'
      }
    }, (err, res) => {
      t.error(err)
      t.strictEqual(res.statusCode, 500)
    })
  })

  test('Should exit due to AssertionError', t => {
    t.plan(3)

    process.once('unhandledRejection', (err) => {
      t.type(err, systemErrors.AssertionError)
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      timeout: requestTimeout,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/assertError'
      }
    }, (err, res) => {
      t.error(err)
      t.strictEqual(res.statusCode, 500)
    })
  })
})
