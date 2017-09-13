'use strict'

const fastJsonStringify = require('fast-json-stringify')
const Ajv = require('ajv')
const ajv = new Ajv({ coerceTypes: true })

const bodySchema = Symbol('body-schema')
const querystringSchema = Symbol('querystring-schema')
const paramsSchema = Symbol('params-schema')
const responseSchema = Symbol('response-schema')

const schemas = require('./schemas.json')
const inputSchemaError = fastJsonStringify(schemas.inputSchemaError)

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

function build (opts, compile) {
  if (!opts.schema) {
    return
  }

  if (opts.schema.response) {
    opts[responseSchema] = getResponseSchema(opts.schema.response)
  }

  if (opts.schema.body) {
    opts[bodySchema] = compile(opts.schema.body)
  }

  if (opts.schema.querystring) {
    // querystring will always be an object, allow schema def to skip this
    if (!opts.schema.querystring.type || !opts.schema.querystring.properties) {
      opts.schema.querystring = {
        type: 'object',
        properties: opts.schema.querystring
      }
    }

    opts[querystringSchema] = compile(opts.schema.querystring)
  }

  if (opts.schema.params) {
    opts[paramsSchema] = compile(opts.schema.params)
  }
}

function validate (store, request) {
  var ret

  ret = store[paramsSchema] && store[paramsSchema](request.params)
  // ajv interface
  if (ret === false) return inputSchemaError(store[paramsSchema].errors)
  // Joi like interface
  if (ret && ret.error instanceof Error) return ret.error
  if (ret && ret.value) request.params = ret.value

  ret = store[bodySchema] && store[bodySchema](request.body)
  // ajv interface
  if (ret === false) return inputSchemaError(store[bodySchema].errors)
  // Joi like interface
  if (ret && ret.error instanceof Error) return ret.error
  if (ret && ret.value) request.body = ret.value

  ret = store[querystringSchema] && store[querystringSchema](request.query)
  // ajv interface
  if (ret === false) return inputSchemaError(store[bodySchema].errors)
  // Joi like interface
  if (ret && ret.error instanceof Error) return ret.error
  if (ret && ret.value) request.query = ret.query

  return true
}

function serialize (handle, data, statusCode) {
  var responseSchemaDef = handle[responseSchema]
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

function schemaCompiler (schema) {
  return ajv.compile(schema)
}

module.exports = { build, validate, serialize, isValidLogger, schemaCompiler }
module.exports.symbols = { bodySchema, querystringSchema, responseSchema, paramsSchema }
