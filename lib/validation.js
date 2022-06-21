'use strict'

const {
  kSchemaHeaders: headersSchema,
  kSchemaParams: paramsSchema,
  kSchemaQuerystring: querystringSchema,
  kSchemaBody: bodySchema,
  kSchemaResponse: responseSchema
} = require('./symbols')
const scChecker = /^[1-5]{1}[0-9]{2}$|^[1-5]xx$|^default$/

function compileSchemasForSerialization (context, compile) {
  if (!context.schema || !context.schema.response) {
    return
  }
  const { method, url } = context.config || {}
  context[responseSchema] = Object.keys(context.schema.response)
    .reduce(function (acc, statusCode) {
      const schema = context.schema.response[statusCode]
      statusCode = statusCode.toLowerCase()
      if (!scChecker.exec(statusCode)) {
        throw new Error('response schemas should be nested under a valid status code, e.g { 2xx: { type: "object" } }')
      }

      acc[statusCode] = compile({
        schema,
        url,
        method,
        httpStatus: statusCode
      })
      return acc
    }, {})
}

function compileSchemasForValidation (context, compile) {
  const { schema } = context
  if (!schema) {
    return
  }

  const { method, url } = context.config || {}

  const headers = schema.headers
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

  if (schema.body) {
    context[bodySchema] = compile({ schema: schema.body, method, url, httpPart: 'body' })
  }

  if (schema.querystring) {
    context[querystringSchema] = compile({ schema: schema.querystring, method, url, httpPart: 'querystring' })
  }

  if (schema.params) {
    context[paramsSchema] = compile({ schema: schema.params, method, url, httpPart: 'params' })
  }
}

function validateParam (validatorFunction, request, paramName) {
  const isUndefined = request[paramName] === undefined
  const ret = validatorFunction && validatorFunction(isUndefined ? null : request[paramName])
  if (ret === false) return validatorFunction.errors
  if (ret && ret.error) return ret.error
  if (ret && ret.value) request[paramName] = ret.value
  return false
}

function validate (context, request) {
  const params = validateParam(context[paramsSchema], request, 'params')

  if (params) {
    return wrapValidationError(params, 'params', context.schemaErrorFormatter)
  }
  const body = validateParam(context[bodySchema], request, 'body')
  if (body) {
    return wrapValidationError(body, 'body', context.schemaErrorFormatter)
  }
  const query = validateParam(context[querystringSchema], request, 'query')
  if (query) {
    return wrapValidationError(query, 'querystring', context.schemaErrorFormatter)
  }
  const headers = validateParam(context[headersSchema], request, 'headers')
  if (headers) {
    return wrapValidationError(headers, 'headers', context.schemaErrorFormatter)
  }
  return null
}

function wrapValidationError (result, dataVar, schemaErrorFormatter) {
  if (result instanceof Error) {
    result.statusCode = result.statusCode || 400
    result.validationContext = result.validationContext || dataVar
    return result
  }

  const error = schemaErrorFormatter(result, dataVar)
  error.statusCode = error.statusCode || 400
  error.validation = result
  error.validationContext = dataVar
  return error
}

module.exports = {
  symbols: { bodySchema, querystringSchema, responseSchema, paramsSchema, headersSchema },
  compileSchemasForValidation,
  compileSchemasForSerialization,
  validate
}
