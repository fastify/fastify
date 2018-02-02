
// This file will be passed to the TypeScript CLI to verify our typings compile

import * as fastify from '../../fastify'
import * as cors from 'cors'
import * as http from 'http';
import * as http2 from 'http2';
import { readFileSync } from 'fs'
import { createReadStream, readFile } from 'fs'

{
  // http
  const h1Server = fastify();
  // https
  const h1SecureServer = fastify({
    https: {
      cert: readFileSync('path/to/cert.pem'),
      key: readFileSync('path/to/key.pem')
    }
  });
  // http2
  const h2Server = fastify({http2: true});
  // secure http2
  const h2SecureServer = fastify({
    http2: true,
    https: {
      cert: readFileSync('path/to/cert.pem'),
      key: readFileSync('path/to/key.pem')
    }
  });
  //logger true
  const logAllServer = fastify({ logger: true });

  // custom types
  interface CustomIncomingMessage extends http.IncomingMessage {
    getDeviceType: () => string;
  }
  const customServer: fastify.FastifyInstance<http.Server, CustomIncomingMessage, http.ServerResponse> = fastify();
}

const server = fastify({
  https: {
    cert: readFileSync('path/to/cert.pem'),
    key: readFileSync('path/to/key.pem')
  },
  http2: true,
})

// Third party middleware
server.use(cors())

// Custom middleware
server.use('/', (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
})

/**
 * Test various hooks and different signatures
 */
server.addHook('preHandler', function(req, reply, next) {
  this.log.debug("`this` is not `any`");
  if (req.body.error) {
    next(new Error('testing if middleware errors can be passed'));
  } else {
    // `stream` can be accessed correctly because `server` is an http2 server.
    console.log('req stream', req.req.stream);
    console.log('res stream', reply.res.stream);
    reply.code(200).send('ok');
  }
})

server.addHook('onRequest', function(req, res, next) {
  this.log.debug("`this` is not `any`");
  console.log(`${req.method} ${req.url}`);
  next();
})

server.addHook('onResponse', function (res, next) {
  this.log.debug("`this` is not `any`");
  this.log.debug({ code: res.statusCode }, "res has a statusCode");
  setTimeout(function() {
    console.log('response is finished after 100ms?', res.finished);
    next();
  }, 100);
})

server.addHook('onSend', function(req, reply, payload, next) {
  this.log.debug("`this` is not `any`");
  console.log(`${req.req.method} ${req.req.url}`);
  next();
})

server.addHook('onClose', (instance, done) => {
  done();
})

const opts = {
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
      req.log.info(`before handler for "${req.req.url}" ${req.id}`);
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
    url: '/multi-route',
    handler: function (req, reply) {
      reply.send({ hello: 'world' })
    }
  })
  .register(function (instance, options, done) {
    instance.get('/route', opts, function (req, reply) {
      reply.send({ hello: 'world' })
    })
    done()
  }, { prefix: 'v1', hello: 'world' })


// Using decorate requires casting so the compiler knows about new properties
server.decorate('utility', () => {})

// Define a decorated instance
interface DecoratedInstance extends fastify.FastifyInstance<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse> {
  utility: () => void
}

// Use the custom decorator. Could also do "let f = server as DecoratedInstance"
(server as DecoratedInstance).utility();

// Decorating a request or reply works in much the same way as decorate
interface DecoratedRequest extends fastify.FastifyRequest<http2.Http2ServerRequest> {
  utility: () => void
}

interface DecoratedReply extends fastify.FastifyReply<http2.Http2ServerResponse> {
  utility: () => void
}

server.get('/test-decorated-inputs', (req, reply) => {
  (req as DecoratedRequest).utility();
  (reply as DecoratedReply).utility();
});

server.setNotFoundHandler((req, reply) => {
})

server.setErrorHandler((err, request, reply) => {
})

server.listen(3000, err => {
  if (err) throw err
  server.log.info(`server listening on ${server.server.address().port}`)
})

// http injections
server.inject({ url: "/test" }, (err: Error, res: fastify.HTTPInjectResponse) => {
  server.log.debug(err);
  server.log.debug(res.payload);
});

server.inject({ url: "/testAgain" })
  .then((res: fastify.HTTPInjectResponse) => console.log(res.payload));
