'use strict'

const fs = require('node:fs')
const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('../fastify')
const jsonParser = require('fast-json-body')
const { getServerUrl, plainTextParser } = require('./helper')

process.removeAllListeners('warning')

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

  fastify.addContentTypeParser('application/jsoff', function (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    t.teardown(() => fastify.close())

    t.test('in POST', t => {
      t.plan(3)

      sget({
        method: 'POST',
        url: getServerUrl(fastify),
        body: '{"hello":"world"}',
        headers: {
          'Content-Type': 'application/jsoff'
        }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(body.toString(), JSON.stringify({ hello: 'world' }))
      })
    })

    t.test('in OPTIONS', t => {
      t.plan(3)

      sget({
        method: 'OPTIONS',
        url: getServerUrl(fastify),
        body: '{"hello":"world"}',
        headers: {
          'Content-Type': 'application/jsoff'
        }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(body.toString(), JSON.stringify({ hello: 'world' }))
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

  function customParser (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  }

  fastify.addContentTypeParser('application/jsoff', customParser)
  fastify.addContentTypeParser('application/ffosj', customParser)

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ hello: 'world' }))
    })

    sget({
      method: 'POST',
      url: getServerUrl(fastify) + '/hello',
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/ffosj'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ hello: 'world' }))
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

  function customParser (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  }

  fastify.addContentTypeParser(['application/jsoff', 'application/ffosj'], customParser)

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ hello: 'world' }))
    })

    sget({
      method: 'POST',
      url: getServerUrl(fastify) + '/hello',
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/ffosj'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ hello: 'world' }))
    })
  })
})

test('contentTypeParser should handle errors', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/jsoff', function (req, payload, done) {
    done(new Error('kaboom!'), {})
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 500)
      fastify.close()
    })
  })
})

test('contentTypeParser should support encapsulation', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.addContentTypeParser('application/jsoff', () => {})
    t.ok(instance.hasContentTypeParser('application/jsoff'))

    instance.register((instance, opts, done) => {
      instance.addContentTypeParser('application/ffosj', () => {})
      t.ok(instance.hasContentTypeParser('application/jsoff'))
      t.ok(instance.hasContentTypeParser('application/ffosj'))
      done()
    })

    done()
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
    t.error(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ hello: 'world' }))
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

  fastify.addContentTypeParser('application/jsoff', function (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: 'unknown content type!',
      headers: {
        // 'Content-Type': undefined
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 415)
      fastify.close()
    })
  })
})

test('the content type should be a string or RegExp', t => {
  t.plan(2)
  const fastify = Fastify()

  try {
    fastify.addContentTypeParser(null, () => {})
    t.fail()
  } catch (err) {
    t.equal(err.code, 'FST_ERR_CTP_INVALID_TYPE')
    t.equal(err.message, 'The content type should be a string or a RegExp')
  }
})

test('the content type cannot be an empty string', t => {
  t.plan(2)
  const fastify = Fastify()

  try {
    fastify.addContentTypeParser('', () => {})
    t.fail()
  } catch (err) {
    t.equal(err.code, 'FST_ERR_CTP_EMPTY_TYPE')
    t.equal(err.message, 'The content type cannot be an empty string')
  }
})

test('the content type handler should be a function', t => {
  t.plan(2)
  const fastify = Fastify()

  try {
    fastify.addContentTypeParser('aaa', null)
    t.fail()
  } catch (err) {
    t.equal(err.code, 'FST_ERR_CTP_INVALID_HANDLER')
    t.equal(err.message, 'The content type handler should be a function')
  }
})

test('catch all content type parser', t => {
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
    t.error(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: 'hello',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), 'hello')

      sget({
        method: 'POST',
        url: getServerUrl(fastify),
        body: 'hello',
        headers: {
          'Content-Type': 'very-weird-content-type'
        }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(body.toString(), 'hello')
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
    t.error(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ hello: 'world' }))

      sget({
        method: 'POST',
        url: getServerUrl(fastify),
        body: 'hello',
        headers: {
          'Content-Type': 'very-weird-content-type'
        }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(body.toString(), 'hello')
        fastify.close()
      })
    })
  })
})

// Issue 492 https://github.com/fastify/fastify/issues/492
test('\'*\' catch undefined Content-Type requests', t => {
  t.plan(4)

  const fastify = Fastify()

  t.teardown(fastify.close.bind(fastify))

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
    t.error(err)

    const fileStream = fs.createReadStream(__filename)

    sget({
      method: 'POST',
      url: getServerUrl(fastify) + '/',
      body: fileStream
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body + '', fs.readFileSync(__filename).toString())
    })
  })
})

test('cannot add custom parser after binding', t => {
  t.plan(2)

  const fastify = Fastify()

  t.teardown(fastify.close.bind(fastify))

  fastify.post('/', (req, res) => {
    res.type('text/plain').send(req.body)
  })

  fastify.listen({ port: 0 }, function (err) {
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

  fastify.addContentTypeParser('application/json', function (req, payload, done) {
    t.ok('called')
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), '{"hello":"world"}')
      fastify.close()
    })
  })
})

test('Can override the default plain text parser', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('text/plain', function (req, payload, done) {
    t.ok('called')
    plainTextParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: 'hello world',
      headers: {
        'Content-Type': 'text/plain'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), 'hello world')
      fastify.close()
    })
  })
})

test('Can override the default json parser in a plugin', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.addContentTypeParser('application/json', function (req, payload, done) {
      t.ok('called')
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
    t.error(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), '{"hello":"world"}')
      fastify.close()
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
      t.ok('called')
      jsonParser(payload, function (err, body) {
        done(err, body)
      })
    })
  } catch (err) {
    t.equal(err.code, 'FST_ERR_CTP_ALREADY_PRESENT')
    t.equal(err.message, 'Content type parser \'application/json\' already present.')
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
      t.ok('called')
      plainTextParser(payload, function (err, body) {
        done(err, body)
      })
    })
  } catch (err) {
    t.equal(err.code, 'FST_ERR_CTP_ALREADY_PRESENT')
    t.equal(err.message, 'Content type parser \'text/plain\' already present.')
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
      const json = JSON.parse(body)
      done(null, json)
    } catch (err) {
      err.statusCode = 400
      done(err, undefined)
    }
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), '{"hello":"world"}')
      fastify.close()
    })
  })
})

test('Should return defined body with no custom parser defined and content type = \'text/plain\'', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: 'hello world',
      headers: {
        'Content-Type': 'text/plain'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), 'hello world')
      fastify.close()
    })
  })
})

test('Should have typeof body object with no custom parser defined, no body defined and content type = \'text/plain\'', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      headers: {
        'Content-Type': 'text/plain'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(typeof body, 'object')
      fastify.close()
    })
  })
})
