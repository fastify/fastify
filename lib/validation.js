'use strict'

const {
  kSchemaHeaders: headersSchema,
  kSchemaParams: paramsSchema,
  kSchemaQuerystring: querystringSchema,
  kSchemaBody: bodySchema,
  kSchemaResponse: responseSchema,
  kSchemaLazy: lazySchema,
  kSchemaBuildError: buildErrorFlag
} = require('./symbols')
const scChecker = /^[1-5](?:\d{2}|xx)$|^default$/

const {
  FST_ERR_SCH_RESPONSE_SCHEMA_NOT_NESTED_2XX,
  FST_ERR_SCH_VALIDATION_BUILD,
  FST_ERR_SCH_SERIALIZATION_BUILD
} = require('./errors')

const { FSTWRN001 } = require('./warnings')

function compileSchemasForSerialization (context, compile, lazy) {
  if (!context.schema || !context.schema.response) {
    return
  }
  if (lazy === true) {
    // Defer the code generation to the first request of this route.
    lazySlot(context).serialization = () => compileSchemasForSerialization(context, compile)
    return
  }
  const { method, url } = context.config || {}
  context[responseSchema] = Object.keys(context.schema.response)
    .reduce(function (acc, statusCode) {
      const schema = context.schema.response[statusCode]
      statusCode = statusCode.toLowerCase()
      if (!scChecker.test(statusCode)) {
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

function compileSchemasForValidation (context, compile, isCustom, lazy) {
  const { schema } = context
  if (!schema) {
    return
  }
  const { method, url } = context.config || {}

  for (const part of ['headers', 'body', 'querystring', 'params']) {
    if (!schema[part] && Object.hasOwn(schema, part)) {
      FSTWRN001(part, method, url)
    }
  }

  if (lazy === true) {
    // The static checks above stay at registration; only the code generation
    // is deferred to the first request of this route.
    if (schema.body || schema.headers || schema.querystring || schema.params) {
      lazySlot(context).validation = () => buildValidationFunctions(context, compile, isCustom)
    }
    return
  }

  buildValidationFunctions(context, compile, isCustom)
}

function buildValidationFunctions (context, compile, isCustom) {
  const { schema } = context
  const { method, url } = context.config || {}

  const headers = schema.headers
  // the or part is used for backward compatibility
  if (headers && (isCustom || Object.getPrototypeOf(headers) !== Object.prototype)) {
    // do not mess with schema when custom validator applied, e.g. Joi, Typebox
    context[headersSchema] = compile({ schema: headers, method, url, httpPart: 'headers' })
  } else if (headers) {
    // The header keys are case insensitive
    //  https://datatracker.ietf.org/doc/html/rfc2616#section-4.2
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
    const contentProperty = schema.body.content
    if (contentProperty) {
      const contentTypeSchemas = {}
      for (const contentType of Object.keys(contentProperty)) {
        const contentSchema = contentProperty[contentType].schema
        contentTypeSchemas[contentType] = compile({ schema: contentSchema, method, url, httpPart: 'body', contentType })
      }
      context[bodySchema] = contentTypeSchemas
    } else {
      context[bodySchema] = compile({ schema: schema.body, method, url, httpPart: 'body' })
    }
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
  let ret

  try {
    const data = isUndefined ? null : request[paramName]
    // Ajv can only mutate a root value when its parent is provided.
    if (validatorFunction?.schemaEnv) {
      ret = validatorFunction(data, {
        parentData: request,
        parentDataProperty: paramName
      })
    } else {
      ret = validatorFunction?.(data)
    }
  } catch (err) {
    // If validator throws synchronously, ensure it propagates as an internal error
    err.statusCode = 500
    return err
  }

  if (ret && typeof ret.then === 'function') {
    return ret
      .then((res) => { return answer(res) })
      .catch(err => { return err }) // return as simple error (not throw)
  }

  return answer(ret)

  function answer (ret) {
    if (ret === false) return validatorFunction.errors
    if (ret && ret.error) return ret.error
    if (ret && typeof ret === 'object' && 'value' in ret) request[paramName] = ret.value
    return false
  }
}

function validate (context, request, execution) {
  const runExecution = execution === undefined

  if (context[lazySchema] !== undefined) {
    const buildError = resolveLazySchemas(context)
    if (buildError !== undefined) {
      return buildError
    }
  }

  if (runExecution &&
    context[paramsSchema] === undefined &&
    context[bodySchema] === undefined &&
    context[querystringSchema] === undefined &&
    context[headersSchema] === undefined) {
    // the route has no validation schemas
    return false
  }

  if (runExecution || !execution.skipParams) {
    const params = validateParam(context[paramsSchema], request, 'params')
    if (params) {
      if (typeof params.then !== 'function') {
        return wrapValidationError(params, 'params', context.schemaErrorFormatter)
      } else {
        return validateAsyncParams(params, context, request)
      }
    }
  }

  if (runExecution || !execution.skipBody) {
    let validatorFunction = null
    if (typeof context[bodySchema] === 'function') {
      validatorFunction = context[bodySchema]
    } else if (context[bodySchema]) {
      const contentSchema = context[bodySchema][request.mediaType]
      if (contentSchema) {
        validatorFunction = contentSchema
      }
    }
    const body = validateParam(validatorFunction, request, 'body')
    if (body) {
      if (typeof body.then !== 'function') {
        return wrapValidationError(body, 'body', context.schemaErrorFormatter)
      } else {
        return validateAsyncBody(body, context, request)
      }
    }
  }

  if (runExecution || !execution.skipQuery) {
    const query = validateParam(context[querystringSchema], request, 'query')
    if (query) {
      if (typeof query.then !== 'function') {
        return wrapValidationError(query, 'querystring', context.schemaErrorFormatter)
      } else {
        return validateAsyncQuery(query, context, request)
      }
    }
  }

  const headers = validateParam(context[headersSchema], request, 'headers')
  if (headers) {
    if (typeof headers.then !== 'function') {
      return wrapValidationError(headers, 'headers', context.schemaErrorFormatter)
    } else {
      return validateAsyncHeaders(headers, context, request)
    }
  }

  return false
}

function validateAsyncParams (validatePromise, context, request) {
  return validatePromise
    .then((paramsResult) => {
      if (paramsResult) {
        return wrapValidationError(paramsResult, 'params', context.schemaErrorFormatter)
      }

      return validate(context, request, { skipParams: true })
    })
}

function validateAsyncBody (validatePromise, context, request) {
  return validatePromise
    .then((bodyResult) => {
      if (bodyResult) {
        return wrapValidationError(bodyResult, 'body', context.schemaErrorFormatter)
      }

      return validate(context, request, { skipParams: true, skipBody: true })
    })
}

function validateAsyncQuery (validatePromise, context, request) {
  return validatePromise
    .then((queryResult) => {
      if (queryResult) {
        return wrapValidationError(queryResult, 'querystring', context.schemaErrorFormatter)
      }

      return validate(context, request, { skipParams: true, skipBody: true, skipQuery: true })
    })
}

function validateAsyncHeaders (validatePromise, context, request) {
  return validatePromise
    .then((headersResult) => {
      if (headersResult) {
        return wrapValidationError(headersResult, 'headers', context.schemaErrorFormatter)
      }

      return false
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

/**
 * Deferred compilation (`lazySchemaCompilation` option).
 *
 * Routes registered with the option carry a slot with the pending build
 * functions. The slot is removed once both builds succeeded, so a compiled
 * route only pays an `undefined` property check in the validation step and
 * in the serializer lookup. A failed build is terminal for the route and is
 * remembered in the slot: every request keeps failing with the same error,
 * just like `ready()` would have failed in the default mode.
 */
function lazySlot (context) {
  if (context[lazySchema] === undefined) {
    context[lazySchema] = { validation: undefined, serialization: undefined, error: undefined }
  }
  return context[lazySchema]
}

function runLazyBuild (context, key, ErrorClass) {
  const lazy = context[lazySchema]
  if (lazy === undefined || lazy[key] === undefined) return
  const build = lazy[key]
  lazy[key] = undefined
  try {
    build()
  } catch (error) {
    // The first failure is terminal for the route: drop any other pending
    // build so that every request reports this same error.
    lazy.validation = undefined
    lazy.serialization = undefined
    const { method, url } = context.config
    lazy.error = new ErrorClass(method, url, error.message)
    lazy.error[buildErrorFlag] = true
    throw lazy.error
  }
}

/**
 * Compile the validation schemas of a route whose compilation was deferred.
 * No-op when nothing is pending.
 * @param {object} context the route context
 */
function resolveLazyValidation (context) {
  runLazyBuild(context, 'validation', FST_ERR_SCH_VALIDATION_BUILD)
}

/**
 * Compile the response schemas of a route whose compilation was deferred.
 * No-op when nothing is pending.
 * @param {object} context the route context
 */
function resolveLazySerialization (context) {
  runLazyBuild(context, 'serialization', FST_ERR_SCH_SERIALIZATION_BUILD)
}

/**
 * Resolve every pending build of the route, at the validation step of a request.
 * @param {object} context the route context
 * @returns {Error|undefined} the build error, if any
 */
function resolveLazySchemas (context) {
  const lazy = context[lazySchema]
  if (lazy.error !== undefined) {
    return lazy.error
  }
  try {
    resolveLazyValidation(context)
    resolveLazySerialization(context)
  } catch (error) {
    return error
  }
  context[lazySchema] = undefined
}

module.exports = {
  resolveLazyValidation,
  resolveLazySerialization,
  symbols: { bodySchema, querystringSchema, responseSchema, paramsSchema, headersSchema },
  compileSchemasForValidation,
  compileSchemasForSerialization,
  validate
}
