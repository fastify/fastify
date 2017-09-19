
// This file will be passed to the TypeScript CLI to verify our typings compile

import * as fastify from '../../fastify'
import * as cors from 'cors'
import * as http from 'http';
import { createReadStream, readFile } from 'fs'

const server: fastify.FastifyInstance = fastify()

// Third party middleware
server.use(cors())

// Custom middleware
server.use('/', (req, res, next) => {  
  console.log(`${req.method} ${req.url}`);
})


/**
 * Test various hooks and different signatures
 */
server.addHook('preHandler', (req: fastify.FastifyRequest, reply: fastify.FastifyReply, next) => {
  if (req.body.error) {
    next(new Error('testing if middleware errors can be passed'));
  } else {
    reply.code(200).send('ok');
  }
})

server.addHook('onRequest', (req: http.IncomingMessage, res: http.OutgoingMessage, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
})

server.addHook('onResponse', (res, next) => {
  setTimeout(function() {
    console.log('response is finished after 100ms?', res.finished);
    next();
  }, 100);
})

server.addHook('onClose', (instance: fastify.FastifyInstance, done) => {
  done();
})

const opts: fastify.RouteShorthandOptions = {
  schema: {
    response: {
      '200': {
        type: 'object',
        properties: {
          hello: {
            type: 'string'
          }
        }
      }
    }
  }
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
      req.log.info(`before handler for "${req.req.url}"`);
      done();
    }
  })
  .get('/', opts, function (req, reply) {
    reply.header('Content-Type', 'application/json').code(200)
    reply.send({ hello: 'world' })
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
    reply.send({ hello: 'world' })
  })
  .head('/', {}, function (req, reply) {
    reply.send()
  })
  .delete('/', opts, function (req, reply) {
    reply.send({ hello: 'world' })
  })
  .patch('/:id', opts, function (req, reply) {
    req.log.info(`incoming id is ${req.params.id}`);

    reply.send({ hello: 'world' })
  })
  .route({
    method: ['GET', 'POST', 'PUT'],
    url: '/route'
  })


// Using decorate requires casting so the compiler knows about new properties
server.decorate('utility', () => {})

// Define a decorated instance
interface DecoratedInstance extends fastify.FastifyInstance {
  utility: () => void
}

// Use the custom decorator. Could also do "let f = server as DecoratedInstance"
(server as DecoratedInstance).utility();

// Decorating a request or reply works in much the same way as decorate
interface DecoratedRequest extends fastify.FastifyRequest {
  utility: () => void
}

interface DecoratedReply extends fastify.FastifyReply {
  utility: () => void
}

server.get('/test-decorated-inputs', (req, reply) => {
  (req as DecoratedRequest).utility();
  (reply as DecoratedReply).utility();
});

server.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${server.server.address().port}`)
})
