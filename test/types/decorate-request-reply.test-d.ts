import fastify from '../../fastify'
import { FastifyReplyMixin, FastifyRequestMixin } from '../../types/mixins'
import { expectType, expectError } from 'tsd'

type TestType = void

declare module '../../fastify' {
  interface FastifyRequestMixins {
    testRequestMixin: FastifyRequestMixin<'testRequestMixin', {
      testRequestMixinTestProp: TestType
    }>
  }
  interface FastifyReplyMixins {
    testReplyMixin: FastifyReplyMixin<'testReplyMixin', {
      testReplyMixinTestProp: TestType
    }>
  }
  interface FastifyRequest {
    testProp: TestType;
  }
  interface FastifyReply {
    testProp: TestType;
  }
}

fastify().get('/', (req, res) => {
  expectType<TestType>(req.testProp)
  expectType<TestType>(res.testProp)

  expectError(req.testRequestMixinTestProp)

  if (req.hasMixin('testRequestMixin')) {
    expectType<TestType>(req.testRequestMixinTestProp)
  }

  expectError(res.testReplyMixinTestProp)

  if (res.hasMixin('testReplyMixin')) {
    expectType<TestType>(res.testReplyMixinTestProp)
  }
})
