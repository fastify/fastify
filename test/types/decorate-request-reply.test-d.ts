import { expect } from 'tstyche'
import fastify from '../../fastify.js'

type TestType = void

declare module '../../fastify.js' {
  interface FastifyRequest {
    testProp: TestType
  }
  interface FastifyReply {
    testProp: TestType
  }
}

fastify().get('/', (req, res) => {
  expect(req.testProp).type.toBe<TestType>()
  expect(res.testProp).type.toBe<TestType>()
})
