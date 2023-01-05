'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const keys = require('../lib/symbols')
const { FST_ERR_CTP_ALREADY_PRESENT, FST_ERR_CTP_INVALID_TYPE, FST_ERR_CTP_INVALID_MEDIA_TYPE } = require('../lib/errors')

const first = function (req, payload, done) {}
const second = function (req, payload, done) {}
const third = function (req, payload, done) {}

test('hasContentTypeParser', t => {
  test('should know about internal parsers', t => {
    t.plan(4)

    const fastify = Fastify()
    fastify.ready(err => {
      t.error(err)
      t.ok(fastify.hasContentTypeParser('application/json'))
      t.ok(fastify.hasContentTypeParser('text/plain'))
      t.notOk(fastify.hasContentTypeParser('application/jsoff'))
    })
  })

  test('should work with string and RegExp', t => {
    t.plan(7)

    const fastify = Fastify()
    fastify.addContentTypeParser(/^image\/.*/, first)
    fastify.addContentTypeParser(/^application\/.+\+xml/, first)
    fastify.addContentTypeParser('image/gif', first)

    t.ok(fastify.hasContentTypeParser('application/json'))
    t.ok(fastify.hasContentTypeParser(/^image\/.*/))
    t.ok(fastify.hasContentTypeParser(/^application\/.+\+xml/))
    t.ok(fastify.hasContentTypeParser('image/gif'))
    t.notOk(fastify.hasContentTypeParser(/^image\/.+\+xml/))
    t.notOk(fastify.hasContentTypeParser('image/png'))
    t.notOk(fastify.hasContentTypeParser('*'))
  })

  t.end()
})

test('getParser', t => {
  test('should return matching parser', t => {
    t.plan(3)

    const fastify = Fastify()

    fastify.addContentTypeParser(/^image\/.*/, first)
    fastify.addContentTypeParser(/^application\/.+\+xml/, second)
    fastify.addContentTypeParser('text/html', third)

    t.equal(fastify[keys.kContentTypeParser].getParser('application/t+xml').fn, second)
    t.equal(fastify[keys.kContentTypeParser].getParser('image/png').fn, first)
    t.equal(fastify[keys.kContentTypeParser].getParser('text/html').fn, third)
  })

  test('should return matching parser with caching', t => {
    t.plan(6)

    const fastify = Fastify()

    fastify.addContentTypeParser('text/html', first)

    t.equal(fastify[keys.kContentTypeParser].getParser('text/html').fn, first)
    t.equal(fastify[keys.kContentTypeParser].cache.size, 0)
    t.equal(fastify[keys.kContentTypeParser].getParser('text/html ').fn, first)
    t.equal(fastify[keys.kContentTypeParser].cache.size, 1)
    t.equal(fastify[keys.kContentTypeParser].getParser('text/html ').fn, first)
    t.equal(fastify[keys.kContentTypeParser].cache.size, 1)
  })

  test('should prefer content type parser with string value', t => {
    t.plan(2)

    const fastify = Fastify()

    fastify.addContentTypeParser(/^image\/.*/, first)
    fastify.addContentTypeParser('image/gif', second)

    t.equal(fastify[keys.kContentTypeParser].getParser('image/gif').fn, second)
    t.equal(fastify[keys.kContentTypeParser].getParser('image/png').fn, first)
  })

  test('should return parser that catches all if no other is set', t => {
    t.plan(3)

    const fastify = Fastify()

    fastify.addContentTypeParser('*', first)
    fastify.addContentTypeParser(/^text\/.*/, second)

    t.equal(fastify[keys.kContentTypeParser].getParser('image/gif').fn, first)
    t.equal(fastify[keys.kContentTypeParser].getParser('text/html').fn, second)
    t.equal(fastify[keys.kContentTypeParser].getParser('text').fn, first)
  })

  test('should return undefined if no matching parser exist', t => {
    t.plan(2)

    const fastify = Fastify()

    fastify.addContentTypeParser(/^weirdType\/.+/, first)
    fastify.addContentTypeParser('application/javascript', first)

    t.notOk(fastify[keys.kContentTypeParser].getParser('application/xml'))
    t.notOk(fastify[keys.kContentTypeParser].getParser('weirdType/'))
  })

  t.end()
})

