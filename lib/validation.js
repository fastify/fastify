'use strict'

const {
  kSchemaHeaders: headersSchema,
  kSchemaParams: paramsSchema,
  kSchemaQuerystring: querystringSchema,
  kSchemaBody: bodySchema,
  kSchemaResponse: responseSchema
} = require('./symbols')

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
  const ret = validatorFunction && validatorFunction(request[paramName])
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
    result.validationContext = result.validationContext || dataVar
    return result
  }

  const error = schemaErrorFormatter(result, dataVar)
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
