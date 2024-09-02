import { expectType } from 'tsd'
import fastify from '../../fastify'

const syncWithDecorators = fastify().register(instance =>
  instance
    .decorate('testProp')
    .decorate('testValue', 'testValue')
    .decorate('testFn', () => 12345)
    .decorateRequest('testProp')
    .decorateRequest('testValue', 'testValue')
    .decorateRequest('testFn', () => 12345)
    .decorateReply('testProp')
    .decorateReply('testValue', 'testValue')
    .decorateReply('testFn', () => 12345)
)

syncWithDecorators.get('/', (req, res) => {
  expectType<void>(req.testProp)
  expectType<string>(req.testValue)
  expectType<number>(req.testFn())

  expectType<void>(res.testProp)
  expectType<string>(res.testValue)
  expectType<number>(res.testFn())
})

expectType<void>(syncWithDecorators.testProp)
expectType<string>(syncWithDecorators.testValue)
expectType<number>(syncWithDecorators.testFn())

const asyncWithDecorators = fastify().register(async (instance) =>
  instance.decorate('testProp')
    .decorate('testValue', 'testValue')
    .decorate('testFn', () => 12345)
    .decorateRequest('testProp')
    .decorateRequest('testValue', 'testValue')
    .decorateRequest('testFn', () => 12345)
    .decorateReply('testProp')
    .decorateReply('testValue', 'testValue')
    .decorateReply('testFn', () => 12345)
)

asyncWithDecorators.get('/', (req, res) => {
  expectType<void>(req.testProp)
  expectType<string>(req.testValue)
  expectType<number>(req.testFn())

  expectType<void>(res.testProp)
  expectType<string>(res.testValue)
  expectType<number>(res.testFn())
})

expectType<void>(asyncWithDecorators.testProp)
expectType<string>(asyncWithDecorators.testValue)
expectType<number>(asyncWithDecorators.testFn())

const multiplePlugins = fastify()
  .register(instance =>
    instance.decorate('instance1').decorateRequest('req1').decorateReply('res1')
  )
  .register(async (instance) =>
    instance.decorate('instance2').decorateRequest('req2').decorateReply('res2')
  )

multiplePlugins.get('/', (req, res) => {
  expectType<void>(req.req1)
  expectType<void>(req.req2)
  expectType<void>(res.res1)
  expectType<void>(res.res2)
})

expectType<void>(multiplePlugins.instance1)
expectType<void>(multiplePlugins.instance2)