test('existingParser', t => {
  test('returns always false for "*"', t => {
    t.plan(2)

    const fastify = Fastify()

    fastify.addContentTypeParser(/^image\/.*/, first)
    fastify.addContentTypeParser(/^application\/.+\+xml/, first)
    fastify.addContentTypeParser('text/html', first)

    t.notOk(fastify[keys.kContentTypeParser].existingParser('*'))

    fastify.addContentTypeParser('*', first)

    t.notOk(fastify[keys.kContentTypeParser].existingParser('*'))
  })

  test('let you override the default parser once', t => {
    t.plan(2)

    const fastify = Fastify()

    fastify.addContentTypeParser('application/json', first)
    fastify.addContentTypeParser('text/plain', first)

    t.throws(
      () => fastify.addContentTypeParser('application/json', first),
      FST_ERR_CTP_ALREADY_PRESENT,
      "Content type parser 'application/json' already present"
    )
    t.throws(
      () => fastify.addContentTypeParser('text/plain', first),
      FST_ERR_CTP_ALREADY_PRESENT,
      "Content type parser 'text/plain' already present"
    )
  })

  const fastify = Fastify()
  const contentTypeParser = fastify[keys.kContentTypeParser]

  fastify.addContentTypeParser(/^image\/.*/, first)
  fastify.addContentTypeParser(/^application\/.+\+xml/, first)
  fastify.addContentTypeParser('text/html', first)

  t.ok(contentTypeParser.existingParser(/^image\/.*/))
  t.ok(contentTypeParser.existingParser('text/html'))
  t.ok(contentTypeParser.existingParser(/^application\/.+\+xml/))
  t.notOk(contentTypeParser.existingParser('application/json'))
  t.notOk(contentTypeParser.existingParser('text/plain'))
  t.notOk(contentTypeParser.existingParser('image/png'))
  t.notOk(contentTypeParser.existingParser(/^application\/.+\+json/))

  t.end()
})

test('add', t => {
  test('should only accept string and RegExp', t => {
    t.plan(4)

    const fastify = Fastify()
    const contentTypeParser = fastify[keys.kContentTypeParser]

    t.error(contentTypeParser.add('test', {}, first))
    t.error(contentTypeParser.add(/test/, {}, first))
    t.throws(
      () => contentTypeParser.add({}, {}, first),
      FST_ERR_CTP_INVALID_TYPE,
      'The content type should be a string or a RegExp'
    )
    t.throws(
      () => contentTypeParser.add(1, {}, first),
      FST_ERR_CTP_INVALID_TYPE,
      'The content type should be a string or a RegExp'
    )
  })

  test('should set "*" as parser that catches all', t => {
    t.plan(1)

    const fastify = Fastify()
    const contentTypeParser = fastify[keys.kContentTypeParser]

    contentTypeParser.add('*', {}, first)
    t.equal(contentTypeParser.customParsers.get('').fn, first)
  })

  t.end()
})

test('non-Error thrown from content parser is properly handled', t => {
  t.plan(3)

  const fastify = Fastify()

  const throwable = 'test'
  const payload = 'error'

  fastify.addContentTypeParser('text/test', (request, payload, done) => {
    done(throwable)
  })

  fastify.post('/', (req, reply) => {
  })

  fastify.setErrorHandler((err, req, res) => {
    t.equal(err, throwable)

    res.send(payload)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    headers: { 'Content-Type': 'text/test' },
    body: 'some text'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, payload)
  })
})

test('Error thrown 415 from content type is null and make post request to server', t => {
  t.plan(3)

  const fastify = Fastify()
  const errMsg = new FST_ERR_CTP_INVALID_MEDIA_TYPE(undefined).message

  fastify.post('/', (req, reply) => {
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    body: 'some text'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 415)
    t.equal(JSON.parse(res.body).message, errMsg)
  })
})

