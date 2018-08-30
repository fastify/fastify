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
  // logger true
  const logAllServer = fastify({ logger: true })
  logAllServer.addHook('onRequest', (req, res, next) => {
    console.log('can access req', req.headers)
    next()
  })

  // other simple options
  const otherServer = fastify({
    ignoreTrailingSlash: true,
    bodyLimit: 1000,
    maxParamLength: 200
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

server.addHook('onRequest', function (req, res, next) {
  this.log.debug('`this` is not `any`')
  console.log(`${req.method} ${req.url}`)
  next()
})

server.addHook('onResponse', function (res, next) {
  this.log.debug('`this` is not `any`')
  this.log.debug({ code: res.statusCode }, 'res has a statusCode')
  setTimeout(function () {
    console.log('response is finished after 100ms?', res.finished)
    next()
  }, 100)
})

server.addHook('onSend', function (req, reply, payload, next) {
  this.log.debug('`this` is not `any`')
  console.log(`${req.req.method} ${req.req.url}`)
  next()
})

server.addHook('onClose', (instance, done) => {
  done()
})

server.addHook('onRoute', (opts) => {
})

const opts: fastify.RouteShorthandOptions<http2.Http2Server, http2.Http2ServerRequest, http2.Http2ServerResponse> = {
  schema: {
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
  },
  beforeHandler: [
    (request, reply, next) => {
      request.log.info(`before handler for "${request.raw.url}" ${request.id}`)
      next()
    }
  ],
  schemaCompiler: (schema: Object) => () => {},
  bodyLimit: 5000,
  logLevel: 'trace',
  config: { }
}

// Chaining and route definitions
server
  .route({
    method: 'GET',
    url: '/route',
    handler: (req, reply) => {
      reply.send({ hello: 'route' })
    },
    beforeHandler: (req, reply, done) => {
      req.log.info(`before handler for "${req.req.url}" ${req.id}`)
      done()
    }
  })
  .get('/req', function (req, reply) {
    reply.send(req.headers)
  })
  .get('/', opts, function (req, reply) {
    reply.header('Content-Type', 'application/json').code(200)
    reply.send({ hello: 'world' })
  })
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
  .post('/', opts, function (req, reply) {
    reply
      .headers({ 'Content-Type': 'application/json' })
      .send({ hello: 'world' })
  })
  .head('/', {}, function (req, reply) {
    reply.send()
  })
  .delete('/', opts, function (req, reply) {
    reply.send({ hello: 'world' })
  })
  .patch('/:id', opts, function (req, reply) {
    req.log.info(`incoming id is ${req.params.id}`)

    reply.send({ hello: 'world' })
  })
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
  }, { prefix: 'v1', hello: 'world' })
  .all('/all/no-opts', function (req, reply) {
    reply.send(req.headers)
  })
  .all('/all/with-opts', opts, function (req, reply) {
    reply.send(req.headers)
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
  reply.send(err)
})

server.listen(3000, err => {
  if (err) throw err
  const address = server.server.address()
  if (typeof address === 'object') {
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

server.listen(3000)
  .then((address: string) => console.log(address))

server.listen(3000, '127.0.0.1')
  .then((address: string) => console.log(address))

server.listen(3000, '127.0.0.1', 511)
  .then((address: string) => console.log(address))

server.listen('/tmp/sock')
  .then((address: string) => console.log(address))

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

server.addSchema({})

server.addContentTypeParser('foo/bar', {}, (req, done) => {
  done!(null, {})
})

server.addContentTypeParser('foo/bar', { parseAs: 'string' }, (req, done) => {
  done!(null, {})
})

server.addContentTypeParser('foo/bar', { bodyLimit: 20 }, (req, done) => {
  done!(null, {})
})

server.addContentTypeParser('foo/bar', {}, async (req: http2.Http2ServerRequest) => [])

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
