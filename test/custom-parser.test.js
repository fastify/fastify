'use strict'

const fs = require('fs')
const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('..')

const jsonParser = require('fast-json-body')

function plainTextParser (request, callback) {
  let body = ''
  request.setEncoding('utf8')
  request.on('error', onError)
  request.on('data', onData)
  request.on('end', onEnd)
  function onError (err) {
    callback(err, null)
  }
  function onData (chunk) {
    body += chunk
  }
  function onEnd () {
    callback(null, body)
  }
}

function getUrl (app) {
  const { address, port } = app.server.address()
  if (address === '::1') {
    return `http://[${address}]:${port}`
  } else {
    return `http://${address}:${port}`
  }
}

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

  fastify.listen(0, err => {
    t.error(err)

    t.teardown(() => fastify.close())

    t.test('in POST', t => {
      t.plan(3)

      sget({
        method: 'POST',
        url: getUrl(fastify),
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
        url: getUrl(fastify),
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

test('contentTypeParser should add a custom parser - deprecated syntax', t => {
  t.plan(5)
  const fastify = Fastify()

  process.on('warning', onWarning)
  function onWarning (warning) {
    t.equal(warning.name, 'FastifyDeprecation')
    t.equal(warning.code, 'FSTDEP003')
  }

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

    t.teardown(() => fastify.close())

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
        t.equal(response.statusCode, 200)
        t.same(body.toString(), JSON.stringify({ hello: 'world' }))
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
        t.equal(response.statusCode, 200)
        t.same(body.toString(), JSON.stringify({ hello: 'world' }))
      })

      process.removeListener('warning', onWarning)
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
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ hello: 'world' }))
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
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ hello: 'world' }))
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
      t.equal(response.statusCode, 200)
      t.same(body.toString(), 'hello')

      sget({
        method: 'POST',
        url: 'http://localhost:' + fastify.server.address().port,
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
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ hello: 'world' }))

      sget({
        method: 'POST',
        url: 'http://localhost:' + fastify.server.address().port,
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

  fastify.listen(0, function (err) {
    t.error(err)

    const fileStream = fs.createReadStream(__filename)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/',
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

  fastify.addContentTypeParser('application/json', function (req, payload, done) {
    t.ok('called')
    jsonParser(payload, function (err, body) {
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

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
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

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
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

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
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

test('Should have typeof body object with no custom parser defined, null body and content type = \'text/plain\'', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: null,
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

test('Should have typeof body object with no custom parser defined, undefined body and content type = \'text/plain\'', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: undefined,
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

test('Should get the body as string', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('text/plain', { parseAs: 'string' }, function (req, body, done) {
    t.ok('called')
    t.ok(typeof body === 'string')
    try {
      const plainText = body
      done(null, plainText)
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
      const json = JSON.parse(body)
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
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), '{"hello":"world"}')
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

  fastify.addContentTypeParser('text/plain', { parseAs: 'buffer' }, function (req, body, done) {
    t.ok('called')
    t.ok(body instanceof Buffer)
    try {
      const plainText = body
      done(null, plainText)
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

test('Should parse empty bodies as a string', t => {
  t.plan(9)
  const fastify = Fastify()

  fastify.addContentTypeParser('text/plain', { parseAs: 'string' }, (req, body, done) => {
    t.equal(body, '')
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
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), '')
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
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), '')
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
    t.equal(body.length, 0)
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
      t.equal(response.statusCode, 200)
      t.equal(body.length, 0)
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

  fastify.addContentTypeParser('application/json', function (req, payload, done) {
    t.ok('called')
    jsonParser(payload, function (err, body) {
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
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), '{"hello":"world"}')
      fastify.close()
    })
  })
})

test('Wrong parseAs parameter', t => {
  t.plan(2)
  const fastify = Fastify()

  try {
    fastify.addContentTypeParser('application/json', { parseAs: 'fireworks' }, () => {})
    t.fail('should throw')
  } catch (err) {
    t.equal(err.code, 'FST_ERR_CTP_INVALID_PARSE_TYPE')
    t.equal(err.message, "The body parser can only parse your data as 'string' or 'buffer', you asked 'fireworks' which is not supported.")
  }
})

test('Should allow defining the bodyLimit per parser', t => {
  t.plan(3)
  const fastify = Fastify()
  t.teardown(() => fastify.close())

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
      t.strictSame(JSON.parse(body.toString()), {
        statusCode: 413,
        code: 'FST_ERR_CTP_BODY_TOO_LARGE',
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
  t.teardown(() => fastify.close())

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
      t.strictSame(JSON.parse(body.toString()), {
        statusCode: 413,
        code: 'FST_ERR_CTP_BODY_TOO_LARGE',
        error: 'Payload Too Large',
        message: 'Request body is too large'
      })
      fastify.close()
    })
  })
})

test('should be able to use default parser for extra content type', t => {
  t.plan(4)
  const fastify = Fastify()
  t.teardown(() => fastify.close())

  fastify.post('/', (request, reply) => {
    reply.send(request.body)
  })

  fastify.addContentTypeParser('text/json', { parseAs: 'string' }, fastify.getDefaultJsonParser('ignore', 'ignore'))

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'text/json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.strictSame(JSON.parse(body.toString()), { hello: 'world' })
      fastify.close()
    })
  })
})

test('contentTypeParser should add a custom parser with RegExp value', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.options('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser(/.*\+json$/, function (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen(0, err => {
    t.error(err)

    t.teardown(() => fastify.close())

    t.test('in POST', t => {
      t.plan(3)

      sget({
        method: 'POST',
        url: 'http://localhost:' + fastify.server.address().port,
        body: '{"hello":"world"}',
        headers: {
          'Content-Type': 'application/vnd.test+json'
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
        url: 'http://localhost:' + fastify.server.address().port,
        body: '{"hello":"world"}',
        headers: {
          'Content-Type': 'weird-content-type+json'
        }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(body.toString(), JSON.stringify({ hello: 'world' }))
      })
    })
  })
})

test('contentTypeParser should add multiple custom parsers with RegExp values', t => {
  t.plan(10)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser(/.*\+json$/, function (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.addContentTypeParser(/.*\+xml$/, function (req, payload, done) {
    done(null, 'xml')
  })

  fastify.addContentTypeParser(/.*\+myExtension$/, function (req, payload, done) {
    let data = ''
    payload.on('data', chunk => { data += chunk })
    payload.on('end', () => {
      done(null, data + 'myExtension')
    })
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/vnd.hello+json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ hello: 'world' }))
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/test+xml'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), 'xml')
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: 'abcdefg',
      headers: {
        'Content-Type': 'application/+myExtension'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), 'abcdefgmyExtension')
      fastify.close()
    })
  })
})