test('remove', t => {
  test('should remove default parser', t => {
    t.plan(2)

    const fastify = Fastify()
    const contentTypeParser = fastify[keys.kContentTypeParser]

    contentTypeParser.remove('application/json')

    t.notOk(contentTypeParser.customParsers['application/json'])
    t.notOk(contentTypeParser.parserList.find(parser => parser === 'application/json'))
  })

  test('should remove RegExp parser', t => {
    t.plan(2)

    const fastify = Fastify()
    fastify.addContentTypeParser(/^text\/*/, first)

    const contentTypeParser = fastify[keys.kContentTypeParser]

    contentTypeParser.remove(/^text\/*/)

    t.notOk(contentTypeParser.customParsers[/^text\/*/])
    t.notOk(contentTypeParser.parserRegExpList.find(parser => parser.toString() === /^text\/*/.toString()))
  })

  test('should throw an error if content type is neither string nor RegExp', t => {
    t.plan(1)

    const fastify = Fastify()

    t.throws(() => fastify[keys.kContentTypeParser].remove(12), FST_ERR_CTP_INVALID_TYPE)
  })

  test('should not throw error if content type does not exist', t => {
    t.plan(1)

    const fastify = Fastify()

    t.doesNotThrow(() => fastify[keys.kContentTypeParser].remove('image/png'))
  })

  test('should not remove any content type parser if content type does not exist', t => {
    t.plan(1)

    const fastify = Fastify()

    const contentTypeParser = fastify[keys.kContentTypeParser]

    contentTypeParser.remove('image/png')

    t.same(contentTypeParser.customParsers.size, 2)
  })

  t.end()
})

test('remove all should remove all existing parsers and reset cache', t => {
  t.plan(4)

  const fastify = Fastify()
  fastify.addContentTypeParser('application/xml', first)
  fastify.addContentTypeParser(/^image\/.*/, first)

  const contentTypeParser = fastify[keys.kContentTypeParser]

  contentTypeParser.getParser('application/xml') // fill cache with one entry
  contentTypeParser.removeAll()

  t.same(contentTypeParser.cache.size, 0)
  t.same(contentTypeParser.parserList.length, 0)
  t.same(contentTypeParser.parserRegExpList.length, 0)
  t.same(Object.keys(contentTypeParser.customParsers).length, 0)
})

test('Safeguard against malicious content-type / 1', async t => {
  const badNames = Object.getOwnPropertyNames({}.__proto__) // eslint-disable-line
  t.plan(badNames.length)

  const fastify = Fastify()

  fastify.post('/', async () => {
    return 'ok'
  })

  for (const prop of badNames) {
    const response = await fastify.inject({
      method: 'POST',
      path: '/',
      headers: {
        'content-type': prop
      },
      body: ''
    })

    t.same(response.statusCode, 415)
  }
})

test('Safeguard against malicious content-type / 2', async t => {
  t.plan(1)

  const fastify = Fastify()

  fastify.post('/', async () => {
    return 'ok'
  })

  const response = await fastify.inject({
    method: 'POST',
    path: '/',
    headers: {
      'content-type': '\\u0063\\u006fnstructor'
    },
    body: ''
  })

  t.same(response.statusCode, 415)
})

test('Safeguard against malicious content-type / 3', async t => {
  t.plan(1)

  const fastify = Fastify()

  fastify.post('/', async () => {
    return 'ok'
  })

  const response = await fastify.inject({
    method: 'POST',
    path: '/',
    headers: {
      'content-type': 'constructor; charset=utf-8'
    },
    body: ''
  })

  t.same(response.statusCode, 415)
})

test('Safeguard against content-type spoofing - string', async t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.removeAllContentTypeParsers()
  fastify.addContentTypeParser('text/plain', function (request, body, done) {
    t.pass('should be called')
    done(null, body)
  })
  fastify.addContentTypeParser('application/json', function (request, body, done) {
    t.fail('shouldn\'t be called')
    done(null, body)
  })

  fastify.post('/', async () => {
    return 'ok'
  })

  await fastify.inject({
    method: 'POST',
    path: '/',
    headers: {
      'content-type': 'text/plain; content-type="application/json"'
    },
    body: ''
  })
})

test('Safeguard against content-type spoofing - regexp', async t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.removeAllContentTypeParsers()
  fastify.addContentTypeParser(/text\/plain/, function (request, body, done) {
    t.pass('should be called')
    done(null, body)
  })
  fastify.addContentTypeParser(/application\/json/, function (request, body, done) {
    t.fail('shouldn\'t be called')
    done(null, body)
  })

  fastify.post('/', async () => {
    return 'ok'
  })

  await fastify.inject({
    method: 'POST',
    path: '/',
    headers: {
      'content-type': 'text/plain; content-type="application/json"'
    },
    body: ''
  })
})

