import { expectError, expectType } from 'tsd'
import { createPlugin } from 'fastify-plugin'
import fastify from '../../fastify'

export const plugin1 = createPlugin((instance) =>
  instance
    .decorateReply('testPropSync')
    .decorateReply('testValueSync', 'testValue')
    .decorateReply('testFnSync', () => 12345))

export const plugin2 = createPlugin((instance) =>
  instance
    .decorateRequest('testPropSync')
    .decorateRequest('testValueSync', 'testValue')
    .decorateRequest('testFnSync', () => 12345))

export const plugin3 = createPlugin((instance) =>
  instance
    .decorate('testPropSync')
    .decorate('testValueSync', 'testValue')
    .decorate('testFnSync', () => 12345))

export const pluginWithDependencies = createPlugin((instance) => {
  expectType<void>(instance.testPropSync)
  expectType<string>(instance.testValueSync)
  expectType<number>(instance.testFnSync())

  instance.register(childInstance => {
    expectType<void>(childInstance.testPropSync)
    expectType<string>(childInstance.testValueSync)
    expectType<number>(childInstance.testFnSync())
  })

  return instance.get('/', (req, res) => {
    expectType<void>(req.testPropSync)
    expectType<string>(req.testValueSync)
    expectType<number>(req.testFnSync())

    expectType<void>(res.testPropSync)
    expectType<string>(res.testValueSync)
    expectType<number>(res.testFnSync())
  })
}, { dependencies: [plugin1, plugin2, plugin3] })

// missing dependencies
expectError(fastify().register(pluginWithDependencies))
expectError(fastify().register(plugin1).register(pluginWithDependencies))
expectError(fastify().register(plugin2).register(pluginWithDependencies))
expectError(fastify().register(plugin3).register(pluginWithDependencies))

fastify()
  .register(plugin1)
  .register(plugin2)
  .register(plugin3)
  .register(pluginWithDependencies)

const deepPluginDependency = createPlugin((instance) =>
  instance
    .decorateReply('deep_dependency_reply', true))

const pluginDependecy = createPlugin((instance) => {
  return instance
    .decorateRequest('dependency_request', true)
}, { dependencies: [deepPluginDependency] })

const dependantPlugin = createPlugin((instance) => {
  return instance.get('/', (req, res) => {
    expectType<boolean>(req.dependency_request)
    expectType<boolean>(res.deep_dependency_reply)
  })
}, { dependencies: [pluginDependecy] })

expectError(fastify().register(dependantPlugin))
expectError(fastify().register(pluginDependecy).register(dependantPlugin))
expectError(fastify().register(deepPluginDependency).register(dependantPlugin))

fastify()
  .register(deepPluginDependency)
  .register(pluginDependecy)
  .register(dependantPlugin)

// putting it all together, in random order
fastify()
  .register(deepPluginDependency)
  .register(plugin1)
  .register(plugin2)
  .register(pluginDependecy)
  .register(dependantPlugin)
  .register(plugin3)
  .register(pluginWithDependencies)
