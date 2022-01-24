import * as http from 'http'
import { Socket } from 'net'
import { expectAssignable, expectError, expectType } from 'tsd'
import fastify, {
  ConnectionError, FastifyInstance,
  FastifyPlugin,
  FastifyPluginAsync,
  FastifyPluginCallback, InjectOptions, LightMyRequestCallback, LightMyRequestChain,
  LightMyRequestResponse
} from '../../fastify'
import { FastifyInstanceHttp2GenericInterface, FastifyInstanceHttp2SecureGenericInterface, FastifyInstanceHttpGenericInterface, FastifyInstanceHttpsGenericInterface } from '../../types/instance'

// FastifyInstance
// http server
expectType<FastifyInstance<FastifyInstanceHttpGenericInterface> & PromiseLike<FastifyInstance<FastifyInstanceHttpGenericInterface>>>(fastify())
expectType<FastifyInstance<FastifyInstanceHttpGenericInterface> & PromiseLike<FastifyInstance<FastifyInstanceHttpGenericInterface>>>(fastify({}))
// https server
expectType<FastifyInstance<FastifyInstanceHttpsGenericInterface> & PromiseLike<FastifyInstance<FastifyInstanceHttpsGenericInterface>>>(fastify({ https: {} }))
// http2 server
expectType<FastifyInstance<FastifyInstanceHttp2GenericInterface> & PromiseLike<FastifyInstance<FastifyInstanceHttp2GenericInterface>>>(fastify({ http2: true, http2SessionTimeout: 1000 }))
expectType<FastifyInstance<FastifyInstanceHttp2SecureGenericInterface> & PromiseLike<FastifyInstance<FastifyInstanceHttp2SecureGenericInterface>>>(fastify({ http2: true, https: {}, http2SessionTimeout: 1000 }))
expectType<LightMyRequestChain>(fastify({ http2: true, https: {} }).inject())
expectType<FastifyInstance<FastifyInstanceHttpGenericInterface> & PromiseLike<FastifyInstance<FastifyInstanceHttpGenericInterface>>>(fastify({ schemaController: {} }))
expectType<FastifyInstance<FastifyInstanceHttpGenericInterface> & PromiseLike<FastifyInstance<FastifyInstanceHttpGenericInterface>>>(
  fastify({
    schemaController: {
      compilersFactory: {}
    }
  })
)

expectError(fastify<FastifyInstanceHttp2GenericInterface>({ http2: false })) // http2 option must be true
expectError(fastify<FastifyInstanceHttp2SecureGenericInterface>({ http2: false })) // http2 option must be true
expectError(
  fastify({
    schemaController: {
      bucket: () => ({}) // cannot be empty
    }
  })
)

// light-my-request
expectAssignable<InjectOptions>({ query: '' })
fastify({ http2: true, https: {} }).inject().then((resp) => {
  expectAssignable<LightMyRequestResponse>(resp)
})
const lightMyRequestCallback: LightMyRequestCallback = (err: Error, response: LightMyRequestResponse) => {}
fastify({ http2: true, https: {} }).inject({}, lightMyRequestCallback)

