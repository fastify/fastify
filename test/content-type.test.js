'use strict'

const { describe, test } = require('node:test')
const ContentType = require('../lib/content-type')
const Fastify = require('..')

test('should remove content-type for setErrorHandler', async t => {
  t.plan(8)
  let count = 0

  const fastify = Fastify()
  fastify.setErrorHandler(function (error, request, reply) {
    t.assert.strictEqual(error.message, 'kaboom')
    t.assert.strictEqual(reply.hasHeader('content-type'), false)
    reply.code(400).send({ foo: 'bar' })
  })
  fastify.addHook('onSend', async function (request, reply, payload) {
    count++
    t.assert.strictEqual(typeof payload, 'string')
    switch (count) {
      case 1: {
        // should guess the correct content-type based on payload
        t.assert.strictEqual(reply.getHeader('content-type'), 'text/plain; charset=utf-8')
        throw Error('kaboom')
      }
      case 2: {
        // should guess the correct content-type based on payload
        t.assert.strictEqual(reply.getHeader('content-type'), 'application/json; charset=utf-8')
        return payload
      }
      default: {
        t.fail('should not reach')
      }
    }
  })
  fastify.get('/', function (request, reply) {
    reply.send('plain-text')
  })

  const { statusCode, body } = await fastify.inject({ method: 'GET', path: '/' })
  t.assert.strictEqual(statusCode, 400)
  t.assert.strictEqual(body, JSON.stringify({ foo: 'bar' }))
})

describe('ContentType class', () => {
  test('returns empty instance for empty value', (t) => {
    let found = new ContentType('')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.mediaType, undefined)

    found = new ContentType('undefined')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.mediaType, undefined)

    found = new ContentType()
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.mediaType, undefined)
  })

  test('indicates media type is not correct format', (t) => {
    let found = new ContentType('foo')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.isValid, false)
    t.assert.equal(found.mediaType, undefined)

    found = new ContentType('foo /bar')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.isValid, false)

    found = new ContentType('foo/ bar')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.isValid, false)

    found = new ContentType('foo; param=1')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.isValid, false)

    found = new ContentType('foo/π; param=1')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.isValid, false)

    found = new ContentType('application/json<script>alert(1)</script>')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.isValid, false)

    found = new ContentType('application/json/extra/slashes')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.isValid, false)

    found = new ContentType('application/json(garbage)')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.isValid, false)

    found = new ContentType('application/json@evil')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.isValid, false)

    found = new ContentType('application/json\x00garbage')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.isValid, false)
  })

  test('subtype with multiple fields validates as incorrect', (t) => {
    let found = new ContentType('application/json whatever')
    t.assert.equal(found.isValid, false)
    t.assert.equal(found.isEmpty, true)

    found = new ContentType('application/    json whatever')
    t.assert.equal(found.isValid, false)
    t.assert.equal(found.isEmpty, true)

    found = new ContentType('application/json whatever; foo=bar')
    t.assert.equal(found.isValid, false)
    t.assert.equal(found.isEmpty, true)

    found = new ContentType('application/    json whatever; foo=bar')
    t.assert.equal(found.isValid, false)
    t.assert.equal(found.isEmpty, true)
  })

  test('returns a plain media type instance', (t) => {
    const found = new ContentType('Application/JSON')
    t.assert.equal(found.mediaType, 'application/json')
    t.assert.equal(found.type, 'application')
    t.assert.equal(found.subtype, 'json')
    t.assert.equal(found.parameters.size, 0)
  })

  test('handles empty parameters list', (t) => {
    const found = new ContentType('Application/JSON ;')
    t.assert.equal(found.isEmpty, false)
    t.assert.equal(found.mediaType, 'application/json')
    t.assert.equal(found.type, 'application')
    t.assert.equal(found.subtype, 'json')
    t.assert.equal(found.parameters.size, 0)
  })

  test('returns a media type instance with parameters', (t) => {
    const found = new ContentType('Application/JSON ; charset=utf-8; foo=BaR;baz=" 42"')
    t.assert.equal(found.isEmpty, false)
    t.assert.equal(found.mediaType, 'application/json')
    t.assert.equal(found.type, 'application')
    t.assert.equal(found.subtype, 'json')
    t.assert.equal(found.parameters.size, 3)

    const expected = [
      ['charset', 'utf-8'],
      ['foo', 'BaR'],
      ['baz', ' 42']
    ]
    t.assert.deepStrictEqual(
      Array.from(found.parameters.entries()),
      expected
    )

    t.assert.equal(
      found.toString(),
      'application/json; charset="utf-8"; foo="BaR"; baz=" 42"'
    )
  })

  test('skips invalid quoted string parameters', (t) => {
    const found = new ContentType('Application/JSON ; charset=utf-8; foo=BaR;baz=" 42')
    t.assert.equal(found.isEmpty, false)
    t.assert.equal(found.mediaType, 'application/json')
    t.assert.equal(found.type, 'application')
    t.assert.equal(found.subtype, 'json')
    t.assert.equal(found.parameters.size, 2)

    const expected = [
      ['charset', 'utf-8'],
      ['foo', 'BaR']
    ]
    t.assert.deepStrictEqual(
      Array.from(found.parameters.entries()),
      expected
    )

    t.assert.equal(
      found.toString(),
      'application/json; charset="utf-8"; foo="BaR"'
    )
  })

  test('preserves a semicolon inside a quoted parameter value', (t) => {
    // RFC 9110 §5.6.6: ';' is a literal qdtext octet inside a quoted-string
    // and does not terminate the parameter value.
    const found = new ContentType('application/json; name="foo;bar"; charset=utf-8')
    t.assert.equal(found.isValid, true)
    t.assert.equal(found.mediaType, 'application/json')
    t.assert.equal(found.parameters.get('name'), 'foo;bar')
    t.assert.equal(found.parameters.get('charset'), 'utf-8')
  })

  test('does not leak a fake parameter out of a quoted value', (t) => {
    // A `key=value;` sequence inside a quoted-string is opaque content of the
    // enclosing value, not a subsequent parameter.
    const found = new ContentType('application/json; name="a=b;charset=fake"; boundary=xyz')
    t.assert.equal(found.isValid, true)
    t.assert.equal(found.parameters.get('name'), 'a=b;charset=fake')
    t.assert.equal(found.parameters.get('boundary'), 'xyz')
    t.assert.equal(found.parameters.has('charset'), false)
  })

  test('unescapes a quoted-pair inside a quoted-string', (t) => {
    // RFC 9110 §5.6.4: a quoted-pair MUST be handled as if replaced by
    // the octet following the backslash.
    const found = new ContentType('application/json; name="he said \\"hi\\""')
    t.assert.equal(found.isValid, true)
    t.assert.equal(found.parameters.get('name'), 'he said "hi"')
  })
})

