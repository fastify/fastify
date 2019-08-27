import fastify, { FastifyPlugin } from '../../fastify'
import { expectType, expectError } from 'tsd'

// FastifyPlugin & FastifyRegister
const plugin: FastifyPlugin<{
  option1: string;
  option2: boolean;
}> = function (instance, opts, next) { }
expectError(fastify().register(plugin, {})) // error because missing required options from generic declaration
expectType<void>(fastify().register(plugin, { option1: '', option2: true }))

expectType<void>(fastify().register(function (instace, opts, next) {}))
expectType<void>(fastify().register(function (instace, opts, next) {}, () => {}))
expectType<void>(fastify().register(function (instance, opts, next) {}, { logLevel: 'info', prefix: 'foobar' }))
expectError(fastify().register(function (instance, opts, next) {}, { logLevel: '' })) // must use a valid logLevel
