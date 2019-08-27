import fastify, { FastifyServerFactory } from '../../fastify'
import * as http from 'http'
import { expectType } from 'tsd'

// Custom Server
type CustomType = void;
interface CustomIncomingMessage extends http.IncomingMessage {
  fakeMethod?: () => CustomType;
}

interface CustomServerResponse extends http.ServerResponse {
  fakeMethod?: () => CustomType;

}

const serverFactory: FastifyServerFactory<http.Server> = (handler, opts) => {
  const server = http.createServer((req: CustomIncomingMessage, res: CustomServerResponse) => {
    req.fakeMethod = () => {}
    res.fakeMethod = () => {}

    handler(req, res)
  })

  return server
}

// The request and reply objects should have the fakeMethods available (even though they may be undefined)
const customServer = fastify<http.Server, CustomIncomingMessage, CustomServerResponse>({ serverFactory })

customServer.get('/', function (request, reply) {
  if (request.fakeMethod) {
    expectType<CustomType>(request.fakeMethod())
  }

  if (reply.fakeMethod) {
    expectType<CustomType>(reply.fakeMethod())
  }
})
