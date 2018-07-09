'use strict'

const fs = require('fs')
const t = require('tap')
const test = t.test
const semver = require('semver')
const sget = require('simple-get').concat
const Fastify = require('..')
const jsonParser = require('fast-json-body')
if (semver.gt(process.versions.node, '8.0.0')) {
  require('./custom-parser-async')
}
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
      done(err, body)
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
      done(err, body)
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

test('contentTypeParser should handle an array of custom contentTypes', t => {
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
      done(err, body)
    })
  }

  fastify.addContentTypeParser(['application/jsoff', 'application/ffosj'], customParser)

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
    done(new Error('kaboom!'), {})
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
        done(err, body)
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
      done(err, body)
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
      done(null, data)
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
      t.deepEqual(body.toString(), 'hello')

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
        t.deepEqual(body.toString(), 'hello')
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
      done(null, data)
    })
  })

  fastify.addContentTypeParser('application/jsoff', function (req, done) {
    jsonParser(req, function (err, body) {
      done(err, body)
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
        t.deepEqual(body.toString(), 'hello')
        fastify.close()
      })
    })
  })
})

// Issue 492 https://github.com/fastify/fastify/issues/492
test('\'*\' catch undefined Content-Type requests', t => {
  t.plan(4)

  const fastify = Fastify()

  t.tearDown(fastify.close.bind(fastify))

  fastify.addContentTypeParser('*', function (req, done) {
    var data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      done(null, data)
    })
  })

  fastify.post('/', (req, res) => {
    // Needed to avoid json stringify
    res.type('text/plain').send(req.body)
  })

  fastify.listen(0, function (err) {
    t.error(err)

    const fileStream = fs.createReadStream(__filename)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/',
      body: fileStream
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(body + '', fs.readFileSync(__filename).toString())
    })
  })
})

test('cannot add custom parser after binding', t => {
  t.plan(2)

  const fastify = Fastify()

  t.tearDown(fastify.close.bind(fastify))

  fastify.post('/', (req, res) => {
    res.type('text/plain').send(req.body)
  })

  fastify.listen(0, function (err) {
    t.error(err)

    try {
      fastify.addContentTypeParser('*', () => {})
      t.fail()
    } catch (e) {
      t.pass()
    }
  })
})

test('Can override the default json parser', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/json', function (req, done) {
    t.ok('called')
    jsonParser(req, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(body.toString(), '{"hello":"world"}')
      fastify.close()
    })
  })
})

test('Can\'t override the json parser multiple times', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.addContentTypeParser('application/json', function (req, done) {
    jsonParser(req, function (err, body) {
      done(err, body)
    })
  })

  try {
    fastify.addContentTypeParser('application/json', function (req, done) {
      t.ok('called')
      jsonParser(req, function (err, body) {
        done(err, body)
      })
    })
  } catch (err) {
    t.is(err.message, 'Content type parser \'application/json\' already present.')
  }
})

test('Should get the body as string', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
    t.ok('called')
    t.ok(typeof body === 'string')
    try {
      var json = JSON.parse(body)
      done(null, json)
    } catch (err) {
      err.statusCode = 400
      done(err, undefined)
    }
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(body.toString(), '{"hello":"world"}')
      fastify.close()
    })
  })
})

test('Should get the body as buffer', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
    t.ok('called')
    t.ok(body instanceof Buffer)
    try {
      var json = JSON.parse(body)
      done(null, json)
    } catch (err) {
      err.statusCode = 400
      done(err, undefined)
    }
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(body.toString(), '{"hello":"world"}')
      fastify.close()
    })
  })
})

test('Should parse empty bodies as a string', t => {
  t.plan(9)
  const fastify = Fastify()

  fastify.addContentTypeParser('text/plain', { parseAs: 'string' }, (req, body, done) => {
    t.strictEqual(body, '')
    done(null, body)
  })

  fastify.route({
    method: ['POST', 'DELETE'],
    url: '/',
    handler (request, reply) {
      reply.send(request.body)
    }
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '',
      headers: {
        'Content-Type': 'text/plain'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(body.toString(), '')
    })

    sget({
      method: 'DELETE',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': '0'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(body.toString(), '')
    })
  })
})

test('Should parse empty bodies as a buffer', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('text/plain', { parseAs: 'buffer' }, function (req, body, done) {
    t.ok(body instanceof Buffer)
    t.strictEqual(body.length, 0)
    done(null, body)
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '',
      headers: {
        'Content-Type': 'text/plain'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(body.length, 0)
      fastify.close()
    })
  })
})

test('The charset should not interfere with the content type handling', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/json', function (req, done) {
    t.ok('called')
    jsonParser(req, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/json charset=utf-8'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(body.toString(), '{"hello":"world"}')
      fastify.close()
    })
  })
})

test('Wrong parseAs parameter', t => {
  t.plan(1)
  const fastify = Fastify()

  try {
    fastify.addContentTypeParser('application/json', { parseAs: 'fireworks' }, () => {})
    t.fail('should throw')
  } catch (err) {
    t.is(err.message, 'The body parser can only parse your data as \'string\' or \'buffer\', you asked \'fireworks\' which is not supported.')
  }
})

test('Should allow defining the bodyLimit per parser', t => {
  t.plan(3)
  const fastify = Fastify()
  t.tearDown(() => fastify.close())

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser(
    'x/foo',
    { parseAs: 'string', bodyLimit: 5 },
    function (req, body, done) {
      t.fail('should not be invoked')
      done()
    }
  )

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '1234567890',
      headers: {
        'Content-Type': 'x/foo'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictDeepEqual(JSON.parse(body.toString()), {
        statusCode: 413,
        error: 'Payload Too Large',
        message: 'Request body is too large'
      })
      fastify.close()
    })
  })
})

test('route bodyLimit should take precedence over a custom parser bodyLimit', t => {
  t.plan(3)
  const fastify = Fastify()
  t.tearDown(() => fastify.close())

  fastify.post('/', { bodyLimit: 5 }, (request, reply) => {
    reply.send(request.body)
  })

  fastify.addContentTypeParser(
    'x/foo',
    { parseAs: 'string', bodyLimit: 100 },
    function (req, body, done) {
      t.fail('should not be invoked')
      done()
    }
  )

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '1234567890',
      headers: { 'Content-Type': 'x/foo' }
    }, (err, response, body) => {
      t.error(err)
      t.strictDeepEqual(JSON.parse(body.toString()), {
        statusCode: 413,
        error: 'Payload Too Large',
        message: 'Request body is too large'
      })
      fastify.close()
    })
  })
})
