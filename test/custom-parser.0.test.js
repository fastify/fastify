'use strict'

const fs = require('node:fs')
const { test } = require('node:test')
const sget = require('simple-get').concat
const Fastify = require('../fastify')
const jsonParser = require('fast-json-body')
const { getServerUrl, plainTextParser } = require('./helper')
const { waitForCb } = require('./toolkit')

process.removeAllListeners('warning')

test('contentTypeParser method should exist', t => {
  t.plan(1)
  const fastify = Fastify()
  t.assert.ok(fastify.addContentTypeParser)
})

test('contentTypeParser should add a custom parser', (t, mainTestDone) => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.options('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/jsoff', function (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    const completion = waitForCb({ steps: 2 })

    t.after(() => fastify.close())

    t.test('in POST', (t, testDone) => {
      t.plan(3)

      sget({
        method: 'POST',
        url: getServerUrl(fastify),
        body: '{"hello":"world"}',
        headers: {
          'Content-Type': 'application/jsoff'
        }
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.strictEqual(body.toString(), JSON.stringify({ hello: 'world' }))
        testDone()
        completion.stepIn()
      })
    })

    t.test('in OPTIONS', (t, testDone) => {
      t.plan(3)

      sget({
        method: 'OPTIONS',
        url: getServerUrl(fastify),
        body: '{"hello":"world"}',
        headers: {
          'Content-Type': 'application/jsoff'
        }
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.strictEqual(body.toString(), JSON.stringify({ hello: 'world' }))
        testDone()
        completion.stepIn()
      })
    })
    completion.patience.then(mainTestDone)
  })
})

test('contentTypeParser should handle multiple custom parsers', (t, testDone) => {
  t.plan(7)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.post('/hello', (req, reply) => {
    reply.send(req.body)
  })

  function customParser (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  }

  fastify.addContentTypeParser('application/jsoff', customParser)
  fastify.addContentTypeParser('application/ffosj', customParser)

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => { fastify.close() })

    const completion = waitForCb({ steps: 2 })

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), JSON.stringify({ hello: 'world' }))
      completion.stepIn()
    })

    sget({
      method: 'POST',
      url: getServerUrl(fastify) + '/hello',
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/ffosj'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), JSON.stringify({ hello: 'world' }))
      completion.stepIn()
    })
    completion.patience.then(testDone)
  })
})

test('contentTypeParser should handle an array of custom contentTypes', (t, testDone) => {
  t.plan(7)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.post('/hello', (req, reply) => {
    reply.send(req.body)
  })

  function customParser (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  }

  fastify.addContentTypeParser(['application/jsoff', 'application/ffosj'], customParser)

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => { fastify.close() })

    const completion = waitForCb({ steps: 2 })

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), JSON.stringify({ hello: 'world' }))
      completion.stepIn()
    })

    sget({
      method: 'POST',
      url: getServerUrl(fastify) + '/hello',
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/ffosj'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), JSON.stringify({ hello: 'world' }))
      completion.stepIn()
    })
    completion.patience.then(testDone)
  })
})

test('contentTypeParser should handle errors', (t, testDone) => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/jsoff', function (req, payload, done) {
    done(new Error('kaboom!'), {})
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 500)
      fastify.close()
      testDone()
    })
  })
})

test('contentTypeParser should support encapsulation', (t, testDone) => {
  t.plan(6)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.addContentTypeParser('application/jsoff', () => {})
    t.assert.ok(instance.hasContentTypeParser('application/jsoff'))

    instance.register((instance, opts, done) => {
      instance.addContentTypeParser('application/ffosj', () => {})
      t.assert.ok(instance.hasContentTypeParser('application/jsoff'))
      t.assert.ok(instance.hasContentTypeParser('application/ffosj'))
      done()
    })

    done()
  })

  fastify.ready(err => {
    t.assert.ifError(err)
    t.assert.ok(!fastify.hasContentTypeParser('application/jsoff'))
    t.assert.ok(!fastify.hasContentTypeParser('application/ffosj'))
    testDone()
  })
})

test('contentTypeParser should support encapsulation, second try', (t, testDone) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.post('/', (req, reply) => {
      reply.send(req.body)
    })

    instance.addContentTypeParser('application/jsoff', function (req, payload, done) {
      jsonParser(payload, function (err, body) {
        done(err, body)
      })
    })

    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), JSON.stringify({ hello: 'world' }))
      fastify.close()
      testDone()
    })
  })
})

test('contentTypeParser shouldn\'t support request with undefined "Content-Type"', (t, testDone) => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/jsoff', function (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: 'unknown content type!',
      headers: {
        // 'Content-Type': undefined
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 415)
      fastify.close()
      testDone()
    })
  })
})

test('the content type should be a string or RegExp', t => {
  t.plan(2)
  const fastify = Fastify()

  try {
    fastify.addContentTypeParser(null, () => {})
    t.assert.fail()
  } catch (err) {
    t.assert.strictEqual(err.code, 'FST_ERR_CTP_INVALID_TYPE')
    t.assert.strictEqual(err.message, 'The content type should be a string or a RegExp')
  }
})

test('the content type cannot be an empty string', t => {
  t.plan(2)
  const fastify = Fastify()

  try {
    fastify.addContentTypeParser('', () => {})
    t.assert.fail()
  } catch (err) {
    t.assert.strictEqual(err.code, 'FST_ERR_CTP_EMPTY_TYPE')
    t.assert.strictEqual(err.message, 'The content type cannot be an empty string')
  }
})

