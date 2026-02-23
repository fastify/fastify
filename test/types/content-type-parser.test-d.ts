import type { IncomingMessage } from 'node:http'
import { expect } from 'tstyche'
import fastify, { type FastifyBodyParser } from '../../fastify.js'
import type { FastifyRequest } from '../../types/request.js'

expect(fastify().addContentTypeParser('contentType', function (request, payload, done) {
  expect(request).type.toBe<FastifyRequest>()
  expect(payload).type.toBe<IncomingMessage>()
  done(null)
})).type.toBe<void>()

// Body limit options

expect(fastify().addContentTypeParser('contentType', { bodyLimit: 99 }, function (request, payload, done) {
  expect(request).type.toBe<FastifyRequest>()
  expect(payload).type.toBe<IncomingMessage>()
  done(null)
})).type.toBe<void>()

// Array for contentType

expect(fastify().addContentTypeParser(['contentType'], function (request, payload, done) {
  expect(request).type.toBe<FastifyRequest>()
  expect(payload).type.toBe<IncomingMessage>()
  done(null)
})).type.toBe<void>()

// Body Parser - the generic after addContentTypeParser enforces the type of the `body` parameter as well as the value of the `parseAs` property

expect(fastify().addContentTypeParser<string>('bodyContentType', { parseAs: 'string' }, function (request, body, done) {
  expect(request).type.toBe<FastifyRequest>()
  expect(body).type.toBe<string>()
  done(null)
})).type.toBe<void>()

expect(fastify().addContentTypeParser<Buffer>('bodyContentType', { parseAs: 'buffer' }, function (request, body, done) {
  expect(request).type.toBe<FastifyRequest>()
  expect(body).type.toBe<Buffer>()
  done(null)
})).type.toBe<void>()

expect(fastify().addContentTypeParser('contentType', async function (request: FastifyRequest, payload: IncomingMessage) {
  expect(request).type.toBe<FastifyRequest>()
  expect(payload).type.toBe<IncomingMessage>()
  return null
})).type.toBe<void>()

expect(fastify().addContentTypeParser<string>('bodyContentType', { parseAs: 'string' }, async function (request: FastifyRequest, body: string) {
  expect(request).type.toBe<FastifyRequest>()
  expect(body).type.toBe<string>()
  return null
})).type.toBe<void>()

expect(fastify().addContentTypeParser<Buffer>('bodyContentType', { parseAs: 'buffer' }, async function (request: FastifyRequest, body: Buffer) {
  expect(request).type.toBe<FastifyRequest>()
  expect(body).type.toBe<Buffer>()
  return null
})).type.toBe<void>()

expect(fastify().getDefaultJsonParser('error', 'ignore')).type.toBe<FastifyBodyParser<string>>()

expect(fastify().getDefaultJsonParser).type.not.toBeCallableWith('error', 'skip')

expect(fastify().getDefaultJsonParser).type.not.toBeCallableWith('nothing', 'ignore')

expect(fastify().removeAllContentTypeParsers()).type.toBe<void>()
expect(fastify().removeAllContentTypeParsers).type.not.toBeCallableWith('contentType')

expect(fastify().removeContentTypeParser('contentType')).type.toBe<void>()
expect(fastify().removeContentTypeParser(/contentType+.*/)).type.toBe<void>()
expect(fastify().removeContentTypeParser(['contentType', /contentType+.*/])).type.toBe<void>()
expect(fastify().removeContentTypeParser).type.not.toBeCallableWith({})
