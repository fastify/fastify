/* eslint no-unused-vars: 0 */
/* eslint no-undef: 0 */
// This file will be passed to the TypeScript CLI to verify our typings compile

import * as fastify from '../../fastify'
import * as http from 'http'
import * as http2 from 'http2'
import { readFileSync } from 'fs'

// were importing cors using require, which causes it to be an `any`. This is done because `cors` exports
// itself as an express.RequestHandler which is not compatible with the fastify TypeScript types
const cors = require('cors')

{
  // http
  const h1Server = fastify()
  // https
  const h1SecureServer = fastify({
    https: {
      cert: readFileSync('path/to/cert.pem'),
      key: readFileSync('path/to/key.pem')
    }
  })
  // http2
  const h2Server = fastify({ http2: true })
  // secure http2
  const h2SecureServer = fastify({
    http2: true,
    https: {
      cert: readFileSync('path/to/cert.pem'),
      key: readFileSync('path/to/key.pem')
    }
  })
  const h2AllowH1SecureServer = fastify({
    http2: true,
    https: {
      allowHTTP1: true,
      cert: readFileSync('path/to/cert.pem'),
      key: readFileSync('path/to/key.pem')
    }
  })
  // logger true
  const logAllServer = fastify({ logger: true })
  logAllServer.addHook('onRequest', (req, reply, next) => {
    console.log('can access req', req.headers)
    next()
  })

  logAllServer.addHook('preParsing', (req, reply, next) => {
    next()
  })

  logAllServer.addHook('preValidation', (req, reply, next) => {
    next()
  })

  logAllServer.addHook('preSerialization', async (req, reply, payload, next) => payload)

  // other simple options
  const otherServer = fastify({
    caseSensitive: false,
    ignoreTrailingSlash: true,
    bodyLimit: 1000,
    maxParamLength: 200,
    querystringParser: (str: string) => ({ str: str, strArray: [str] }),
    modifyCoreObjects: true,
    return503OnClosing: true
  })

  // custom types
  interface CustomIncomingMessage extends http.IncomingMessage {
    getDeviceType: () => string;
  }
  const customServer: fastify.FastifyInstance<http.Server, CustomIncomingMessage, http.ServerResponse> = fastify()
  customServer.use((req, res, next) => {
    console.log('can access props from CustomIncomingMessage', req.getDeviceType())
  })

  interface CustomHttp2IncomingMessage extends http2.Http2ServerRequest {
    getDeviceType: () => string;
  }

  const customHttp2Server: fastify.FastifyInstance<http2.Http2Server, CustomHttp2IncomingMessage, http2.Http2ServerResponse> = fastify()
  customHttp2Server.use((req, res, next) => {
    console.log('can access props from CustomIncomingMessage', req.getDeviceType())
  })
}

const server = fastify({
  https: {
    cert: readFileSync('path/to/cert.pem'),
    key: readFileSync('path/to/key.pem')
  },
  http2: true
})

// Third party middleware
server.use(cors())

// Custom middleware
server.use('/', (req, res, next) => {
  console.log(`${req.method} ${req.url}`)
})

// Third party plugin
// Also check if async functions are allowed to be passed to .register()
// https://github.com/fastify/fastify/pull/1841
// All function parameters should be inferrable and should not produce 'any'
const thirdPartyPlugin: fastify.Plugin<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse, {}> = (instance, options, callback) => {}
const thirdPartyPluginAsync: fastify.Plugin<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse, {}> = async (instance, options) => {}

server.register(thirdPartyPlugin)
server.register(thirdPartyPluginAsync)

// Custom plugin
server.register((instance, options, callback) => {})
server.register(async (instance, options) => {})

/**
 * Test various hooks and different signatures
 */
server.addHook('preHandler', function (req, reply, next) {
  this.log.debug('`this` is not `any`')
  if (req.body.error) {
    next(new Error('testing if middleware errors can be passed'))
  } else {
    // `stream` can be accessed correctly because `server` is an http2 server.
    console.log('req stream', req.req.stream)
    console.log('res stream', reply.res.stream)
    reply.code(200).send('ok')
  }
})

server.addHook('preHandler', async function (req, reply) {
  this.log.debug('`this` is not `any`')
  if (req.body.error) {
    throw new Error('testing if middleware errors can be passed')
  } else {
    // `stream` can be accessed correctly because `server` is an http2 server.
    console.log('req stream', req.req.stream)
    console.log('res stream', reply.res.stream)
    reply.code(200).send('ok')
  }
})

server.addHook('onRequest', function (req, reply, next) {
  this.log.debug('`this` is not `any`')
  console.log(`${req.raw.method} ${req.raw.url}`)
  next()
})

