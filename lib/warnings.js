'use strict'

module.exports.pluginDecoratorsWarning = function pluginDecoratorsWarning () {
  if (pluginDecoratorsWarning.called) return
  pluginDecoratorsWarning.called = true
  process.emitWarning('The plugin decorators are experimental')
}
