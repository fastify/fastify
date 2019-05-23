'use strict'

const { kRegister, kPluginMetadata } = require('./symbols')
require('reflect-metadata')

function register (plugin, options) {
  const metadata = Reflect.getMetadata(kPluginMetadata, plugin)
  if (metadata) {
    return this[kRegister](createPlugin(metadata))
  }
  return this[kRegister](plugin, options)
}

function createPlugin (metadata) {
  return function classBasedPlugin (instance, opts, next) {
    for (const definition of metadata) {
      switch (definition.type) {
        case 'route':
          instance.route(definition.options)
          break
        case 'hook':
          instance.addHook(definition.name, definition.handler)
          break
      }
    }
    next()
  }
}

module.exports = {
  register

}
