import { expect } from 'tstyche'
import fastify, { type FastifyInstance } from '../../fastify.js'

async function hasSymbolDisposeWithUsing () {
  await using app = fastify()
  expect<FastifyInstance>().type.toBeAssignableFrom(app)
  expect<FastifyInstance[typeof Symbol.asyncDispose]>().type.toBeAssignableFrom(app.close)
}

async function hasSymbolDispose () {
  const app = fastify()
  expect<FastifyInstance>().type.toBeAssignableFrom(app)
  expect<FastifyInstance[typeof Symbol.asyncDispose]>().type.toBeAssignableFrom(app.close)
}

hasSymbolDisposeWithUsing()
hasSymbolDispose()
