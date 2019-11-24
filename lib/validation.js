'use strict'

const fastJsonStringify = require('fast-json-stringify')
const Ajv = require('ajv')

const bodySchema = Symbol('body-schema')
const querystringSchema = Symbol('querystring-schema')
const paramsSchema = Symbol('params-schema')
const responseSchema = Symbol('response-schema')
const headersSchema = Symbol('headers-schema')
const kFluentSchema = Symbol.for('fluent-schema-object')

function getValidatorForStatusCodeSchema (statusCodeDefinition, externalSchema) {
  return fastJsonStringify(statusCodeDefinition, { schema: externalSchema })
}

function getResponseSchema (responseSchemaDefinition, sharedSchemas) {
  var statusCodes = Object.keys(responseSchemaDefinition)
  return statusCodes.reduce(function (r, statusCode) {
    r[statusCode] = getValidatorForStatusCodeSchema(responseSchemaDefinition[statusCode], sharedSchemas)
    return r
  }, {})
}

function build (context, compile, schemas, schemaResolver) {
  if (!context.schema) {
    return
  }

  generateFluentSchema(context.schema)
  context.schema = schemas.resolveRefs(context.schema, false, schemaResolver)

  const headers = context.schema.headers

  if (headers && Object.getPrototypeOf(headers) !== Object.prototype) {
    // do not mess with non-literals, e.g. Joi schemas
    context[headersSchema] = compile(headers)
  } else if (headers) {
    // The header keys are case insensitive
    //  https://tools.ietf.org/html/rfc2616#section-4.2
    const headersSchemaLowerCase = {}
    Object.keys(headers).forEach(k => { headersSchemaLowerCase[k] = headers[k] })
    if (headersSchemaLowerCase.required instanceof Array) {
      headersSchemaLowerCase.required = headersSchemaLowerCase.required.map(h => h.toLowerCase())
    }
    if (headers.properties) {
      headersSchemaLowerCase.properties = {}
      Object.keys(headers.properties).forEach(k => {
        headersSchemaLowerCase.properties[k.toLowerCase()] = headers.properties[k]
      })
    }
    context[headersSchema] = compile(headersSchemaLowerCase)
  }

  if (context.schema.response) {
    context[responseSchema] = getResponseSchema(context.schema.response, schemas.getSchemas())
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

function generateFluentSchema (schema) {
  ;['params', 'body', 'querystring', 'query', 'headers'].forEach(key => {
    if (schema[key] && (schema[key].isFluentSchema || schema[key][kFluentSchema])) {
      schema[key] = schema[key].valueOf()
    }
  })

  if (schema.response) {
    Object.keys(schema.response).forEach(code => {
      if (schema.response[code].isFluentSchema || schema.response[code][kFluentSchema]) {
        schema.response[code] = schema.response[code].valueOf()
      }
    })
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
  var params = validateParam(context[paramsSchema], request, 'params')
  if (params) {
    return wrapValidationError(params, 'params')
  }
  var body = validateParam(context[bodySchema], request, 'body')
  if (body) {
    return wrapValidationError(body, 'body')
  }
  var query = validateParam(context[querystringSchema], request, 'query')
  if (query) {
    return wrapValidationError(query, 'querystring')
  }
  var headers = validateParam(context[headersSchema], request, 'headers')
  if (headers) {
    return wrapValidationError(headers, 'headers')
  }
  return null
}

function wrapValidationError (result, dataVar) {
  if (result instanceof Error) {
    return result
  }
  var error = new Error(schemaErrorsText(result, dataVar))
  error.validation = result
  return error
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

function schemaErrorsText (errors, dataVar) {
  var text = ''
  var separator = ', '
  for (var i = 0; i < errors.length; i++) {
    var e = errors[i]
    text += dataVar + (e.dataPath || '') + ' ' + e.message + separator
  }
  return text.slice(0, -separator.length)
}

function buildSchemaCompiler (externalSchemas, cache) {
  // This instance of Ajv is private
  // it should not be customized or used
  const ajv = new Ajv({
    coerceTypes: true,
    useDefaults: true,
    removeAdditional: true,
    allErrors: true,
    nullable: true,
    cache
  })

  if (Array.isArray(externalSchemas)) {
    externalSchemas.forEach(s => ajv.addSchema(s))
  }

  return ajv.compile.bind(ajv)
}

module.exports = { build, validate, serialize, isValidLogger, buildSchemaCompiler }
module.exports.symbols = { bodySchema, querystringSchema, responseSchema, paramsSchema, headersSchema }
