import fastify, { RouteOptions, FastifyReply, FastifyRequest } from '../../fastify'
import { expectType, expectError } from 'tsd'
import { FastifyInstance } from '../../types/instance'
import { FastifyError } from '../../types/error'

const server = fastify()

// Test payload generic pass through for preSerialization and onSend

type TestPayloadType = {
  foo: string,
  bar: number
}

// Synchronous Tests

server.addHook('onRequest', (request, reply, done) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<(err?: FastifyError) => void>(done)
  expectType<void>(done(new Error()))
})

server.addHook('preParsing', (request, reply, done) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<(err?: FastifyError) => void>(done)
  expectType<void>(done(new Error()))
})

server.addHook('preValidation', (request, reply, done) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<(err?: FastifyError) => void>(done)
  expectType<void>(done(new Error()))
})

server.addHook('preHandler', (request, reply, done) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<(err?: FastifyError) => void>(done)
  expectType<void>(done(new Error()))
})

server.addHook<TestPayloadType>('preSerialization', function (request, reply, payload, done) {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<TestPayloadType>(payload) // we expect this to be unknown when not specified like in the previous test
  expectType<void>(done(new Error()))
  expectType<void>(done(null, 'foobar'))
  expectError(done())
})

server.addHook<TestPayloadType>('onSend', (request, reply, payload, done) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<TestPayloadType>(payload)
  expectType<void>(done(new Error()))
  expectType<void>(done(null, 'foobar'))
  expectError(done())
})

server.addHook('onResponse', (request, reply, done) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<(err?: FastifyError) => void>(done)
  expectType<void>(done(new Error()))
})

server.addHook('onError', (request, reply, error, done) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<FastifyError>(error)
  expectType<() => void>(done)
  expectType<void>(done())
})

server.addHook('onRoute', (opts) => {
  expectType<RouteOptions & { path: string, prefix: string}>(opts)
})

server.addHook('onRegister', (instance, done) => {
  expectType<FastifyInstance>(instance)
  expectType<(err?: FastifyError) => void>(done)
  expectType<void>(done(new Error()))
})

server.addHook('onClose', (instance, done) => {
  expectType<FastifyInstance>(instance)
  expectType<(err?: FastifyError) => void>(done)
  expectType<void>(done(new Error()))
})

// Asynchronous

server.addHook('onRequest', async (request, reply) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  return;
})

server.addHook('preParsing', async (request, reply) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  return;
})

server.addHook('preValidation', async (request, reply) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  return;
})

server.addHook('preHandler', (request, reply) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  return;
})

server.addHook<TestPayloadType>('preSerialization', async function (request, reply, payload) {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<TestPayloadType>(payload) // we expect this to be unknown when not specified like in the previous test
  return;
})

server.addHook<TestPayloadType>('onSend', async (request, reply, payload) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<TestPayloadType>(payload)
  return;
})

server.addHook('onResponse', async (request, reply) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  return;
})

server.addHook('onError', async (request, reply, error) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<FastifyError>(error)
  return;
})

server.addHook('onRegister', async (instance) => {
  expectType<FastifyInstance>(instance)
  return;
})

server.addHook('onClose', async (instance) => {
  expectType<FastifyInstance>(instance)
  return;
})