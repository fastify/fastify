import { expectAssignable, expectType } from 'tsd'
import fastify, { FastifyInstance, FastifyRequest, FastifyReply, FastifyBaseLogger } from '../../fastify'
import { FastifyWebNamespace, WebRouteHandler } from '../../types/web'

const server = fastify()

// Test that web namespace exists
expectType<FastifyWebNamespace>(server.web)

// Test web.get with handler only - with ctx parameter
expectAssignable<FastifyInstance>(
  server.web.get('/path', async (req, ctx) => {
    expectType<Request>(req)
    expectType<FastifyBaseLogger>(ctx.log)
    expectType<FastifyInstance>(ctx.server)
    return new Response('hello')
  })
)

// Test web.get with options and handler
expectAssignable<FastifyInstance>(
  server.web.get('/path', {
    logLevel: 'info'
  }, async (req, ctx) => {
    return new Response('hello')
  })
)

// Test web.post
expectAssignable<FastifyInstance>(
  server.web.post('/path', async (req, ctx) => {
    const body = await req.json()
    ctx.log.info('received body')
    return new Response(JSON.stringify(body))
  })
)

// Test web.put
expectAssignable<FastifyInstance>(
  server.web.put('/path', async (req, ctx) => {
    return new Response('updated')
  })
)

// Test web.delete
expectAssignable<FastifyInstance>(
  server.web.delete('/path', async (req, ctx) => {
    return new Response('deleted')
  })
)

// Test web.patch
expectAssignable<FastifyInstance>(
  server.web.patch('/path', async (req, ctx) => {
    return new Response('patched')
  })
)

// Test web.head
expectAssignable<FastifyInstance>(
  server.web.head('/path', async (req, ctx) => {
    return new Response(null)
  })
)

// Test web.options
expectAssignable<FastifyInstance>(
  server.web.options('/path', async (req, ctx) => {
    return new Response(null, { status: 204 })
  })
)

// Test web.trace
expectAssignable<FastifyInstance>(
  server.web.trace('/path', async (req, ctx) => {
    return new Response('trace')
  })
)

// Test WebRouteHandler type with ctx
const handler: WebRouteHandler = async function (req, ctx) {
  ctx.log.info('handling request')
  return new Response('hello')
}
expectAssignable<FastifyInstance>(server.web.get('/test', handler))

// Test this binding in handler (using regular function)
expectAssignable<FastifyInstance>(
  server.web.get('/this-test', async function (req, ctx) {
    // 'this' is bound to FastifyInstance
    expectType<FastifyInstance>(this)
    return new Response('ok')
  })
)

// Test with onRequest hook
expectAssignable<FastifyInstance>(
  server.web.get('/hooked', {
    onRequest: async (request: FastifyRequest, reply: FastifyReply) => {
      // Access FastifyRequest/Reply in hooks
    }
  }, async (req, ctx) => {
    return new Response('ok')
  })
)

// Test with onResponse hook
expectAssignable<FastifyInstance>(
  server.web.get('/hooked', {
    onResponse: async (request: FastifyRequest, reply: FastifyReply) => {
      // Access FastifyRequest/Reply in hooks
    }
  }, async (req, ctx) => {
    return new Response('ok')
  })
)

// Test chainability
expectAssignable<FastifyInstance>(
  server.web.get('/a', async (req, ctx) => new Response('a'))
    .web.get('/b', async (req, ctx) => new Response('b'))
    .web.post('/c', async (req, ctx) => new Response('c'))
)

// Test with constraints
expectAssignable<FastifyInstance>(
  server.web.get('/constrained', {
    constraints: { version: '1.0.0' }
  }, async (req, ctx) => {
    return new Response('v1')
  })
)

// Test within plugin registration
server.register(async (instance) => {
  expectAssignable<FastifyInstance>(
    instance.web.get('/scoped', async (req, ctx) => {
      // ctx.server should be the encapsulated instance
      expectType<FastifyInstance>(ctx.server)
      return new Response('scoped')
    })
  )
})

// Test ctx.server type
expectAssignable<FastifyInstance>(
  server.web.get('/server-test', async (req, ctx) => {
    // Can access server methods
    const schemas = ctx.server.getSchemas()
    return new Response(JSON.stringify(schemas))
  })
)
