'use strict'

const { describe, test } = require('node:test')
const ContentType = require('../../lib/content-type')

describe('ContentType', () => {
  describe('Symbol.toStringTag', () => {
    test('identifies instances as ContentType', (t) => {
      t.assert.equal(Object.prototype.toString.call(new ContentType('text/plain')), '[object ContentType]')
      t.assert.equal(new ContentType('text/plain')[Symbol.toStringTag], 'ContentType')
    })
  })

  describe('isEmpty', () => {
    test('is true for nullish and empty constructor input', (t) => {
      for (const value of [null, undefined, '', 'undefined']) {
        const found = new ContentType(value)
        t.assert.equal(found.isEmpty, true, `expected empty for ${String(value)}`)
        t.assert.equal(found.isValid, false)
      }
    })

    test('is false for a valid media type', (t) => {
      const found = new ContentType('text/plain')
      t.assert.equal(found.isEmpty, false)
      t.assert.equal(found.isValid, true)
    })
  })

  describe('isValid', () => {
    test('is false when type/subtype format is missing or malformed', (t) => {
      const invalid = [
        'foo',
        'foo; param=1',
        'application/json<script>alert(1)</script>',
        'application/json/extra/slashes',
        'application/json(garbage)',
        'application/json@evil',
        'application/json\x00garbage',
        'application/json whatever',
        'application/    json whatever',
        'foo /bar',
        'foo/ bar',
        '  text  /  html  '
      ]

      for (const value of invalid) {
        const found = new ContentType(value)
        t.assert.equal(found.isValid, false, `expected invalid for ${JSON.stringify(value)}`)
        t.assert.equal(found.isEmpty, true, `expected empty for ${JSON.stringify(value)}`)
      }
    })

    test('is false when the media type portion uses invalid characters with parameters', (t) => {
      t.assert.equal(new ContentType('bad type/sub; p=1').isValid, false)
      t.assert.equal(new ContentType('type/bad subtype; p=1').isValid, false)
      t.assert.equal(new ContentType('foo/π; param=1').isValid, false)
    })

    test('is true for representative valid media types', (t) => {
      const valid = [
        'text/plain',
        'application/json',
        'application/vnd.api+json',
        'application/x-custom',
        'multipart/form-data; boundary=----WebKitFormBoundary'
      ]

      for (const value of valid) {
        const found = new ContentType(value)
        t.assert.equal(found.isValid, true, `expected valid for ${JSON.stringify(value)}`)
        t.assert.equal(found.isEmpty, false, `expected non-empty for ${JSON.stringify(value)}`)
      }
    })
  })

  describe('type and subtype', () => {
    test('normalize case and expose parsed tokens', (t) => {
      const found = new ContentType('Application/JSON')
      t.assert.equal(found.type, 'application')
      t.assert.equal(found.subtype, 'json')
    })

    test('trim leading type whitespace and trailing subtype whitespace without parameters', (t) => {
      const found = new ContentType('  application/json  ')
      t.assert.equal(found.isValid, true)
      t.assert.equal(found.type, 'application')
      t.assert.equal(found.subtype, 'json')
    })

    test('preserve structured subtype tokens such as vendor trees and suffixes', (t) => {
      const found = new ContentType('application/vnd.api+json')
      t.assert.equal(found.type, 'application')
      t.assert.equal(found.subtype, 'vnd.api+json')
    })

    test('remain empty strings on invalid input', (t) => {
      const found = new ContentType('not-a-media-type')
      t.assert.equal(found.type, '')
      t.assert.equal(found.subtype, '')
    })
  })

  describe('mediaType', () => {
    test('combines normalized type and subtype', (t) => {
      const found = new ContentType('TEXT/HTML')
      t.assert.equal(found.mediaType, 'text/html')
    })

    test('returns a slash for invalid instances', (t) => {
      t.assert.equal(new ContentType('').mediaType, '/')
      t.assert.equal(new ContentType('invalid').mediaType, '/')
    })

    test('ignores parameters', (t) => {
      const found = new ContentType('application/json; charset=utf-8')
      t.assert.equal(found.mediaType, 'application/json')
    })
  })

  describe('parameters', () => {
    test('returns an empty Map for media types without parameters', (t) => {
      const found = new ContentType('text/plain')
      t.assert.ok(found.parameters instanceof Map)
      t.assert.equal(found.parameters.size, 0)
    })

    test('returns an empty Map when the parameter list is empty', (t) => {
      const found = new ContentType('Application/JSON ;')
      t.assert.equal(found.parameters.size, 0)
    })

    test('parse unquoted parameter values', (t) => {
      const found = new ContentType('application/json; foo=bar')
      t.assert.deepStrictEqual(
        Array.from(found.parameters.entries()),
        [['foo', 'bar']]
      )
    })

    test('store quoted parameter values including surrounding quotes', (t) => {
      const found = new ContentType('application/json; charset="utf-8"; title="hello world"')
      t.assert.deepStrictEqual(
        Array.from(found.parameters.entries()),
        [
          ['charset', '"utf-8"'],
          ['title', '"hello world"']
        ]
      )
    })

    test('preserve parameter value casing and interior whitespace', (t) => {
      const found = new ContentType('Application/JSON ; charset=utf-8; foo=BaR;baz=" 42"')
      t.assert.deepStrictEqual(
        Array.from(found.parameters.entries()),
        [
          ['charset', 'utf-8'],
          ['foo', 'BaR'],
          ['baz', '" 42"']
        ]
      )
    })

    test('accept empty quoted parameter values', (t) => {
      const found = new ContentType('application/json; empty=""')
      t.assert.deepStrictEqual(
        Array.from(found.parameters.entries()),
        [['empty', '""']]
      )
    })

    test('store a sentinel for unclosed quoted values', (t) => {
      const found = new ContentType('Application/JSON ; charset=utf-8; foo=BaR;baz=" 42')
      t.assert.deepStrictEqual(
        Array.from(found.parameters.entries()),
        [
          ['charset', 'utf-8'],
          ['foo', 'BaR'],
          ['baz', 'invalid quoted string']
        ]
      )
    })

    test('ignore tokens that are not key=value pairs', (t) => {
      const found = new ContentType('type/sub; badparam')
      t.assert.equal(found.isValid, true)
      t.assert.equal(found.parameters.size, 0)
    })

    test('keep the last value when duplicate keys appear', (t) => {
      const found = new ContentType('application/json; duplicate=1; duplicate=2')
      t.assert.deepStrictEqual(
        Array.from(found.parameters.entries()),
        [['duplicate', '2']]
      )
    })
  })

  describe('toString', () => {
    test('returns the media type alone when there are no parameters', (t) => {
      const found = new ContentType('text/plain')
      t.assert.equal(found.toString(), 'text/plain')
    })

    test('serializes parameters with quoted values', (t) => {
      const found = new ContentType('Application/JSON ; charset=utf-8; foo=BaR;baz=" 42"')
      t.assert.equal(
        found.toString(),
        'application/json; charset="utf-8"; foo="BaR"; baz="" 42""'
      )
    })

    test('serializes invalid quoted parameter values using the stored sentinel', (t) => {
      const found = new ContentType('Application/JSON ; charset=utf-8; foo=BaR;baz=" 42')
      t.assert.equal(
        found.toString(),
        'application/json; charset="utf-8"; foo="BaR"; baz="invalid quoted string"'
      )
    })

    test('caches the serialized value', (t) => {
      const found = new ContentType('text/plain; a=1')
      const first = found.toString()
      const second = found.toString()
      t.assert.equal(first, second)
      t.assert.equal(first, 'text/plain; a="1"')
    })

    test('returns a slash for invalid instances', (t) => {
      t.assert.equal(new ContentType('').toString(), '/')
    })
  })
})
