'use strict'

module.exports.beforeHandlerWarning = function beforeHandlerWarning () {
  if (beforeHandlerWarning.called) return
  beforeHandlerWarning.called = true
  process.emitWarning('The route option `beforeHandler` has been deprecated, use `preHandler` instead')
}

module.exports.pluginDecoratorsWarning = function pluginDecoratorsWarning () {
  if (pluginDecoratorsWarning.called) return
  pluginDecoratorsWarning.called = true
  process.emitWarning('The plugin decorators are experimental')
}
