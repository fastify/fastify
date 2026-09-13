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

const { FSTWRN001, FSTSEC002 } = require('./warnings')

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

// Header names are case insensitive (RFC 9110 §5.1), and Node.js stores every
// received header name in lowercase in `request.headers` (see the Node.js
// `message.headers` docs). The header schema must be normalized the same way
// before compilation, otherwise schema keywords that reference header names by
// their canonical or mixed case — `properties`, `required`, and the Draft 7
// `dependencies` keyword (triggers and array-form dependent names) — never
// match the lowercased request object, silently skipping assertions.
//
// JSON Schema is recursive, so the transformation walks the whole schema and
// lowercases every position where a property name (i.e. a header name) appears,
// while recursing into subschemas. This covers `properties` and `required` in
// every nested subschema, `dependencies` trigger keys, array-form dependent
// property names and subschemas used as dependency values, and subschemas
// reachable through `allOf`, `anyOf`, `oneOf`, `not`, `if`/`then`/`else`, local
// `$ref` definitions (`definitions`/`$defs`), and the other standard subschema
// containers. The input schema is never mutated: a new schema tree is returned.
function lowerCaseHeadersSchema (schema) {
  if (Array.isArray(schema)) {
    return schema.map(lowerCaseHeadersSchema)
  }
  if (schema === null || typeof schema !== 'object') {
    return schema
  }

  const result = {}

  for (const key of Object.keys(schema)) {
    const value = schema[key]

    switch (key) {
      case 'properties': {
        if (value === null || typeof value !== 'object') {
          result.properties = value
          break
        }
        const normalized = {}
        for (const prop of Object.keys(value)) {
          normalized[prop.toLowerCase()] = lowerCaseHeadersSchema(value[prop])
        }
        result.properties = normalized
        break
      }
      case 'required':
        result.required = Array.isArray(value)
          ? value.map(name => name.toLowerCase())
          : value
        break
      case 'dependencies': {
        if (value === null || typeof value !== 'object') {
          result.dependencies = value
          break
        }
        const normalized = {}
        for (const dep of Object.keys(value)) {
          const depValue = value[dep]
          if (Array.isArray(depValue)) {
            normalized[dep.toLowerCase()] = depValue.map(name => name.toLowerCase())
          } else {
            normalized[dep.toLowerCase()] = lowerCaseHeadersSchema(depValue)
          }
        }
        result.dependencies = normalized
        break
      }
      case 'dependentSchemas': {
        if (value === null || typeof value !== 'object') {
          result.dependentSchemas = value
          break
        }
        const normalized = {}
        for (const dep of Object.keys(value)) {
          normalized[dep.toLowerCase()] = lowerCaseHeadersSchema(value[dep])
        }
        result.dependentSchemas = normalized
        break
      }
      case 'dependentRequired': {
        if (value === null || typeof value !== 'object') {
          result.dependentRequired = value
          break
        }
        const normalized = {}
        for (const dep of Object.keys(value)) {
          normalized[dep.toLowerCase()] = value[dep].map(name => name.toLowerCase())
        }
        result.dependentRequired = normalized
        break
      }
      // Arrays of subschemas (`allOf`/`anyOf`/`oneOf`) or a single subschema
      // (`not`/`if`/`then`/`else`/`items`/`additionalItems`/...). `lowerCaseHeadersSchema`
      // handles arrays, objects and booleans, so recursing here covers them all.
      case 'allOf':
      case 'anyOf':
      case 'oneOf':
      case 'not':
      case 'if':
      case 'then':
      case 'else':
      case 'items':
      case 'additionalItems':
      case 'additionalProperties':
      case 'unevaluatedItems':
      case 'unevaluatedProperties':
      case 'contains':
      case 'propertyNames':
      case 'contentSchema':
        result[key] = lowerCaseHeadersSchema(value)
        break
      // Maps of subschemas whose keys are not header names (definition names,
      // regex patterns): keep the keys, normalize the subschema values.
      case 'definitions':
      case '$defs':
      case 'patternProperties': {
        if (value === null || typeof value !== 'object') {
          result[key] = value
          break
        }
        const normalized = {}
        for (const k of Object.keys(value)) {
          normalized[k] = lowerCaseHeadersSchema(value[k])
        }
        result[key] = normalized
        break
      }
      default:
        result[key] = value
    }
  }

  return result
}

