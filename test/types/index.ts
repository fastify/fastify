
// This file will be passed to the TypeScript CLI to verify our typings compile

import * as fastify from '../../fastify'
import * as cors from 'cors'
import { createReadStream, readFile } from 'fs'

const server: fastify.FastifyInstance = fastify()

// Third party middleware
server.use(cors())

// Custom middlewares
server.use('/', (req, res, next) => {
  const im = req.req;
  
  req.log.info(`${im.method} ${im.url} - body ${req.body}, query ${req.query}`);
});

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
  .patch('/', opts, function (req, reply) {
    reply.send({ hello: 'world' })
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
