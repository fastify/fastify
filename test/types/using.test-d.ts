import { expectAssignable } from 'tsd'
import fastify, { FastifyInstance } from '../../fastify'

async function hasSymbolDisposeWithUsing () {
  await using app = fastify()
  expectAssignable<FastifyInstance>(app)
  expectAssignable<typeof app.close>(app[Symbol.dispose])
}

async function hasSymbolDispose () {
  const app = fastify()
  expectAssignable<FastifyInstance>(app)
  expectAssignable<typeof app.close>(app[Symbol.dispose])
}
