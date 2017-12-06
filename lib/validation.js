'use strict'

const fastJsonStringify = require('fast-json-stringify')

const bodySchema = Symbol('body-schema')
const querystringSchema = Symbol('querystring-schema')
const paramsSchema = Symbol('params-schema')
const responseSchema = Symbol('response-schema')
const headersSchema = Symbol('headers-schema')

const schemas = require('./schemas.json')

const inputSchemaError = fastJsonStringify(schemas.inputSchemaError)

// This is not a map so that it can be passed directly into fastJsonStringify
const allSchemas = {}
const cachedValidators = new Map()
const cachedStringifiers = new Map()

// The or is to support both JSON Schema draft 4 and draft 6, with preference to 6
function id (schema) {
  return schema.$id || schema.id
}

function getStringify (schema, root, keyRef) {
  const schemaId =
    typeof keyRef === 'string'
      ? keyRef
      : id(schema)

  if (schemaId) {
    if (!cachedStringifiers.has(schemaId)) {
      let externalSchemas = allSchemas

      if (root) {
        externalSchemas = Object.assign(
          {
            [id(root.schema)]: root.schema
          },
          allSchemas
        )
      }

      const stringify = fastJsonStringify(schema, { schema: externalSchemas })
      cachedStringifiers.set(schemaId, stringify)
    }
    return cachedStringifiers.get(schemaId)
  } else {
    return fastJsonStringify(schema, { schema: allSchemas })
  }
}

function marshalSchema (potential, getSchema) {
  if (typeof potential === 'object') {
    // If an object, it is the schema directly
    return { schema: potential }
  } else if (typeof potential === 'string') {
    // If not an object, get the schema
    return getSchema(null, potential)
  }
}

function getResponseSchema (responseSchemaDefinition, getSchema) {
  var statusCodes = Object.keys(responseSchemaDefinition)
  return statusCodes.reduce(function (r, statusCode) {
    const configured = responseSchemaDefinition[statusCode]
    let { schema, root } = marshalSchema(configured, getSchema)
    r[statusCode] = getStringify(schema, root, configured)
    return r
  }, {})
}

function getSchemaAnyway (schema, getSchema) {
  if (typeof schema === 'object' && (!schema.type || !schema.properties)) {
    return {
      type: 'object',
      properties: schema
    }
  } else if (typeof schema === 'string') {
    return getSchema(null, schema).schema
  }
  return schema
}

function build (opts, compile, getSchema) {
  if (!opts.schema) {
    return
  }

  if (opts.schema.headers) {
    // headers will always be an object, allow schema def to skip this
    opts[headersSchema] = compile(getSchemaAnyway(opts.schema.headers))
  }

  if (opts.schema.response) {
    opts[responseSchema] = getResponseSchema(opts.schema.response, compile, getSchema)
  }

  if (opts.schema.body) {
    opts[bodySchema] = compile(opts.schema.body)
  }

  if (opts.schema.querystring) {
    // querystring will always be an object, allow schema def to skip this
    opts[querystringSchema] = compile(getSchemaAnyway(opts.schema.querystring))
  }

  if (opts.schema.params) {
    opts[paramsSchema] = compile(opts.schema.params)
  }
}

function validateParam (validatorFunction, request, paramName) {
  var ret = validatorFunction && validatorFunction(request[paramName])
  if (ret === false) return inputSchemaError(validatorFunction.errors)
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

function schemaCompiler (schema, keyRef) {
  const schemaId = keyRef || id(schema)
  if (schemaId) {
    if (!cachedValidators.has(schemaId)) {
      let validator
      try {
        validator = this.ajv.getSchema(schemaId)
      } catch (err) {
        validator = this.ajv.compile(schema)
      }
      cachedValidators.set(schemaId, validator)
    }
    return cachedValidators.get(schemaId)
  } else {
    return this.ajv.compile(schema)
  }
}

function addSchema (schema) {
  this.ajv.addSchema(schema)
  allSchemas[id(schema)] = schema
}

module.exports = { build, validate, serialize, isValidLogger, schemaCompiler, getStringify, addSchema }
module.exports.symbols = { bodySchema, querystringSchema, responseSchema, paramsSchema, headersSchema }
