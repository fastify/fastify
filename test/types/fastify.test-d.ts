import fastify, {FastifyInstance, FastifyPlugin, FastifyRequest, FastifyReply } from '../../fastify'
import * as http from 'http'
import * as https from 'https'
import * as http2 from 'http2'
import {expectType, expectError} from 'tsd'

// FastifyInstance
// http server
expectType<FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>>(fastify())
expectType<FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>>(fastify<http.Server>())
// https server
expectType<FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse>>(fastify<https.Server>())
// http2 server
expectType<FastifyInstance<http2.Http2Server, http2.Http2ServerRequest, http2.Http2ServerResponse>>(fastify<http2.Http2Server>())
expectType<FastifyInstance<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse>>(fastify<http2.Http2SecureServer>())
expectError(fastify<http2.Http2Server>({ http2: false })) // http2 option must be true
expectError(fastify<http2.Http2SecureServer>({ http2: false })) // http2 option must be true

// FastifyPlugin & FastifyRegister
const plugin: FastifyPlugin<{
  option1: string,
  option2: boolean
}> = function(instance, opts, next) { }
expectError(fastify().register(plugin, {}))
expectType<void>(fastify().register(plugin, { option1: '', option2: true }))

// FastifyRoute
expectType<FastifyInstance<http.Server>>(fastify().get('/', (request, reply) => {}))
expectType<FastifyInstance<http.Server>>(fastify().get('/', {}, (request, reply) => {}))
expectType<FastifyInstance<http.Server>>(fastify().get('/', { handler: (request, reply) => {}}))

// FastifyRequest and FastifyReply
fastify().get('/', (request, reply) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
})

// Custom Server
type CustomType = void;
interface CustomIncomingMessage extends http.IncomingMessage {
  fakeMethod?: () => CustomType;
}
interface CustomServerResponse extends http.ServerResponse {
  fakeMethod?: () => CustomType;
}

const customServer: FastifyInstance<http.Server, CustomIncomingMessage, CustomServerResponse> = fastify<http.Server>()
customServer.get('/', (request, reply) => { // currently failling: `Cannot invoke an object which is possibly undefined.`
  expectType<CustomType>(request.fakeMethod())
  expectType<CustomType>(reply.fakeMethod())
})
