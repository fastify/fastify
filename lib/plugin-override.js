'use strict'

const {
  kAvvioBoot,
  kChildren,
  kRoutePrefix,
  kLogLevel,
  kLogSerializers,
  kHooks,
  kSchemaController,
  kContentTypeParser,
  kReply,
  kRequest,
  kFourOhFour,
  kPluginNameChain,
  kErrorHandlerAlreadySet
} = require('./symbols.js')

const Reply = require('./reply')
const Request = require('./request')
const SchemaController = require('./schema-controller')
const ContentTypeParser = require('./content-type-parser.js')
const { buildHooks } = require('./hooks')
const pluginUtils = require('./plugin-utils.js')

module.exports = function override (old, fn, opts) {
  const shouldSkipOverride = pluginUtils.registerPlugin.call(old, fn)

  const fnName = pluginUtils.getPluginName(fn) || pluginUtils.getFuncPreview(fn)
  if (shouldSkipOverride) {
    old[kPluginNameChain].push(fnName)
    return old
  }

  const instance = Object.create(old)
  old[kChildren].push(instance)
  instance.ready = old[kAvvioBoot].bind(instance)
  instance[kChildren] = []

  instance[kReply] = Reply.buildReply(instance[kReply])
  instance[kRequest] = Request.buildRequest(instance[kRequest])

  instance[kContentTypeParser] = ContentTypeParser.helpers.buildContentTypeParser(instance[kContentTypeParser])
  instance[kHooks] = buildHooks(instance[kHooks])
  instance[kRoutePrefix] = buildRoutePrefix(instance[kRoutePrefix], opts.prefix)
  instance[kLogLevel] = opts.logLevel || instance[kLogLevel]
  instance[kSchemaController] = SchemaController.buildSchemaController(old[kSchemaController])
  instance.getSchema = instance[kSchemaController].getSchema.bind(instance[kSchemaController])
  instance.getSchemas = instance[kSchemaController].getSchemas.bind(instance[kSchemaController])

  instance[pluginUtils.kRegisteredPlugins] = Object.create(instance[pluginUtils.kRegisteredPlugins])
  instance[kPluginNameChain] = [fnName]
  instance[kErrorHandlerAlreadySet] = false

  if (instance[kLogSerializers] || opts.logSerializers) {
    instance[kLogSerializers] = Object.assign(Object.create(instance[kLogSerializers]), opts.logSerializers)
  }

  if (opts.prefix) {
    instance[kFourOhFour].arrange404(instance)
  }

  for (const hook of instance[kHooks].onRegister) {
    if (hook.useObjectSignature === true) {
      // Execute the new object-based pattern
      hook.call(old, { instance, options: opts })
    } else {
      // Execute the original, trusted Fastify logic exactly as it was
      hook.call(old, instance, opts)
    }
  }
  return instance
}

function buildRoutePrefix (instancePrefix, pluginPrefix) {
  if (!pluginPrefix) return instancePrefix
  if (instancePrefix.endsWith('/') && pluginPrefix[0] === '/') {
    pluginPrefix = pluginPrefix.slice(1)
  } else if (pluginPrefix[0] !== '/' && !instancePrefix.endsWith('/')) {
    // Add the missing '/' to avoid: '/firstsecond'
    pluginPrefix = '/' + pluginPrefix
  }
  return instancePrefix + pluginPrefix
}
