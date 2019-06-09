'use strict'

const { kPluginMetadata } = require('./symbols')

function createMethodDecorator (method) {
  return function getMethodDecorator (url, options) {
    return function methodDecorator (target, propertyKey, descriptor) {
      const metadata = target[kPluginMetadata] || []
      const handler = target[propertyKey]
      const pluginOptions = {
        options: { method, handler, url },
        type: 'route'
      }
      if (options) {
        Object.assign(pluginOptions.options, options)
      }
      metadata.push(pluginOptions)
      target[kPluginMetadata] = metadata
    }
  }
}

function getHookDecorator (name) {
  return function hookDecorator (target, propertyKey, descriptor) {
    const metadata = target[kPluginMetadata] || []
    const handler = target[propertyKey]
    metadata.push({ name, handler, type: 'hook' })
    target[kPluginMetadata] = metadata
  }
}

function createDecorationDecorator (type) {
  return function getDecorationDecorator (options) {
    return function decorationDecorator (target, propertyKey) {
      const metadata = target[kPluginMetadata] || []

      const value = propertyKey
      const name = getName(options, propertyKey)
      const isFunction = typeof target[propertyKey] === 'function'

      metadata.push({ name, value, type, isFunction })
      target[kPluginMetadata] = metadata
    }
  }
}

function getName (options, propertyKey) {
  if (!options) {
    return propertyKey
  }
  return typeof options === 'string' ? options : options.name || propertyKey
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
  Hook: getHookDecorator,
  DecorateRequest: createDecorationDecorator('decorateRequest'),
  DecorateReply: createDecorationDecorator('decorateReply'),
  DecorateInstance: createDecorationDecorator('decorateInstance')
}
