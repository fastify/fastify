'use strict'

const { test } = require('node:test')
const Fastify = require('..')

const malformedJson = 'application/json,application/json'

function recoverMalformedJson (defaultParser) {
  return function parseContentType (headerValue) {
    return defaultParser(headerValue === malformedJson ? 'application/json' : headerValue)
  }
}

test('custom content-type parser canonicalizes requests consistently', async t => {
  const fastify = Fastify({
    contentTypeParserFactory: recoverMalformedJson
  })
  t.after(() => fastify.close())

  fastify.register((instance, _options, done) => {
    instance.post('/', {
      schema: {
        body: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['foo'],
                properties: {
                  foo: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }, request => ({
      body: request.body,
      mediaType: request.mediaType
    }))
    done()
  })

  const accepted = await fastify.inject({
    method: 'POST',
    url: '/',
    headers: { 'content-type': malformedJson },
    payload: JSON.stringify({ foo: 'bar' })
  })
  t.assert.strictEqual(accepted.statusCode, 200)
  t.assert.deepStrictEqual(accepted.json(), {
    body: { foo: 'bar' },
    mediaType: 'application/json'
  })

  const rejectedBySchema = await fastify.inject({
    method: 'POST',
    url: '/',
    headers: { 'content-type': malformedJson },
    payload: JSON.stringify({ bar: 'baz' })
  })
  t.assert.strictEqual(rejectedBySchema.statusCode, 400)
  t.assert.strictEqual(rejectedBySchema.json().code, 'FST_ERR_VALIDATION')
})

test('custom content-type parser delegates ordinary invalid values', async t => {
  const fastify = Fastify({
    contentTypeParserFactory: recoverMalformedJson
  })
  t.after(() => fastify.close())
  fastify.post('/', () => 'unreachable')

  const response = await fastify.inject({
    method: 'POST',
    url: '/',
    headers: { 'content-type': 'invalid-content-type' },
    payload: 'body'
  })

  t.assert.strictEqual(response.statusCode, 415)
  t.assert.strictEqual(response.json().code, 'FST_ERR_CTP_INVALID_MEDIA_TYPE')
})

test('contentTypeParserFactory must be a function', t => {
  t.assert.throws(
    () => Fastify({ contentTypeParserFactory: 'invalid' }),
    new TypeError("contentTypeParserFactory option should be a function, instead got 'string'")
  )
})

test('contentTypeParserFactory must return a function', t => {
  t.assert.throws(
    () => Fastify({ contentTypeParserFactory: () => 'invalid' }),
    new TypeError('contentTypeParserFactory must return a function')
  )
})