test('content-type match parameters - string 1', async t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.removeAllContentTypeParsers()
  fastify.addContentTypeParser('text/plain; charset=utf8', function (request, body, done) {
    t.fail('shouldn\'t be called')
    done(null, body)
  })
  fastify.addContentTypeParser('application/json; charset=utf8', function (request, body, done) {
    t.pass('should be called')
    done(null, body)
  })

  fastify.post('/', async () => {
    return 'ok'
  })

  await fastify.inject({
    method: 'POST',
    path: '/',
    headers: {
      'content-type': 'application/json; charset=utf8'
    },
    body: ''
  })
})

test('content-type match parameters - string 2', async t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.removeAllContentTypeParsers()
  fastify.addContentTypeParser('application/json; charset=utf8; foo=bar', function (request, body, done) {
    t.pass('should be called')
    done(null, body)
  })
  fastify.addContentTypeParser('text/plain; charset=utf8; foo=bar', function (request, body, done) {
    t.fail('shouldn\'t be called')
    done(null, body)
  })

  fastify.post('/', async () => {
    return 'ok'
  })

  await fastify.inject({
    method: 'POST',
    path: '/',
    headers: {
      'content-type': 'application/json; foo=bar; charset=utf8'
    },
    body: ''
  })
})

test('content-type match parameters - regexp', async t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.removeAllContentTypeParsers()
  fastify.addContentTypeParser(/application\/json; charset=utf8/, function (request, body, done) {
    t.pass('should be called')
    done(null, body)
  })

  fastify.post('/', async () => {
    return 'ok'
  })

  await fastify.inject({
    method: 'POST',
    path: '/',
    headers: {
      'content-type': 'application/json; charset=utf8'
    },
    body: ''
  })
})

test('content-type fail when parameters not match - string 1', async t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.removeAllContentTypeParsers()
  fastify.addContentTypeParser('application/json; charset=utf8; foo=bar', function (request, body, done) {
    t.fail('shouldn\'t be called')
    done(null, body)
  })

  fastify.post('/', async () => {
    return 'ok'
  })

  const response = await fastify.inject({
    method: 'POST',
    path: '/',
    headers: {
      'content-type': 'application/json; charset=utf8'
    },
    body: ''
  })

  t.same(response.statusCode, 415)
})

test('content-type fail when parameters not match - string 2', async t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.removeAllContentTypeParsers()
  fastify.addContentTypeParser('application/json; charset=utf8; foo=bar', function (request, body, done) {
    t.fail('shouldn\'t be called')
    done(null, body)
  })

  fastify.post('/', async () => {
    return 'ok'
  })

  const response = await fastify.inject({
    method: 'POST',
    path: '/',
    headers: {
      'content-type': 'application/json; charset=utf8; foo=baz'
    },
    body: ''
  })

  t.same(response.statusCode, 415)
})

test('content-type fail when parameters not match - regexp', async t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.removeAllContentTypeParsers()
  fastify.addContentTypeParser(/application\/json; charset=utf8; foo=bar/, function (request, body, done) {
    t.fail('shouldn\'t be called')
    done(null, body)
  })

  fastify.post('/', async () => {
    return 'ok'
  })

  const response = await fastify.inject({
    method: 'POST',
    path: '/',
    headers: {
      'content-type': 'application/json; charset=utf8'
    },
    body: ''
  })

  t.same(response.statusCode, 415)
})

// Refs: https://github.com/fastify/fastify/issues/4495
test('content-type regexp list should be cloned when plugin override', async t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.addContentTypeParser(/^image\/.*/, { parseAs: 'buffer' }, (req, payload, done) => {
    done(null, payload)
  })

  fastify.register(function plugin (fastify, options, done) {
    fastify.post('/', function (request, reply) {
      reply.type(request.headers['content-type']).send(request.body)
    })

    done()
  })

  {
    const { payload, headers, statusCode } = await fastify.inject({
      method: 'POST',
      path: '/',
      payload: 'jpeg',
      headers: { 'content-type': 'image/jpeg' }
    })
    t.same(statusCode, 200)
    t.same(headers['content-type'], 'image/jpeg')
    t.same(payload, 'jpeg')
  }

  {
    const { payload, headers, statusCode } = await fastify.inject({
      method: 'POST',
      path: '/',
      payload: 'png',
      headers: { 'content-type': 'image/png' }
    })
    t.same(statusCode, 200)
    t.same(headers['content-type'], 'image/png')
    t.same(payload, 'png')
  }
})
