import fastify, { RouteOptions, FastifyReply, FastifyRequest } from '../../fastify'
import { expectType, expectError } from 'tsd'
import { FastifyInstance } from '../../types/instance'
import { FastifyError } from '../../types/error'
import { preSerializationHookHandler } from '../../types/hooks'

const server = fastify()

server.addHook('onRequest', (request, reply, done) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<(err?: FastifyError) => void>(done)
})

server.addHook('preParsing', (request, reply, done) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<(err?: FastifyError) => void>(done)
})

server.addHook('preValidation', (request, reply, done) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<(err?: FastifyError) => void>(done)
})

server.addHook('preHandler', (request, reply, done) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<(err?: FastifyError) => void>(done)
})

server.addHook('onResponse', (request, reply, done) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<(err?: FastifyError) => void>(done)
})

server.addHook('onError', (request, reply, error, done) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<FastifyError>(error)
  expectType<() => void>(done)
})

// Test payload generic pass through for preSerialization and onSend

type TestPayloadType = {
  foo: string,
  bar: number
}

// const preSerializationHook: preSerializationHookHandler<TestPayloadType> = (request, reply, payload, done) => {
//   expectType<FastifyRequest>(request)
//   expectType<FastifyReply>(reply)
//   expectType<TestPayloadType>(payload)
//   expectError(done())
// }

// server.addHook('preSerialization', preSerializationHook)

server.addHook('preSerialization', function (request, reply, payload, done) {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<TestPayloadType>(payload)
  expectError(done())
})

server.addHook('onSend', (request, reply, payload, done) => {
  // some code
  done()
})

server.addHook('onRoute', (opts) => {
  expectType<RouteOptions & { path: string, prefix: string}>(opts)
})

server.addHook('onRegister', (instance, done) => {
  expectType<FastifyInstance>(instance)
  expectType<(err?: FastifyError) => void>(done)
})

server.addHook('onClose', (instance, done) => {
  expectType<FastifyInstance>(instance)
  expectType<(err?: FastifyError) => void>(done)
})