// server options
expectAssignable<FastifyInstance<FastifyInstanceHttp2GenericInterface>>(fastify({ http2: true }))
expectAssignable<FastifyInstance>(fastify({ ignoreTrailingSlash: true }))
expectAssignable<FastifyInstance>(fastify({ connectionTimeout: 1000 }))
expectAssignable<FastifyInstance>(fastify({ keepAliveTimeout: 1000 }))
expectAssignable<FastifyInstance>(fastify({ pluginTimeout: 1000 }))
expectAssignable<FastifyInstance>(fastify({ bodyLimit: 100 }))
expectAssignable<FastifyInstance>(fastify({ maxParamLength: 100 }))
expectAssignable<FastifyInstance>(fastify({ disableRequestLogging: true }))
expectAssignable<FastifyInstance>(fastify({ requestIdLogLabel: 'request-id' }))
expectAssignable<FastifyInstance>(fastify({ onProtoPoisoning: 'error' }))
expectAssignable<FastifyInstance>(fastify({ onConstructorPoisoning: 'error' }))
expectAssignable<FastifyInstance>(fastify({ serializerOpts: { rounding: 'ceil' } }))
expectAssignable<FastifyInstance>(fastify({ serializerOpts: { ajv: { missingRefs: 'ignore' } } }))
expectAssignable<FastifyInstance>(fastify({ serializerOpts: { schema: { } } }))
expectAssignable<FastifyInstance>(fastify({ serializerOpts: { otherProp: { } } }))
expectAssignable<FastifyInstance>(fastify({ logger: true }))
expectAssignable<FastifyInstance>(fastify({ logger: true }))
expectAssignable<FastifyInstance>(fastify({
  logger: {
    level: 'info',
    genReqId: () => 'request-id',
    serializers: {
      req: () => {
        return {
          method: 'GET',
          url: '/',
          version: '1.0.0',
          hostname: 'localhost',
          remoteAddress: '127.0.0.1',
          remotePort: 3000
        }
      },
      res: () => {
        return {
          statusCode: 200
        }
      },
      err: () => {
        return {
          type: 'Error',
          message: 'foo',
          stack: ''
        }
      }
    }
  }
}))
const customLogger = {
  level: 'info',
  info: () => { },
  warn: () => { },
  error: () => { },
  fatal: () => { },
  trace: () => { },
  debug: () => { },
  child: () => customLogger
}
expectAssignable<FastifyInstance>(fastify({ logger: customLogger }))
expectAssignable<FastifyInstance>(fastify({ serverFactory: () => http.createServer() }))
expectAssignable<FastifyInstance>(fastify({ caseSensitive: true }))
expectAssignable<FastifyInstance>(fastify({ requestIdHeader: 'request-id' }))
expectAssignable<FastifyInstance>(fastify({ genReqId: () => 'request-id' }))
expectAssignable<FastifyInstance>(fastify({ trustProxy: true }))
expectAssignable<FastifyInstance>(fastify({ querystringParser: () => ({ foo: 'bar' }) }))
expectAssignable<FastifyInstance>(fastify({ querystringParser: () => ({ foo: { bar: 'fuzz' } }) }))
expectAssignable<FastifyInstance>(fastify({ querystringParser: () => ({ foo: ['bar', 'fuzz'] }) }))
expectAssignable<FastifyInstance>(fastify({
  versioning: {
    storage: () => ({
      get: () => 'foo',
      set: () => { },
      del: () => { },
      empty: () => { }
    }),
    deriveVersion: () => 'foo'
  }
}))
expectAssignable<FastifyInstance>(fastify({ constraints: {} }))
expectAssignable<FastifyInstance>(fastify({
  constraints: {
    version: {
      name: 'version',
      storage: () => ({
        get: () => () => {},
        set: () => { },
        del: () => { },
        empty: () => { }
      }),
      validate () {},
      deriveConstraint: () => 'foo'
    },
    host: {
      name: 'host',
      storage: () => ({
        get: () => () => {},
        set: () => { },
        del: () => { },
        empty: () => { }
      }),
      validate () {},
      deriveConstraint: () => 'foo'
    },
    withObjectValue: {
      name: 'withObjectValue',
      storage: () => ({
        get: () => () => {},
        set: () => { },
        del: () => { },
        empty: () => { }
      }),
      validate () {},
      deriveConstraint: () => {}

    }
  }
}))
expectAssignable<FastifyInstance>(fastify({ return503OnClosing: true }))
expectAssignable<FastifyInstance>(fastify({
  ajv: {
    customOptions: {
      removeAdditional: 'all'
    },
    plugins: [() => { }]
  }
}))
expectAssignable<FastifyInstance>(fastify({ frameworkErrors: () => { } }))
expectAssignable<FastifyInstance>(fastify({
  rewriteUrl: (req) => req.url === '/hi' ? '/hello' : req.url!
}))
expectAssignable<FastifyInstance>(fastify({ schemaErrorFormatter: (errors, dataVar) => new Error() }))
expectAssignable<FastifyInstance>(fastify({
  clientErrorHandler: (err, socket) => {
    expectType<ConnectionError>(err)
    expectType<Socket>(socket)
  }
}))

// Thenable
expectAssignable<PromiseLike<FastifyInstance>>(fastify({ return503OnClosing: true }))
fastify().then(fastifyInstance => expectAssignable<FastifyInstance>(fastifyInstance))

expectAssignable<FastifyPluginAsync>(async () => {})
expectAssignable<FastifyPluginCallback>(() => {})
expectAssignable<FastifyPlugin>(() => {})
