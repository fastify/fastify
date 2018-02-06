'use strict'

const fastJsonStringify = require('fast-json-stringify')
const Ajv = require('ajv')

const bodySchema = Symbol('body-schema')
const querystringSchema = Symbol('querystring-schema')
const paramsSchema = Symbol('params-schema')
const responseSchema = Symbol('response-schema')
const headersSchema = Symbol('headers-schema')

function getValidatorForStatusCodeSchema (statusCodeDefinition) {
  return fastJsonStringify(statusCodeDefinition)
}

function getResponseSchema (responseSchemaDefinition) {
  var statusCodes = Object.keys(responseSchemaDefinition)
  return statusCodes.reduce(function (r, statusCode) {
    r[statusCode] = getValidatorForStatusCodeSchema(responseSchemaDefinition[statusCode])
    return r
  }, {})
}

function build (context, compile, schemas) {
  if (!context.schema) {
    return
  }

  context.schema = schemas.resolveRefs(context.schema)

  if (context.schema.headers) {
    context[headersSchema] = compile(context.schema.headers)
  }

  if (context.schema.response) {
    context[responseSchema] = getResponseSchema(context.schema.response)
  }

  if (context.schema.body) {
    context[bodySchema] = compile(context.schema.body)
  }

  if (context.schema.querystring) {
    context[querystringSchema] = compile(context.schema.querystring)
  }

  if (context.schema.params) {
    context[paramsSchema] = compile(context.schema.params)
  }
}

function validateParam (validatorFunction, request, paramName) {
  var ret = validatorFunction && validatorFunction(request[paramName])
  if (ret === false) return validatorFunction.errors
  if (ret && ret.error) return ret.error
  if (ret && ret.value) request[paramName] = ret.value
  return false
}

function validate (context, request) {
  return validateParam(context[paramsSchema], request, 'params') ||
    validateParam(context[bodySchema], request, 'body') ||
    validateParam(context[querystringSchema], request, 'query') ||
    validateParam(context[headersSchema], request, 'headers') ||
    true
}

function serialize (context, data, statusCode) {
  var responseSchemaDef = context[responseSchema]
  if (!responseSchemaDef) {
    return JSON.stringify(data)
  }
  if (responseSchemaDef[statusCode]) {
    return responseSchemaDef[statusCode](data)
  }
  var fallbackStatusCode = (statusCode + '')[0] + 'xx'
  if (responseSchemaDef[fallbackStatusCode]) {
    return responseSchemaDef[fallbackStatusCode](data)
  }
  return JSON.stringify(data)
}

function isValidLogger (logger) {
  if (!logger) {
    return false
  }

  var result = true
  const methods = ['info', 'error', 'debug', 'fatal', 'warn', 'trace', 'child']
  for (var i = 0; i < methods.length; i += 1) {
    if (!logger[methods[i]] || typeof logger[methods[i]] !== 'function') {
      result = false
      break
    }
  }
  return result
}

function buildSchemaCompiler () {
  // This instance of Ajv is private
  // it should not be customized or used
  const ajv = new Ajv({
    coerceTypes: true,
    useDefaults: true,
    removeAdditional: true
  })

  return ajv.compile.bind(ajv)
}

module.exports = { build, validate, serialize, isValidLogger, buildSchemaCompiler }
module.exports.symbols = { bodySchema, querystringSchema, responseSchema, paramsSchema, headersSchema }