test('catch all content type parser should not interfere with content type parser', t => {
  t.plan(10)
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

  fastify.addContentTypeParser(/^application\/.*/, function (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.addContentTypeParser('text/html', function (req, payload, done) {
    let data = ''
    payload.on('data', chunk => { data += chunk })
    payload.on('end', () => {
      done(null, data + 'html')
    })
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"myKey":"myValue"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ myKey: 'myValue' }))
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: 'body',
      headers: {
        'Content-Type': 'very-weird-content-type'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), 'body')
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: 'my text',
      headers: {
        'Content-Type': 'text/html'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), 'my texthtml')
      fastify.close()
    })
  })
})

test('should prefer string content types over RegExp ones', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser(/^application\/.*/, function (req, payload, done) {
    let data = ''
    payload.on('data', chunk => { data += chunk })
    payload.on('end', () => {
      done(null, data)
    })
  })

  fastify.addContentTypeParser('application/json', function (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"k1":"myValue", "k2": "myValue"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ k1: 'myValue', k2: 'myValue' }))
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: 'javascript',
      headers: {
        'Content-Type': 'application/javascript'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), 'javascript')
      fastify.close()
    })
  })
})

test('removeContentTypeParser should support arrays of content types to remove', t => {
  t.plan(8)

  const fastify = Fastify()

  fastify.addContentTypeParser('application/xml', function (req, payload, done) {
    payload.on('data', () => {})
    payload.on('end', () => {
      done(null, 'xml')
    })
  })

  fastify.addContentTypeParser(/^image\/.*/, function (req, payload, done) {
    payload.on('data', () => {})
    payload.on('end', () => {
      done(null, 'image')
    })
  })

  fastify.removeContentTypeParser([/^image\/.*/, 'application/json'])

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '<?xml version="1.0">',
      headers: {
        'Content-Type': 'application/xml'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), 'xml')
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '',
      headers: {
        'Content-Type': 'image/png'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 415)
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{test: "test"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 415)
      fastify.close()
    })
  })
})

test('removeContentTypeParser should support encapsulation', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.addContentTypeParser('application/xml', function (req, payload, done) {
    payload.on('data', () => {})
    payload.on('end', () => {
      done(null, 'xml')
    })
  })

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.register(function (instance, options, done) {
    instance.removeContentTypeParser('application/xml')

    instance.post('/encapsulated', (req, reply) => {
      reply.send(req.body)
    })

    done()
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/encapsulated',
      body: '<?xml version="1.0">',
      headers: {
        'Content-Type': 'application/xml'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 415)
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '<?xml version="1.0">',
      headers: {
        'Content-Type': 'application/xml'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), 'xml')
      fastify.close()
    })
  })
})

test('removeAllContentTypeParsers should support encapsulation', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.register(function (instance, options, done) {
    instance.removeAllContentTypeParsers()

    instance.post('/encapsulated', (req, reply) => {
      reply.send(req.body)
    })

    done()
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/encapsulated',
      body: '{}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 415)
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"test":1}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body.toString()).test, 1)
      fastify.close()
    })
  })
})

test('cannot remove all content type parsers after binding', t => {
  t.plan(2)

  const fastify = Fastify()

  t.teardown(fastify.close.bind(fastify))

  fastify.listen(0, function (err) {
    t.error(err)

    t.throws(() => fastify.removeAllContentTypeParsers())
  })
})

test('cannot remove content type parsers after binding', t => {
  t.plan(2)

  const fastify = Fastify()

  t.teardown(fastify.close.bind(fastify))

  fastify.listen(0, function (err) {
    t.error(err)

    t.throws(() => fastify.removeContentTypeParser('application/json'))
  })
})

test('should be able to override the default json parser after removeAllContentTypeParsers', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.removeAllContentTypeParsers()

  fastify.addContentTypeParser('application/json', function (req, payload, done) {
    t.ok('called')
    jsonParser(payload, function (err, body) {
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
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ hello: 'world' }))
      fastify.close()
    })
  })
})

test('should be able to override the default plain text parser after removeAllContentTypeParsers', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.removeAllContentTypeParsers()

  fastify.addContentTypeParser('text/plain', function (req, payload, done) {
    t.ok('called')
    plainTextParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
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

test('should be able to add a custom content type parser after removeAllContentTypeParsers', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.removeAllContentTypeParsers()

  fastify.addContentTypeParser('application/jsoff', function (req, payload, done) {
    t.ok('called')
    jsonParser(payload, function (err, body) {
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
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ hello: 'world' }))
      fastify.close()
    })
  })
})
