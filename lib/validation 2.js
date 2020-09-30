'use strict'

const headersSchema = Symbol('headers-schema')
const paramsSchema = Symbol('params-schema')
const querystringSchema = Symbol('querystring-schema')
const bodySchema = Symbol('body-schema')

const responseSchema = Symbol('response-schema')

function compileSchemasForSerialization (context, compile) {
  if (!context.schema || !context.schema.response) {
    return
  }

  const { method, url } = context.config || {}
  context[responseSchema] = Object.keys(context.schema.response)
    .reduce(function (acc, statusCode) {
      acc[statusCode] = compile({
        schema: context.schema.response[statusCode],
        url,
        method,
        httpStatus: statusCode
      })
      return acc
    }, {})
}

function compileSchemasForValidation (context, compile) {
  if (!context.schema) {
    return
  }

  const { method, url } = context.config || {}

  const headers = context.schema.headers
  if (headers && Object.getPrototypeOf(headers) !== Object.prototype) {
    // do not mess with non-literals, e.g. Joi schemas
    context[headersSchema] = compile({ schema: headers, method, url, httpPart: 'headers' })
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
    context[headersSchema] = compile({ schema: headersSchemaLowerCase, method, url, httpPart: 'headers' })
  }

  if (context.schema.body) {
    context[bodySchema] = compile({ schema: context.schema.body, method, url, httpPart: 'body' })
  }

  if (context.schema.querystring) {
    context[querystringSchema] = compile({ schema: context.schema.querystring, method, url, httpPart: 'querystring' })
  }

  if (context.schema.params) {
    context[paramsSchema] = compile({ schema: context.schema.params, method, url, httpPart: 'params' })
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
  error.validationContext = dataVar
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

function schemaErrorsText (errors, dataVar) {
  var text = ''
  var separator = ', '
  for (var i = 0; i < errors.length; i++) {
    var e = errors[i]
    text += dataVar + (e.dataPath || '') + ' ' + e.message + separator
  }
  return text.slice(0, -separator.length)
}

module.exports = {
  symbols: { bodySchema, querystringSchema, responseSchema, paramsSchema, headersSchema },
  compileSchemasForValidation,
  compileSchemasForSerialization,
  validate,
  serialize
}
