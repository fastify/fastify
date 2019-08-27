import fastify from '../../fastify'
import { expectType } from 'tsd'
import { IncomingMessage } from 'http'

expectType<void>(fastify().addContentTypeParser('contentType', function (req, done) {
  expectType<IncomingMessage>(req)
  done(null)
}))

// Body limit options

expectType<void>(fastify().addContentTypeParser('contentType', { bodyLimit: 99 }, function (req, done) {
  expectType<IncomingMessage>(req)
  done(null)
}))

// Array for contentType

expectType<void>(fastify().addContentTypeParser(['contentType'], function (req, done) {
  expectType<IncomingMessage>(req)
  done(null)
}))

// Body Parser - the generic after addContentTypeParser enforces the type of the `body` parameter as well as the value of the `parseAs` property

expectType<void>(fastify().addContentTypeParser<string>('bodyContentType', { parseAs: 'string' }, function (req, body, done) {
  expectType<IncomingMessage>(req)
  expectType<string>(body)
  done(null)
}))

expectType<void>(fastify().addContentTypeParser<Buffer>('bodyContentType', { parseAs: 'buffer' }, function (req, body, done) {
  expectType<IncomingMessage>(req)
  expectType<Buffer>(body)
  done(null)
}))

expectType<void>(fastify().addContentTypeParser('contentType', async function (req: IncomingMessage) {
  expectType<IncomingMessage>(req)
  return null
}))

expectType<void>(fastify().addContentTypeParser<string>('bodyContentType', { parseAs: 'string' }, async function (req: IncomingMessage, body: string) {
  expectType<IncomingMessage>(req)
  expectType<string>(body)
  return null
}))

expectType<void>(fastify().addContentTypeParser<Buffer>('bodyContentType', { parseAs: 'buffer' }, async function (req: IncomingMessage, body: Buffer) {
  expectType<IncomingMessage>(req)
  expectType<Buffer>(body)
  return null
}))