server.addHook('onResponse', function (req, reply, next) {
  this.log.debug('`this` is not `any`')
  this.log.debug({ code: reply.res.statusCode }, 'res has a statusCode')
  setTimeout(function () {
    console.log('response is finished after 100ms?', reply.res.finished)
    next()
  }, 100)
})

server.addHook('preSerialization', function (req, reply, payload, next) {
  this.log.debug('`this` is not `any`')
  console.log(`${req.req.method} ${req.req.url}`)
  next(undefined, payload)
})

server.addHook('onSend', function (req, reply, payload, next) {
  this.log.debug('`this` is not `any`')
  console.log(`${req.req.method} ${req.req.url}`)
  next()
})

server.addHook('onError', function (req, reply, error, next) {
  this.log.debug('`this` is not `any`')
  console.log(`${req.req.method} ${req.req.url}`)
  next()
})

server.addHook('onClose', (instance, done) => {
  done()
})

server.addHook('onRoute', (opts) => {
})

const schema: fastify.RouteSchema = {
  body: {
    type: 'object'
  },
  querystring: {
    type: 'object'
  },
  params: {
    type: 'object'
  },
  headers: {
    type: 'object'
  },
  response: {
    200: {
      type: 'object',
      properties: {
        hello: {
          type: 'string'
        }
      }
    },
    '2xx': {
      type: 'object',
      properties: {
        hello: {
          type: 'string'
        }
      }
    }
  }
}

const opts: fastify.RouteShorthandOptions<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse> = {
  schema,
  preValidation: [
    (request, reply, next) => {
      request.log.info(`pre validation for "${request.raw.url}" ${request.id}`)
      next()
    }
  ],
  preHandler: [
    (request, reply, next) => {
      request.log.info(`pre handler for "${request.raw.url}" ${request.id}`)
      next()
    }
  ],
  schemaCompiler: (schema: Object) => () => {},
  bodyLimit: 5000,
  logLevel: 'trace',
  config: { }
}
const optsWithHandler: fastify.RouteShorthandOptions<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse> = {
  ...opts,
  handler (req, reply) { reply.send({ hello: 'route' }) }
}

// Chaining and route definitions
server
  .route({
    method: 'GET',
    url: '/route',
    handler: (req, reply) => {
      reply.send({ hello: 'route' })
    },
    onRequest: (req, reply, done) => {
      req.log.info(`onRequest for "${req.req.url}" ${req.id}`)
      done()
    },
    preParsing: (req, reply, done) => {
      req.log.info(`preParsing for "${req.req.url}" ${req.id}`)
      done()
    },
    preValidation: (req, reply, done) => {
      req.log.info(`preValidation for "${req.req.url}" ${req.id}`)
      done()
    },
    preSerialization: (req, reply, done) => {
      req.log.info(`preSerialization for "${req.req.url}" ${req.id}`)
      done()
    },
    preHandler: (req, reply, done) => {
      req.log.info(`pre handler for "${req.req.url}" ${req.id}`)
      done()
    }
  })
  .get('/req', function (req, reply) {
    reply.send(req.headers)
  })
  .get<{ foo: number }>('/req', function ({ query, headers }, reply) {
    const foo: number = query.foo
    reply.send(headers)
  })
  .get('/', opts, function (req, reply) {
    reply.header('Content-Type', 'application/json').code(200)
    reply.send({ hello: 'world' })
  })
  .get('/optsWithHandler', optsWithHandler)
  .get('/status', function (req, reply) {
    reply.status(204).send()
  })
  .get('/promise', opts, function (req, reply) {
    const promise = new Promise(function (resolve, reject) {
      resolve({ hello: 'world' })
    })
    reply.header('content-type', 'application/json').code(200).send(promise)
  })
  .get('/return-promise', opts, function (req, reply) {
    const promise = new Promise(function (resolve, reject) {
      resolve({ hello: 'world' })
    })
    return promise
  })
  .get('/stream', function (req, reply) {
    const fs = require('fs')
    const stream = fs.createReadStream(process.cwd() + '/examples/plugin.js', 'utf8')
    reply.code(200).send(stream)
  })
  .get('/redirect', function (req, reply) {
    reply.redirect('/other')
    reply.redirect(301, '/something')
  })
  .post('/', opts, function (req, reply) {
    reply
      .headers({ 'Content-Type': 'application/json' })
      .send({ hello: 'world' })
  })
  .post('/optsWithHandler', optsWithHandler)
  .head('/', {}, function (req, reply) {
    reply.send()
  })
  .head('/optsWithHandler', optsWithHandler)
  .delete('/', opts, function (req, reply) {
    reply.send({ hello: 'world' })
  })
  .delete('/optsWithHandler', optsWithHandler)
  .patch('/:id', opts, function (req, reply) {
    req.log.info(`incoming id is ${req.params.id}`)

    reply.send({ hello: 'world' })
  })
  .patch('/optsWithHandler', optsWithHandler)
  .route({
    method: ['GET', 'POST', 'PUT'],
    url: '/multi-route',
    handler: function (req, reply) {
      reply.send({ hello: 'world' })
    }
  })
  .route({
    method: 'GET',
    url: '/with-config',
    config: { foo: 'bar' },
    handler: function (req, reply) {
      reply.send(reply.context.config)
    }
  })
  .register(function (instance, options, done) {
    instance.get('/route', opts, function (req, reply) {
      reply.send({ hello: 'world' })
    })
    done()
  }, { prefix: 'v1', hello: 'world', schema: 'any string' })
  .all('/all/no-opts', function (req, reply) {
    reply.send(req.headers)
  })
  .all('/all/with-opts', opts, function (req, reply) {
    reply.send(req.headers)
  })
  .all('/optsWithHandler', optsWithHandler)
  .route({
    method: 'GET',
    url: '/headers',
    preHandler: (_req, reply, done) => {
      reply.header('E-tag', 'xB6392T=')
      done()
    },
    handler: (req, reply) => {
      const lastModified = req.headers['last-modified']

      if (reply.hasHeader('E-tag') && lastModified === reply.getHeader('E-tag')) {
        reply.status(304).send()
        return
      }

      reply.status(200).send({ hello: 'world' })
    }
  })
  .register((instance, _opts, done) => {
    instance.setNotFoundHandler((req, reply) => {
      reply
        .status(404)
        .type('text/plain')
        .send('Route not found.')
    })
    done()
  })
  .get('/deprecatedpath/*', (req, reply) => {
    reply.callNotFound()
  })
  .get('/getResponseTime', function (req, reply) {
    const milliseconds : number = reply.getResponseTime()
    reply.send({ milliseconds })
  })

