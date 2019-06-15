'use strict'

const { kRegister, kPluginMetadata } = require('./symbols')
const kPluginMeta = Symbol.for('plugin-meta')
const kSkipOverride = Symbol.for('skip-override')
const kDisplayName = Symbol.for('fastify.display-name')

function register (plugin, options) {
  const metadata = plugin[kPluginMetadata]
  if (metadata) {
    const classBasedPlugin = createPlugin(plugin, metadata)
    return this[kRegister](classBasedPlugin, options)
  }
  return this[kRegister](plugin, options)
}

function createPlugin (plugin, metadata) {
  function classBasedPlugin (instance, opts, next) {
    plugin.instance = instance
    for (const definition of metadata) {
      switch (definition.type) {
        case 'route':
          definition.options.handler = definition.options.handler.bind(plugin)
          instance.route(definition.options)
          break
        case 'hook':
          definition.handler = definition.handler.bind(plugin)
          instance.addHook(definition.name, definition.handler)
          break
        case 'decorateInstance':
          instance.decorate(definition.name, plugin[definition.value])
          break
        case 'decorateRequest':
        case 'decorateReply':
          if (definition.isFunction) {
            instance[definition.type](definition.name, plugin[definition.value].bind(plugin)())
          } else {
            instance[definition.type](definition.name, plugin[definition.value])
          }
          break
      }
    }
    next()
  }

  copyPluginSymbols(classBasedPlugin, plugin)
  return classBasedPlugin
}

function copyPluginSymbols (classBasedPlugin, plugin) {
  classBasedPlugin[kSkipOverride] = plugin[kSkipOverride]
  classBasedPlugin[kDisplayName] = plugin[kDisplayName]
  classBasedPlugin[kPluginMeta] = plugin[kPluginMeta]
}

module.exports = {
  register
}