describe('ContentType class serialization', () => {
  test('escapes a DQUOTE so the value survives a round trip', (t) => {
    // RFC 9110 §5.6.4: DQUOTE cannot appear literally inside a quoted-string,
    // so a sender must express it as a quoted-pair.
    const found = new ContentType('application/json; name="he said \\"hi\\""')
    t.assert.equal(found.parameters.get('name'), 'he said "hi"')
    t.assert.equal(
      found.toString(),
      'application/json; name="he said \\"hi\\""'
    )
    t.assert.equal(
      new ContentType(found.toString()).parameters.get('name'),
      'he said "hi"'
    )
  })

  test('escapes a backslash so the value survives a round trip', (t) => {
    const found = new ContentType('application/json; name="a\\\\b"')
    t.assert.equal(found.parameters.get('name'), 'a\\b')
    t.assert.equal(found.toString(), 'application/json; name="a\\\\b"')
    t.assert.equal(
      new ContentType(found.toString()).parameters.get('name'),
      'a\\b'
    )
  })

  test('does not let a quoted value forge additional parameters', (t) => {
    // `p` holds a single value that happens to contain `"; q="`. Serializing
    // it without escaping would produce `p="a"; q="b"`, which is a different
    // content type carrying two parameters.
    const one = new ContentType('application/json; p="a\\"; q=\\"b"')
    const two = new ContentType('application/json; p="a"; q="b"')

    t.assert.equal(one.parameters.size, 1)
    t.assert.equal(one.parameters.get('p'), 'a"; q="b')
    t.assert.equal(two.parameters.size, 2)

    t.assert.notEqual(one.toString(), two.toString())
  })

  test('leaves a value with no quoted-pair octets untouched', (t) => {
    const found = new ContentType('application/json; charset=utf-8; foo=BaR')
    t.assert.equal(found.toString(), 'application/json; charset="utf-8"; foo="BaR"')
  })
})

describe('ContentType serialization and parser lookup', () => {
  test('does not run a parser registered for a different content type', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    // The registered type has one parameter whose value contains `"; q="`.
    fastify.addContentTypeParser('text/plain; p="a\\"; q=\\"b"', function (request, payload, done) {
      done(null, 'parsed by the registered parser')
    })
    fastify.post('/', (request, reply) => { reply.send(request.body) })

    // A different content type: two parameters, p=a and q=b. It must not
    // reach the parser above.
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      headers: { 'content-type': 'text/plain; p="a"; q="b"' },
      payload: 'body'
    })

    t.assert.equal(response.statusCode, 200)
    t.assert.notEqual(response.body, 'parsed by the registered parser')
  })
})

describe('ContentType class cache', () => {
  test('allow access cache', (t) => {
    const contentType1 = ContentType.from('application/json')
    const contentType2 = ContentType.cache.get('application/json')
    t.assert.equal(contentType1, contentType2)
  })

  test('returns same instance for the same content type string', (t) => {
    const contentType1 = ContentType.from('application/json')
    const contentType2 = ContentType.from('application/json')
    t.assert.equal(contentType1, contentType2)
  })

  test('returns different instances for different content type strings', (t) => {
    const contentType1 = ContentType.from('application/json')
    const contentType2 = ContentType.from('text/plain')
    t.assert.notEqual(contentType1, contentType2)
  })
})
