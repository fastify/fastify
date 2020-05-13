import fastify, { FastifyInstance, FastifyServerOptions } from '../../fastify'
import * as http from 'http'
import * as https from 'https'
import * as http2 from 'http2'
import { Chain as LightMyRequestChain } from 'light-my-request';
import { expectType, expectError } from 'tsd'

// FastifyInstance
// http server
expectType<FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>>(fastify())
expectType<FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>>(fastify({}))
// https server
expectType<FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse>>(fastify({ https: {} }))
// http2 server
expectType<FastifyInstance<http2.Http2Server, http2.Http2ServerRequest, http2.Http2ServerResponse>>(fastify({ http2: true, http2SessionTimeout: 1000 }))
expectType<FastifyInstance<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse>>(fastify({ http2: true, https: {}}))
expectType<LightMyRequestChain>(fastify({ http2: true, https: {}}).inject())

expectError(fastify<http2.Http2Server>({ http2: false })) // http2 option must be true
expectError(fastify<http2.Http2SecureServer>({ http2: false })) // http2 option must be true

// server options
fastify({ http2: true })
fastify({
  https: {
    ca: 'foo',
    cert: 'bar'
  }
})
fastify({ ignoreTrailingSlash: true })
fastify({ connectionTimeout: 1000 })
fastify({ keepAliveTimeout: 1000 })
fastify({ pluginTimeout: 1000 })
fastify({ bodyLimit: 100 })
fastify({ maxParamLength: 100 })
fastify({ disableRequestLogging: true })
fastify({ requestIdLogLabel: 'request-id' })
fastify({ onProtoPoisoing: 'error' })
fastify({ onConstructorPoisoning: 'error' })
fastify({ logger: true })
fastify({
  logger: {
    level: 'info',
    genReqId: () => 'request-id',
    serializers: {
      req: () => {},
      res: () => {},
      err: () => {},
    }
  }
})
fastify({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
    trace: () => {},
    debug: () => {},
    child: this
  }
})
fastify({ serverFactory: () => http.createServer() })
fastify({ caseSensitive: true })
fastify({ requestIdHeader: 'request-id' })
fastify({ genReqId: () => 'request-id' });
fastify({ trustProxy: true })
fastify({ querystringParser: () => ({ foo: 'bar' }) })
fastify({
  versioning: {
    storage: () => ({
      get: () => 'foo',
      set: () => {},
      del: () => {},
      empty: () => {}
    }),
    deriveVersion: () => 'foo'
  }
})
fastify({ return503OnClosing: true })
fastify({
  ajv: {
    customOptions: {
      nullable: false
    },
    plugins: [() => {}]
  }
})
fastify({ frameworkErrors: () => {} })
