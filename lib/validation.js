'use strict'

const fastJsonStringify = require('fast-json-stringify')
const fastSafeStringify = require('fast-safe-stringify')
const Ajv = require('ajv')
const ajv = new Ajv({ coerceTypes: true })

const payloadSchema = Symbol('payload-schema')
const querystringSchema = Symbol('querystring-schema')
const outputSchema = Symbol('output-schema')
const paramsSchema = Symbol('params-scehma')

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

  if (opts.schema.payload) {
    opts[payloadSchema] = ajv.compile(opts.schema.payload)
  }

  if (opts.schema.querystring) {
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

  if (handle[payloadSchema] && !handle[payloadSchema](body)) {
    return inputSchemaError(handle[payloadSchema].errors)
  }

  if (handle[querystringSchema] && !handle[querystringSchema](query)) {
    return inputSchemaError(handle[querystringSchema].errors)
  }
  return true
}

function serialize (handle, data) {
  return handle[outputSchema](data)
}

module.exports = { build, validate, serialize }
