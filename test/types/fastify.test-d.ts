import fastify, { FastifyInstance } from '../../fastify'
import * as http from 'http'
import * as https from 'https'
import * as http2 from 'http2'
import { expectType, expectError } from 'tsd'

// FastifyInstance
// http server
expectType<FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>>(fastify())
expectType<FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>>(fastify({}))
// https server
expectType<FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse>>(fastify({ https: {} }))
// http2 server
expectType<FastifyInstance<http2.Http2Server, http2.Http2ServerRequest, http2.Http2ServerResponse>>(fastify({ http2: true }))
expectType<FastifyInstance<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse>>(fastify({ http2: true, https: {}}))
expectError(fastify<http2.Http2Server>({ http2: false })) // http2 option must be true
expectError(fastify<http2.Http2SecureServer>({ http2: false })) // http2 option must be true
