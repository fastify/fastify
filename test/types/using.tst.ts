import { expect, test } from 'tstyche'
import fastify, { FastifyInstance } from '../../fastify.js'

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

test("addHook('onClose') accepts AsyncDisposable", () => {
  const app = fastify()

  const asyncDisposable: AsyncDisposable = {
    async [Symbol.asyncDispose] () {}
  }

  expect(app.addHook('onClose', asyncDisposable)).type.toBeAssignableTo<FastifyInstance>()
})

test("addHook('onClose') accepts Disposable", () => {
  const app = fastify()

  const syncDisposable: Disposable = {
    [Symbol.dispose] () {}
  }

  expect(app.addHook('onClose', syncDisposable)).type.toBeAssignableTo<FastifyInstance>()
})