// Generics example
interface Query {
  foo: string
  bar: number
}

interface Params {
  foo: string
}

interface Headers {
  'X-Access-Token': string
}

interface Body {
  foo: {
    bar: {
      baz: number
    }
  }
}

// Query, Params, Headers, and Body can be provided as generics
server.get<Query, Params, Headers, Body>('/', ({ query, params, headers, body }, reply) => {
  const bar: number = query.bar
  const foo: string = params.foo
  const xAccessToken: string = headers['X-Access-Token']
  const baz: number = body.foo.bar.baz

  reply.send({ hello: 'world' })
})

// `this` points to FastifyInstance
server
  .get('/', function (req, res) {
    this.log.debug('`this` is not `any`')
  })
  .route({
    url: '/',
    method: 'GET',
    handler: function (req, res) {
      this.log.debug('`this` is not `any`')
    }
  })

// Default values are exported for each
server.get<fastify.DefaultQuery, Params>('/', ({ params }, reply) => {
  const foo: string = params.foo

  reply.send({ hello: 'world' })
})

// Using decorate requires casting so the compiler knows about new properties
server.decorate('utility', () => {})
server.hasDecorator('utility')
server.hasRequestDecorator('utility')
server.hasReplyDecorator('utility')

// Define a decorated instance
interface DecoratedInstance extends fastify.FastifyInstance<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse> {
  utility: () => void
}

// Use the custom decorator. Could also do "let f = server as DecoratedInstance"
(server as DecoratedInstance).utility()

// Decorating a request or reply works in much the same way as decorate
interface DecoratedRequest extends fastify.FastifyRequest<http2.Http2ServerRequest> {
  utility: () => void
}

interface DecoratedReply extends fastify.FastifyReply<http2.Http2ServerResponse> {
  utility: () => void
}

server.get('/test-decorated-inputs', (req, reply) => {
  (req as DecoratedRequest).utility();
  (reply as DecoratedReply).utility()
})

server.setNotFoundHandler((req, reply) => {
})

server.setErrorHandler((err, request, reply) => {
  if (err.statusCode) {
    reply.code(err.statusCode)
  }
  if (err.validation) {
    reply.send(err.validation)
  } else {
    reply.send(err)
  }
})

server.setReplySerializer((payload, statusCode) => {
  if (statusCode === 201) {
    return `Created ${payload}`
  }
  return JSON.stringify(payload)
})

server.listen(3000, err => {
  if (err) throw err
  const address = server.server.address()
  if (address && typeof address === 'object') {
    server.log.info(`server listening on ${address.port}`)
  } else {
    server.log.info(`server listening on ${address}`)
  }
})

server.listen(3000, '127.0.0.1', err => {
  if (err) throw err
})

server.listen(3000, '127.0.0.1', 511, err => {
  if (err) throw err
})

server.listen('/tmp/sock', err => {
  if (err) throw err
})

