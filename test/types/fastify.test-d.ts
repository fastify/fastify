import fastify, {FastifyServerOptions, FastifyInstance, FastifyPlugin, FastifyRegister} from '../../fastify'
import * as http from 'http'
import * as https from 'https'
import * as http2 from 'http2'
import {expectType, expectError} from 'tsd'

// FastifyInstance
expectType<FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>>(fastify())
expectType<FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>>(fastify<http.Server>())
expectType<FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse>>(fastify<https.Server>())
expectType<FastifyInstance<http2.Http2Server, http2.Http2ServerRequest, http2.Http2ServerResponse>>(fastify<http2.Http2Server>())
expectType<FastifyInstance<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse>>(fastify<http2.Http2SecureServer>())

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