'use strict'

const fastJsonStringify = require('fast-json-stringify')
const fastSafeStringify = require('fast-safe-stringify')
const Ajv = require('ajv')
const ajv = new Ajv({ coerceTypes: true })

const bodySchema = Symbol('body-schema')
const querystringSchema = Symbol('querystring-schema')
const outputSchema = Symbol('output-schema')
const paramsSchema = Symbol('params-schema')

const schemas = require('./schemas.json')
const inputSchemaError = fastJsonStringify(schemas.inputSchemaError)

function build (opts) {
  if (!opts.schema) {
    opts[outputSchema] = fastSafeStringify
    return
  }

  if (opts.schema.out) {
    opts[outputSchema] = fastJsonStringify(opts.schema.out)
  } else {
    opts[outputSchema] = fastSafeStringify
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

function serialize (handle, data) {
  return handle[outputSchema](data)
}

function isValidLogger (logger) {
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
module.exports.symbols = { bodySchema, querystringSchema, outputSchema, paramsSchema }
