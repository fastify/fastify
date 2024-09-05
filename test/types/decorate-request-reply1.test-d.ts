// import fastify from '../../fastify'
import { instance } from "./decorate-request-reply.test-d";
import { expectType } from 'tsd'

type TestType = void

export const instance = fastify()
  .decorate('testProp')
  .decorate('testValue', 'testValue')
  .decorate('testFn', () => 12345)
  .decorateRequest('testProp')
  .decorateRequest('testValue', 'testValue')
  .decorateRequest('testFn', () => 12345)
  .decorateReply('testProp')
  .decorateReply('testValue', 'testValue')
  .decorateReply('testFn', () => 12345)
  .get('/', (req, res) => {
    expectType<TestType>(req.testProp)
    expectType<string>(req.testValue)
    expectType<number>(req.testFn())

    expectType<TestType>(res.testProp)
    expectType<string>(res.testValue)
    expectType<number>(res.testFn())
  })
  .post('/', (req, res) => {
    expectType<TestType>(req.testProp)
    expectType<string>(req.testValue)
    expectType<number>(req.testFn())

    expectType<TestType>(res.testProp)
    expectType<string>(res.testValue)
    expectType<number>(res.testFn())
  })
  .patch('/', (req, res) => {
    expectType<TestType>(req.testProp)
    expectType<string>(req.testValue)
    expectType<number>(req.testFn())

    expectType<TestType>(res.testProp)
    expectType<string>(res.testValue)
    expectType<number>(res.testFn())
  })
  .delete('/', (req, res) => {
    expectType<TestType>(req.testProp)
    expectType<string>(req.testValue)
    expectType<number>(req.testFn())

    expectType<TestType>(res.testProp)
    expectType<string>(res.testValue)
    expectType<number>(res.testFn())
  })

expectType<void>(instance.testProp)
expectType<string>(instance.testValue)
expectType<number>(instance.testFn())
