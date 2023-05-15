'use strict'

const {
  kSchemaHeaders: headersSchema,
  kSchemaParams: paramsSchema,
  kSchemaQuerystring: querystringSchema,
  kSchemaBody: bodySchema,
  kSchemaResponse: responseSchema
} = require('./symbols')
const scChecker = /^[1-5]{1}[0-9]{2}$|^[1-5]xx$|^default$/

const {
  FST_ERR_SCH_RESPONSE_SCHEMA_NOT_NESTED_2XX
} = require('./errors')

const warning = require('./warnings')

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
        throw new FST_ERR_SCH_RESPONSE_SCHEMA_NOT_NESTED_2XX()
      }

      if (schema.content) {
        const contentTypesSchemas = {}
        for (const mediaName of Object.keys(schema.content)) {
          const contentSchema = schema.content[mediaName].schema
          contentTypesSchemas[mediaName] = compile({
            schema: contentSchema,
            url,
            method,
            httpStatus: statusCode,
            contentType: mediaName
          })
        }
        acc[statusCode] = contentTypesSchemas
      } else {
        acc[statusCode] = compile({
          schema,
          url,
          method,
          httpStatus: statusCode
        })
      }

      return acc
    }, {})
}

function compileSchemasForValidation (context, compile, isCustom) {
  const { schema } = context
  if (!schema) {
    return
  }

  const { method, url } = context.config || {}

  const headers = schema.headers
  // the or part is used for backward compatibility
  if (headers && (isCustom || Object.getPrototypeOf(headers) !== Object.prototype)) {
    // do not mess with schema when custom validator applied, e.g. Joi, Typebox
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
  } else if (Object.prototype.hasOwnProperty.call(schema, 'headers')) {
    warning.emit('FSTWRN001', 'headers', method, url)
  }

  if (schema.body) {
    context[bodySchema] = compile({ schema: schema.body, method, url, httpPart: 'body' })
  } else if (Object.prototype.hasOwnProperty.call(schema, 'body')) {
    warning.emit('FSTWRN001', 'body', method, url)
  }

  if (schema.querystring) {
    context[querystringSchema] = compile({ schema: schema.querystring, method, url, httpPart: 'querystring' })
  } else if (Object.prototype.hasOwnProperty.call(schema, 'querystring')) {
    warning.emit('FSTWRN001', 'querystring', method, url)
  }

  if (schema.params) {
    context[paramsSchema] = compile({ schema: schema.params, method, url, httpPart: 'params' })
  } else if (Object.prototype.hasOwnProperty.call(schema, 'params')) {
    warning.emit('FSTWRN001', 'params', method, url)
  }
}

function validateParam (validatorFunction, request, paramName, callback) {
  const isUndefined = request[paramName] === undefined
  const ret = validatorFunction && validatorFunction(isUndefined ? null : request[paramName])

  if (ret?.then) {
    return ret
      .then((res) => { callback(answer(res)) })
      .catch(callback)
  }

  callback(answer(ret))

  function answer (ret) {
    if (ret === false) return validatorFunction.errors
    if (ret && ret.error) return ret.error
    if (ret && ret.value) request[paramName] = ret.value
    return false
  }
}

function validate (context, request, callback) {
  const validationReverseQueue = [
    { fnKey: headersSchema, key: 'headers', errorKey: 'headers' },
    { fnKey: querystringSchema, key: 'query', errorKey: 'querystring' },
    { fnKey: bodySchema, key: 'body', errorKey: 'body' },
    { fnKey: paramsSchema, key: 'params', errorKey: 'params' }
  ]

  validateNextParam(validationReverseQueue, context, request, callback)
}

function validateNextParam (queue, context, request, callback) {
  if (queue.length === 0) {
    callback()
    return
  }

  const exe = queue.pop()
  validateParam(context[exe.fnKey], request, exe.key, function (result) {
    if (result) {
      callback(wrapValidationError(result, exe.errorKey, context.schemaErrorFormatter))
    } else {
      validateNextParam(queue, context, request, callback)
    }
  })
}

function wrapValidationError (result, dataVar, schemaErrorFormatter) {
  if (result instanceof Error) {
    result.statusCode = result.statusCode || 400
    result.code = result.code || 'FST_ERR_VALIDATION'
    result.validationContext = result.validationContext || dataVar
    return result
  }

  const error = schemaErrorFormatter(result, dataVar)
  error.statusCode = error.statusCode || 400
  error.code = error.code || 'FST_ERR_VALIDATION'
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
