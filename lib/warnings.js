'use strict'

module.exports.beforeHandlerWarning = function beforeHandlerWarning () {
  if (beforeHandlerWarning.called) return
  beforeHandlerWarning.called = true
  process.emitWarning('The route option `beforeHandler` has been deprecated, use `preHandler` instead')
}
