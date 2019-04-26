/**
 * There is some conflict with the Custom things. If the fakeMethod is optional then the http.createServer works and the the request handler fails. If it is non-optional then the http.createServer fails and the request handlers works-ish.
 */
// import fastify, {FastifyServerFactory} from '../../fastify'
// import * as http from 'http'
// import {expectType, } from 'tsd'

// // Custom Server
// type CustomType = void;
// interface CustomIncomingMessage extends http.IncomingMessage {
//   fakeMethod: () => CustomType;
// }
// interface CustomServerResponse extends http.ServerResponse {
//   fakeMethod: () => CustomType;
// }

// const serverFactory: FastifyServerFactory<http.Server> = (handler, opts) => {
//   const server = http.createServer((req: CustomIncomingMessage, res: CustomServerResponse) => {
//     req.fakeMethod = () => {}
//     res.fakeMethod = () => {}

//     handler(req, res)
//   })

//   return server
// }

// const customServer = fastify<http.Server, CustomIncomingMessage, CustomServerResponse>({ serverFactory })
// customServer.get('/', function (request, reply) {
//   console.log(request.raw)
//   request.fakeMethod()
//   expectType<CustomType>(request.fakeMethod()) // currently failling: `Cannot invoke an object which is possibly undefined.`
//   expectType<CustomType>(reply.fakeMethod()) // currently failling: `Cannot invoke an object which is possibly undefined.`
// })