server.listen({
  port: 3000,
  host: '127.0.0.1',
  backlog: 511,
  exclusive: false,
  readableAll: false,
  writableAll: false,
  ipv6Only: false
}, err => {
  if (err) throw err
})

server.listen(3000)
  .then((address: string) => console.log(address))

server.listen(3000, '127.0.0.1')
  .then((address: string) => console.log(address))

server.listen(3000, '127.0.0.1', 511)
  .then((address: string) => console.log(address))

server.listen('/tmp/sock')
  .then((address: string) => console.log(address))

server.listen({
  port: 3000,
  host: '127.0.0.1',
  backlog: 511,
  exclusive: false,
  readableAll: false,
  writableAll: false,
  ipv6Only: false
}).then((address: string) => console.log(address))

// http injections
server.inject({ url: '/test' }, (err: Error, res: fastify.HTTPInjectResponse) => {
  server.log.debug(err)
  server.log.debug(res.payload)
})

server.inject({ url: '/testAgain' })
  .then((res: fastify.HTTPInjectResponse) => console.log(res.payload))

server.setSchemaCompiler(function (schema: object) {
  return () => true
})

server.setSchemaResolver(function (ref: string) {
  return {
    $id: ref,
    type: 'string'
  }
})

server.addSchema({})

server.addContentTypeParser('*', (req, done) => {
  done(null, {})
})

server.addContentTypeParser(['foo/bar'], (req, done) => {
  done(null, {})
})

server.addContentTypeParser('foo/bar', {}, (req, done) => {
  done(null, {})
})

server.addContentTypeParser(['foo/bar'], {}, (req, done) => {
  done(null, {})
})

server.addContentTypeParser('foo/bar', { bodyLimit: 20 }, (req, done) => {
  done(null, {})
})

server.addContentTypeParser('foo/bar', { parseAs: 'string' }, (req, body: string, done) => {
  done(null, {})
})

server.addContentTypeParser('foo/bar', { parseAs: 'buffer', bodyLimit: 20 }, (req, body: Buffer, done) => {
  done(null, {})
})

server.addContentTypeParser('foo/bar', async (req: http2.Http2ServerRequest) => [])

if (typeof server.hasContentTypeParser('foo/bar') !== 'boolean') {
  throw new Error('Invalid')
}

server.printRoutes()

server.ready(function (err) {
  if (err) throw err
})

server.ready(function (err: Error, done: Function) {
  done(err)
})

server.ready(function (err: Error, context: fastify.FastifyInstance<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse>, done: Function) {
  server.log.debug(context)
  done(err)
})

server.ready()
  .then((context) => {
    server.log.debug(context)
  })
  .catch((err) => {
    server.log.error(err)
  })

server.after(function (err) {
  if (err) throw err
})

server.after(function (err: Error, done: Function) {
  done(err)
})

server.after(function (err: Error, context: fastify.FastifyInstance<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse>, done: Function) {
  server.log.debug(context)
  done(err)
})

{
  const server: fastify.FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse> = fastify({
    logger: process.env.NODE_ENV === 'dev'
  })
}

server.log.debug('Should log debug message', [])
server.log.debug({ log: 'object' }, 'Should log debug message', [])
server.log.error('Should log error message', [])
server.log.error({ log: 'object' }, 'Should log error message', [])
server.log.fatal('Should log fatal message', [])
server.log.fatal({ log: 'object' }, 'Should log fatal message', [])
server.log.info('Should log info message', [])
server.log.info({ log: 'object' }, 'Should log info message', [])
server.log.trace('Should log trace message', [])
server.log.trace({ log: 'object' }, 'Should log trace message', [])
server.log.warn('Should log warn message', [])
server.log.warn({ log: 'object' }, 'Should log warn message', [])

const server2 = fastify()
server2.close().then(() => {})
const server3 = fastify()
server3.close(() => {})

{
  // tests generics default values
  const routeOptions: fastify.RouteOptions = {
    method: 'GET',
    url: '/',
    handler: function (req, reply) { reply.send({}) }
  }

  const genericHandler: fastify.RequestHandler = (req, reply) => { reply.send(reply) }

  const middleware: fastify.FastifyMiddleware = function middleware (req, reply, done) {
    this.addHook('onClose', function (instance, done) {
      done()
    })
    done()
  }
}

type TestReplyDecoration = (this: fastify.FastifyReply<http.ServerResponse>) => void

const server4 = fastify()
const testReplyDecoration: TestReplyDecoration = function () {
  console.log('can access request from reply decorator', this.request.id)
}
server4.decorateReply('test-request-accessible-from-reply', testReplyDecoration)

server4.get('/', (req, reply) => {
  reply.removeHeader('x-foo').removeHeader('x-bar').send({})
})
