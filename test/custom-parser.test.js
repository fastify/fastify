'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('..')
const jsonParser = require('fast-json-body')

test('contentTypeParser method should exist', t => {
  t.plan(1)
  const fastify = Fastify()
  t.ok(fastify.addContentTypeParser)
})

test('contentTypeParser should add a custom parser', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.options('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/jsoff', function (req, done) {
    jsonParser(req, function (err, body) {
      if (err) return done(err)
      done(body)
    })
  })

  fastify.listen(0, err => {
    t.error(err)

    t.tearDown(() => fastify.close())

    t.test('in POST', t => {
      t.plan(3)

      sget({
        method: 'POST',
        url: 'http://localhost:' + fastify.server.address().port,
        body: '{"hello":"world"}',
        headers: {
          'Content-Type': 'application/jsoff'
        }
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body.toString(), JSON.stringify({ hello: 'world' }))
      })
    })

    t.test('in OPTIONS', t => {
      t.plan(3)

      sget({
        method: 'OPTIONS',
        url: 'http://localhost:' + fastify.server.address().port,
        body: '{"hello":"world"}',
        headers: {
          'Content-Type': 'application/jsoff'
        }
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body.toString(), JSON.stringify({ hello: 'world' }))
      })
    })
  })
})

test('contentTypeParser should handle multiple custom parsers', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.post('/hello', (req, reply) => {
    reply.send(req.body)
  })

  function customParser (req, done) {
    jsonParser(req, function (err, body) {
      if (err) return done(err)
      done(body)
    })
  }

  fastify.addContentTypeParser('application/jsoff', customParser)
  fastify.addContentTypeParser('application/ffosj', customParser)

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), JSON.stringify({ hello: 'world' }))
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/hello',
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/ffosj'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), JSON.stringify({ hello: 'world' }))
    })
  })
})

test('contentTypeParser should handle errors', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/jsoff', function (req, done) {
    done(new Error('kaboom!'))
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 500)
      fastify.close()
    })
  })
})

test('contentTypeParser should support encapsulation', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.addContentTypeParser('application/jsoff', () => {})
    t.ok(instance.hasContentTypeParser('application/jsoff'))

    instance.register((instance, opts, next) => {
      instance.addContentTypeParser('application/ffosj', () => {})
      t.ok(instance.hasContentTypeParser('application/jsoff'))
      t.ok(instance.hasContentTypeParser('application/ffosj'))
      next()
    })

    next()
  })

  fastify.ready(err => {
    t.error(err)
    t.notOk(fastify.hasContentTypeParser('application/jsoff'))
    t.notOk(fastify.hasContentTypeParser('application/ffosj'))
  })
})

test('contentTypeParser should support encapsulation, second try', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.post('/', (req, reply) => {
      reply.send(req.body)
    })

    instance.addContentTypeParser('application/jsoff', function (req, done) {
      jsonParser(req, function (err, body) {
        if (err) return done(err)
        done(body)
      })
    })

    next()
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), JSON.stringify({ hello: 'world' }))
      fastify.close()
    })
  })
})

test('contentTypeParser shouldn\'t support request with undefined "Content-Type"', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/jsoff', function (req, done) {
    jsonParser(req, function (err, body) {
      if (err) return done(err)
      done(body)
    })
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: 'unknown content type!',
      headers: {
        // 'Content-Type': undefined
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 415)
      fastify.close()
    })
  })
})

test('the content type should be a string', t => {
  t.plan(1)
  const fastify = Fastify()

  try {
    fastify.addContentTypeParser(null, () => {})
    t.fail()
  } catch (err) {
    t.is(err.message, 'The content type should be a string')
  }
})

test('the content type cannot be an empty string', t => {
  t.plan(1)
  const fastify = Fastify()

  try {
    fastify.addContentTypeParser('', () => {})
    t.fail()
  } catch (err) {
    t.is(err.message, 'The content type cannot be an empty string')
  }
})

test('the content type handler should be a function', t => {
  t.plan(1)
  const fastify = Fastify()

  try {
    fastify.addContentTypeParser('aaa', null)
    t.fail()
  } catch (err) {
    t.is(err.message, 'The content type handler should be a function')
  }
})

test('catch all content type parser', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('*', function (req, done) {
    var data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      done(data)
    })
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: 'hello',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), '"hello"')

      sget({
        method: 'POST',
        url: 'http://localhost:' + fastify.server.address().port,
        body: 'hello',
        headers: {
          'Content-Type': 'very-weird-content-type'
        }
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body.toString(), '"hello"')
        fastify.close()
      })
    })
  })
})

test('catch all content type parser should not interfere with other conte type parsers', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('*', function (req, done) {
    var data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      done(data)
    })
  })

  fastify.addContentTypeParser('application/jsoff', function (req, done) {
    jsonParser(req, function (err, body) {
      if (err) return done(err)
      done(body)
    })
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), JSON.stringify({ hello: 'world' }))

      sget({
        method: 'POST',
        url: 'http://localhost:' + fastify.server.address().port,
        body: 'hello',
        headers: {
          'Content-Type': 'very-weird-content-type'
        }
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body.toString(), '"hello"')
        fastify.close()
      })
    })
  })
})
