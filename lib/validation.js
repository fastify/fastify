'use strict'

const fastJsonStringify = require('fast-json-stringify')

const bodySchema = Symbol('body-schema')
const querystringSchema = Symbol('querystring-schema')
const paramsSchema = Symbol('params-schema')
const responseSchema = Symbol('response-schema')
const headersSchema = Symbol('headers-schema')

// The or is to support both JSON Schema draft 4 and draft 6, with preference to 6
function id (schema) {
  return schema.$id || schema.id
}

function marshalSchema (potential, compile, resolve, resolveStringify, allSchemas) {
  if (typeof potential === 'object' && potential != null) {
    // If an object, it is the schema directly
    return createStringifier(null, potential, null, allSchemas)
  } else if (typeof potential === 'string') {
    // If not an object, get the schema, and use the potential as the keyRef
    let schema = resolve(potential, allSchemas)
    return createStringifier(potential, schema.schema, schema.root, allSchemas)
  }
}

function marshalResolve (compile, resolver) {
  return function (keyRef, allSchemas) {
    const result = resolver(keyRef, allSchemas)
    if (typeof result === 'function') {
      return result
    } else {
      return compile(result)
    }
  }
}

function getResponseSchema (responseSchemaDefinition, compile, resolve, resolveStringify, allSchemas) {
  var statusCodes = Object.keys(responseSchemaDefinition)
  return statusCodes.reduce(function (r, statusCode) {
    r[statusCode] = marshalSchema(responseSchemaDefinition[statusCode], compile, resolve, resolveStringify, allSchemas)
    return r
  }, {})
}

function getSchemaAnyway (schema, compile, resolve, allSchemas, allowInline) {
  if (typeof schema === 'object' && (!schema.type || !schema.properties) && allowInline) {
    return compile({
      type: 'object',
      properties: schema
    })
  } else if (typeof schema === 'string') {
    return resolve(schema, allSchemas)
  }
  return compile(schema)
}

function build (opts, compile, resolver, resolveStringify, allSchemas) {
  const resolve = marshalResolve(compile, resolver)

  if (!opts.schema) {
    return
  }

  if (opts.schema.headers) {
    // headers will always be an object, allow schema def to skip this
    opts[headersSchema] = getSchemaAnyway(opts.schema.headers, compile, resolve, allSchemas, true)
  }

  if (opts.schema.response) {
    opts[responseSchema] = getResponseSchema(opts.schema.response, compile, resolve, resolveStringify, allSchemas)
  }

  if (opts.schema.body) {
    opts[bodySchema] = getSchemaAnyway(opts.schema.body, compile, resolve, allSchemas)
  }

  if (opts.schema.querystring) {
    // querystring will always be an object, allow schema def to skip this
    opts[querystringSchema] = getSchemaAnyway(opts.schema.querystring, compile, resolve, allSchemas, true)
  }

  if (opts.schema.params) {
    opts[paramsSchema] = getSchemaAnyway(opts.schema.params, compile, resolve, allSchemas)
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
    const cachedSchema = this.ajv.getSchema(schemaId)

    if (cachedSchema) {
      return cachedSchema
    }
  }

  return this.ajv.compile(schema)
}

// skips the first argument of the id since it is not needed
// schema is the actual schema we're compiling
// root is the root document the schema was found in
// - if we reference #/definitions/test, this is #
// allSchemas is a dictionary of all the schemas currently stored in the system
function createStringifier (_, schema, root, allSchemas) {
  let externalSchemas = allSchemas

  if (root) {
    externalSchemas = Object.assign(
      {
        [id(root.schema)]: root.schema
      },
      allSchemas
    )
  }

  return fastJsonStringify(schema, { schema: externalSchemas })
}

module.exports = { build, validate, serialize, isValidLogger, schemaCompiler, createStringifier }
module.exports.symbols = { bodySchema, querystringSchema, responseSchema, paramsSchema, headersSchema }