test('the content type handler should be a function', t => {
  t.plan(2)
  const fastify = Fastify()

  try {
    fastify.addContentTypeParser('aaa', null)
    t.assert.fail()
  } catch (err) {
    t.assert.strictEqual(err.code, 'FST_ERR_CTP_INVALID_HANDLER')
    t.assert.strictEqual(err.message, 'The content type handler should be a function')
  }
})

test('catch all content type parser', (t, testDone) => {
  t.plan(7)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('*', function (req, payload, done) {
    let data = ''
    payload.on('data', chunk => { data += chunk })
    payload.on('end', () => {
      done(null, data)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: 'hello',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), 'hello')

      sget({
        method: 'POST',
        url: getServerUrl(fastify),
        body: 'hello',
        headers: {
          'Content-Type': 'very-weird-content-type'
        }
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.strictEqual(body.toString(), 'hello')
        fastify.close()
        testDone()
      })
    })
  })
})

test('catch all content type parser should not interfere with other conte type parsers', (t, testDone) => {
  t.plan(7)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('*', function (req, payload, done) {
    let data = ''
    payload.on('data', chunk => { data += chunk })
    payload.on('end', () => {
      done(null, data)
    })
  })

  fastify.addContentTypeParser('application/jsoff', function (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), JSON.stringify({ hello: 'world' }))

      sget({
        method: 'POST',
        url: getServerUrl(fastify),
        body: 'hello',
        headers: {
          'Content-Type': 'very-weird-content-type'
        }
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.strictEqual(body.toString(), 'hello')
        fastify.close()
        testDone()
      })
    })
  })
})

// Issue 492 https://github.com/fastify/fastify/issues/492
test('\'*\' catch undefined Content-Type requests', (t, testDone) => {
  t.plan(4)

  const fastify = Fastify()

  t.after(() => fastify.close())

  fastify.addContentTypeParser('*', function (req, payload, done) {
    let data = ''
    payload.on('data', chunk => { data += chunk })
    payload.on('end', () => {
      done(null, data)
    })
  })

  fastify.post('/', (req, res) => {
    // Needed to avoid json stringify
    res.type('text/plain').send(req.body)
  })

  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)

    const fileStream = fs.createReadStream(__filename)

    sget({
      method: 'POST',
      url: getServerUrl(fastify) + '/',
      body: fileStream
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body + '', fs.readFileSync(__filename).toString())
      testDone()
    })
  })
})

test('cannot add custom parser after binding', (t, testDone) => {
  t.plan(2)

  const fastify = Fastify()

  t.after(() => fastify.close())

  fastify.post('/', (req, res) => {
    res.type('text/plain').send(req.body)
  })

  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)

    try {
      fastify.addContentTypeParser('*', () => {})
      t.assert.fail()
    } catch (e) {
      t.assert.ok(true)
      testDone()
    }
  })
})

test('Can override the default json parser', (t, testDone) => {
  t.plan(5)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/json', function (req, payload, done) {
    t.assert.ok('called')
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), '{"hello":"world"}')
      fastify.close()
      testDone()
    })
  })
})

test('Can override the default plain text parser', (t, testDone) => {
  t.plan(5)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('text/plain', function (req, payload, done) {
    t.assert.ok('called')
    plainTextParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: 'hello world',
      headers: {
        'Content-Type': 'text/plain'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), 'hello world')
      fastify.close()
      testDone()
    })
  })
})

test('Can override the default json parser in a plugin', (t, testDone) => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.addContentTypeParser('application/json', function (req, payload, done) {
      t.assert.ok('called')
      jsonParser(payload, function (err, body) {
        done(err, body)
      })
    })

    instance.post('/', (req, reply) => {
      reply.send(req.body)
    })

    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), '{"hello":"world"}')
      fastify.close()
      testDone()
    })
  })
})

test('Can\'t override the json parser multiple times', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addContentTypeParser('application/json', function (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  try {
    fastify.addContentTypeParser('application/json', function (req, payload, done) {
      t.assert.ok('called')
      jsonParser(payload, function (err, body) {
        done(err, body)
      })
    })
  } catch (err) {
    t.assert.strictEqual(err.code, 'FST_ERR_CTP_ALREADY_PRESENT')
    t.assert.strictEqual(err.message, 'Content type parser \'application/json\' already present.')
  }
})

test('Can\'t override the plain text parser multiple times', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addContentTypeParser('text/plain', function (req, payload, done) {
    plainTextParser(payload, function (err, body) {
      done(err, body)
    })
  })

  try {
    fastify.addContentTypeParser('text/plain', function (req, payload, done) {
      t.assert.ok('called')
      plainTextParser(payload, function (err, body) {
        done(err, body)
      })
    })
  } catch (err) {
    t.assert.strictEqual(err.code, 'FST_ERR_CTP_ALREADY_PRESENT')
    t.assert.strictEqual(err.message, 'Content type parser \'text/plain\' already present.')
  }
})

test('Should get the body as string', (t, testDone) => {
  t.plan(6)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
    t.assert.ok('called')
    t.assert.ok(typeof body === 'string')
    try {
      const json = JSON.parse(body)
      done(null, json)
    } catch (err) {
      err.statusCode = 400
      done(err, undefined)
    }
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), '{"hello":"world"}')
      fastify.close()
      testDone()
    })
  })
})

test('Should return defined body with no custom parser defined and content type = \'text/plain\'', (t, testDone) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: 'hello world',
      headers: {
        'Content-Type': 'text/plain'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), 'hello world')
      fastify.close()
      testDone()
    })
  })
})

test('Should have typeof body object with no custom parser defined, no body defined and content type = \'text/plain\'', (t, testDone) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      headers: {
        'Content-Type': 'text/plain'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(typeof body, 'object')
      fastify.close()
      testDone()
    })
  })
})
