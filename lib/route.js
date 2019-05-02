// @ts-check

'use strict'

const FindMyWay = require('find-my-way')
const Context = require('./context')
const supportedMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS']
const validation = require('./validation')
const buildSchema = validation.build
const { buildSchemaCompiler } = validation
const { beforeHandlerWarning } = require('./warnings')

const {
  kRoutePrefix,
  kLogLevel,
  kHooks,
  kSchemas,
  kSchemaCompiler,
  kContentTypeParser,
  kReply,
  kRequest,
  kMiddlewares,
  kGlobalHooks
} = require('./symbols.js')

module.exports = function buildRouting (options) {
  const router = FindMyWay(options.config)

  return router
}