// `lowerCaseHeadersSchema` only normalizes the inline schema tree. A header
// schema can also pull in a schema registered with `addSchema()` through an
// external `$ref` (any ref that does not start with `#`, i.e. not a same
// document fragment). Those referenced schemas are resolved by the validator
// after normalization and keep their original header-name case, so
// case-insensitive assertions in them never match the lowercased request
// headers. We cannot safely normalize them here because the same registered
// schema is shared with body, querystring and params validation, so we detect
// the external reference and warn the developer instead. Returns the first
// external `$ref` found, or undefined.
function findExternalHeaderRef (schema) {
  if (Array.isArray(schema)) {
    for (const item of schema) {
      const ref = findExternalHeaderRef(item)
      if (ref !== undefined) return ref
    }
    return undefined
  }
  if (schema === null || typeof schema !== 'object') {
    return undefined
  }
  if (typeof schema.$ref === 'string' && schema.$ref[0] !== '#') {
    return schema.$ref
  }
  for (const key of Object.keys(schema)) {
    const ref = findExternalHeaderRef(schema[key])
    if (ref !== undefined) return ref
  }
  return undefined
}

// A plain-object header schema is case-normalized before compilation. Custom
// validators (e.g. Joi, TypeBox), boolean schemas (true/false) and invalid
// values are compiled as they are.
function isNormalizableHeadersSchema (headers, isCustom) {
  return !isCustom &&
    typeof headers === 'object' &&
    headers !== null &&
    Object.getPrototypeOf(headers) === Object.prototype
}

function compileSchemasForValidation (context, compile, isCustom, lazy) {
  const { schema } = context
  if (!schema) {
    return
  }
  const { method, url } = context.config || {}

  // JSON Schema Draft 7 defines the boolean `false` (and `true`) as a valid
  // schema. A present boolean must be passed to the compiler unchanged, so
  // every request-part schema is selected by an explicit `undefined` check
  // rather than truthiness. FSTWRN001 is preserved only for schemas that are
  // explicitly set to `undefined`.
  for (const part of ['headers', 'body', 'querystring', 'params']) {
    if (schema[part] === undefined && Object.hasOwn(schema, part)) {
      FSTWRN001(part, method, url)
    }
  }

  if (isNormalizableHeadersSchema(schema.headers, isCustom)) {
    const externalRef = findExternalHeaderRef(schema.headers)
    if (externalRef !== undefined) {
      FSTSEC002(method, url, externalRef)
    }
  }

  if (lazy === true) {
    // The static checks above stay at registration; only the code generation
    // is deferred to the first request of this route.
    if (schema.body !== undefined ||
      schema.headers !== undefined ||
      schema.querystring !== undefined ||
      schema.params !== undefined) {
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
  if (headers !== undefined) {
    if (isNormalizableHeadersSchema(headers, isCustom)) {
      // The header keys are case insensitive
      //  https://datatracker.ietf.org/doc/html/rfc2616#section-4.2
      context[headersSchema] = compile({ schema: lowerCaseHeadersSchema(headers), method, url, httpPart: 'headers' })
    } else {
      // do not mess with schema when custom validator applied, e.g. Joi, Typebox
      // boolean schemas (true/false) and invalid values are compiled directly
      context[headersSchema] = compile({ schema: headers, method, url, httpPart: 'headers' })
    }
  }

  if (schema.body !== undefined) {
    const contentProperty = schema.body !== null && typeof schema.body === 'object'
      ? schema.body.content
      : undefined
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

  if (schema.querystring !== undefined) {
    context[querystringSchema] = compile({ schema: schema.querystring, method, url, httpPart: 'querystring' })
  }

  if (schema.params !== undefined) {
    context[paramsSchema] = compile({ schema: schema.params, method, url, httpPart: 'params' })
  }
}

function validateParam (validatorFunction, request, paramName) {
  // The headers getter may allocate a new object, so only read it when needed.
  if (validatorFunction == null) return false
  const value = request[paramName]
  let ret

  try {
    const data = value === undefined ? null : value
    // Ajv can only mutate a root value when its parent is provided.
    if (validatorFunction.schemaEnv) {
      ret = validatorFunction(data, {
        parentData: request,
        parentDataProperty: paramName
      })
    } else {
      ret = validatorFunction(data)
    }
  } catch (err) {
    // If validator throws synchronously, ensure it propagates as an internal error
    err.statusCode = 500
    return err
  }

  if (ret && typeof ret.then === 'function') {
    // An async validator (for example an `$async` Ajv schema) resolves with the
    // validated data itself, not a `{ value, error }` result. Its properties must
    // not be unwrapped the way a synchronous custom compiler result is, otherwise
    // a payload carrying an `error` or `value` key could inject a validation error
    // or replace the whole request part. Treat the async result as pass/fail only.
    return ret
      .then((res) => { return res === false ? validatorFunction.errors : false })
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
  if (lazy === undefined) return
  if (lazy.error !== undefined) throw lazy.error
  if (lazy[key] === undefined) return
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
