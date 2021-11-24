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
  kPluginNameChain
} = require('./symbols.js')

const Reply = require('./reply')
const Request = require('./request')
const SchemaController = require('./schema-controller')
const ContentTypeParser = require('./contentTypeParser')
const { buildHooks } = require('./hooks')
const pluginUtils = require('./pluginUtils')

// Function that runs the encapsulation magic.
// Everything that need to be encapsulated must be handled in this function.
module.exports = function override (old, fn, opts) {
  const shouldSkipOverride = pluginUtils.registerPlugin.call(old, fn)

  if (shouldSkipOverride) {
    // after every plugin registration we will enter a new name
    old[kPluginNameChain].push(pluginUtils.getDisplayName(fn))
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
  instance[pluginUtils.registeredPlugins] = Object.create(instance[pluginUtils.registeredPlugins])
  instance[kPluginNameChain] = [pluginUtils.getPluginName(fn) || pluginUtils.getFuncPreview(fn)]

  if (instance[kLogSerializers] || opts.logSerializers) {
    instance[kLogSerializers] = Object.assign(Object.create(instance[kLogSerializers]), opts.logSerializers)
  }

  if (opts.prefix) {
    instance[kFourOhFour].arrange404(instance)
  }

  for (const hook of instance[kHooks].onRegister) hook.call(this, instance, opts)

  return instance
}

function buildRoutePrefix (instancePrefix, pluginPrefix) {
  if (!pluginPrefix) {
    return instancePrefix
  }

  // Ensure that there is a '/' between the prefixes
  if (instancePrefix.endsWith('/') && pluginPrefix[0] === '/') {
    // Remove the extra '/' to avoid: '/first//second'
    pluginPrefix = pluginPrefix.slice(1)
  } else if (pluginPrefix[0] !== '/') {
    pluginPrefix = '/' + pluginPrefix
  }

  return instancePrefix + pluginPrefix
}
