
/**
 * Most type annotations in this file are not strictly necessary but are
 * included for this example.
 *
 * To run this example execute the following commands to install typescript,
 * transpile the code, and start the server:
 *
 * npm i -g typescript
 * tsc examples/typescript-server.ts --target es6 --module commonjs
 * node examples/typescript-server.js
 */

import fastify from 'fastify'
import { createReadStream } from 'fs'
import path from 'path';
import { ServerResponse, IncomingMessage, Server} from 'http'
import { AddressInfo } from 'net';

const server: fastify.FastifyInstance<Server, IncomingMessage, ServerResponse> = fastify()

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
      }
    }
  }
}

server.get('/', opts, (req, reply) => {
  const stream = createReadStream(path.join(__dirname,'../../plugin.js'), 'utf8')
  reply.code(200).send(stream)
})
server.get('/stream', (req, reply) => {
  reply.header('Content-Type', 'application/json').code(200)
  reply.send({ hello: 'world' })
})

server.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${(server.server.address()as AddressInfo).port}`)
})
