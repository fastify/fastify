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

function build (opts) {
  if (!opts.schema) {
    return
  }

  if (opts.schema.response) {
    opts[responseSchema] = getResponseSchema(opts.schema.response)
  }

  if (opts.schema.body) {
    opts[bodySchema] = ajv.compile(opts.schema.body)
  }

  if (opts.schema.querystring) {
    // querystring will always be an object, allow schema def to skip this
    if (!opts.schema.querystring.type || !opts.schema.querystring.properties) {
      opts.schema.querystring = {
        type: 'object',
        properties: opts.schema.querystring
      }
    }

    opts[querystringSchema] = ajv.compile(opts.schema.querystring)
  }

  if (opts.schema.params) {
    opts[paramsSchema] = ajv.compile(opts.schema.params)
  }
}

function validate (handle, params, body, query) {
  if (handle[paramsSchema] && !handle[paramsSchema](params)) {
    return inputSchemaError(handle[paramsSchema].errors)
  }

  if (handle[bodySchema] && !handle[bodySchema](body)) {
    return inputSchemaError(handle[bodySchema].errors)
  }

  if (handle[querystringSchema] && !handle[querystringSchema](query)) {
    return inputSchemaError(handle[querystringSchema].errors)
  }
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

module.exports = { build, validate, serialize, isValidLogger }
module.exports.symbols = { bodySchema, querystringSchema, responseSchema, paramsSchema }
