import { expect, test } from 'tstyche'
import fastify, { type FastifyInstance } from '../../fastify.js'

test("has 'Symbol.dispose' when declared with 'using'", async () => {
  await using app = fastify()
  expect(app).type.toBeAssignableTo<FastifyInstance>()
  expect(app[Symbol.asyncDispose]).type.toBe<() => Promise<undefined>>()
})

test("has 'Symbol.dispose'", async () => {
  await using app = fastify()
  expect(app).type.toBeAssignableTo<FastifyInstance>()
  expect(app[Symbol.asyncDispose]).type.toBe<() => Promise<undefined>>()
})
