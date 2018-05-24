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
    // The header keys are case insensitive
    //  https://tools.ietf.org/html/rfc2616#section-4.2
    const headers = context.schema.headers
    const headersSchemaLowerCase = {}
    for (const k in headers) {
      if (headers.hasOwnProperty(k) !== true) continue
      headersSchemaLowerCase[k] = headers[k]
    }
    if (headersSchemaLowerCase.required instanceof Array) {
      headersSchemaLowerCase.required = headersSchemaLowerCase.required.map(h => h.toLowerCase())
    }
    if (headers.properties) {
      const properties = headers.properties
      for (const k in properties) {
        if (properties.hasOwnProperty(k) !== true) continue
        headersSchemaLowerCase.properties[k.toLowerCase()] = properties[k]
      }
    }
    context[headersSchema] = compile(headersSchemaLowerCase)
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
  var error = new Error(schemaErrorsText(result, {
    dataVar
  }))
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

function schemaErrorsText (errors, options) {
  errors = errors || this.errors
  if (!errors) return 'No errors'
  options = options || {}
  var separator = options.separator === undefined ? ', ' : options.separator
  var dataVar = options.dataVar === undefined ? 'data' : options.dataVar

  var text = ''
  for (var i = 0; i < errors.length; i++) {
    var e = errors[i]
    if (e) text += dataVar + e.dataPath + ' ' + e.message + separator
  }
  return text.slice(0, -separator.length)
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
