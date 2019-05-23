'use strict'

const { kPluginMetadata } = require('./symbols')
require('reflect-metadata')

function createMethodDecorator (method) {
  return function getMethodDecorator (url, options) {
    return function methodDecorator (target, propertyKey, descriptor) {
      const metadata = Reflect.getMetadata(kPluginMetadata, target) || []
      const handler = target[propertyKey].bind(target)
      const pluginOptions = {
        options: { method, handler, url },
        type: 'route'
      }
      if (options) {
        Object.assign(pluginOptions.options, options)
      }
      metadata.push(pluginOptions)
      Reflect.defineMetadata(kPluginMetadata, metadata, target)
    }
  }
}

function getHookDecorator (name) {
  return function hookDecorator (target, propertyKey, descriptor) {
    const metadata = Reflect.getMetadata(kPluginMetadata, target) || []
    const handler = target[propertyKey].bind(target)
    metadata.push({ name, handler, type: 'hook' })
    Reflect.defineMetadata(kPluginMetadata, metadata, target)
  }
}

module.exports = {
  Get: createMethodDecorator('GET'),
  Post: createMethodDecorator('POST'),
  Put: createMethodDecorator('PUT'),
  Delete: createMethodDecorator('DELETE'),
  Head: createMethodDecorator('HEAD'),
  Patch: createMethodDecorator('PATCH'),
  Options: createMethodDecorator('OPTIONS'),
  All: createMethodDecorator(
    ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS']
  ),
  Hook: getHookDecorator
}
