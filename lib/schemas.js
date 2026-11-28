'use strict'

const fastClone = require('rfdc')({ circles: false, proto: true })
const { kSchemaVisited, kSchemaOutputValidator } = require('./symbols')
const kFluentSchema = Symbol.for('fluent-schema-object')

const {
  FST_ERR_SCH_MISSING_ID,
  FST_ERR_SCH_ALREADY_PRESENT,
  FST_ERR_SCH_DUPLICATE,
  FST_ERR_SCH_CONTENT_MISSING_SCHEMA,
  FST_ERR_MISSING_CONTENTTYPE_SERIALIZATION_FN
} = require('./errors')
const ContentType = require('./content-type')

const SCHEMAS_SOURCE = ['params', 'body', 'querystring', 'query', 'headers']

function Schemas (initStore) {
  this.store = initStore || {}
}

Schemas.prototype.add = function (inputSchema) {
  const schema = fastClone((inputSchema.isFluentSchema || inputSchema.isFluentJSONSchema || inputSchema[kFluentSchema])
    ? inputSchema.valueOf()
    : inputSchema
  )

  // developers can add schemas without $id, but with $def instead
  const id = schema.$id
  if (!id) {
    throw new FST_ERR_SCH_MISSING_ID()
  }

  if (this.store[id]) {
    throw new FST_ERR_SCH_ALREADY_PRESENT(id)
  }

  this.store[id] = schema
}

Schemas.prototype.getSchemas = function () {
  return Object.assign({}, this.store)
}

Schemas.prototype.getSchema = function (schemaId) {
  return this.store[schemaId]
}

/**
 * Checks whether a schema is a non-plain object.
 *
 * @param {*} schema the schema to check
 * @returns {boolean} true if schema has a custom prototype
 */
function isCustomSchemaPrototype (schema) {
  return typeof schema === 'object' && Object.getPrototypeOf(schema) !== Object.prototype
}

function normalizeSchema (routeSchemas, serverOptions) {
  if (routeSchemas[kSchemaVisited]) {
    return routeSchemas
  }

  // alias query to querystring schema
  // A JSON Schema boolean (`false` or `true`) is a valid schema and must still
  // be aliased, so presence is determined from an explicit `undefined` check
  // rather than truthiness.
  if (routeSchemas.query !== undefined) {
    // check if our schema has both querystring and query
    if (routeSchemas.querystring !== undefined) {
      throw new FST_ERR_SCH_DUPLICATE('querystring')
    }
    routeSchemas.querystring = routeSchemas.query
  }

  generateFluentSchema(routeSchemas)

  for (const key of SCHEMAS_SOURCE) {
    const schema = routeSchemas[key]
    if (schema && !isCustomSchemaPrototype(schema)) {
      if (key === 'body' && schema.content) {
        const contentProperty = schema.content
        const keys = Object.keys(contentProperty)
        for (let i = 0; i < keys.length; i++) {
          const contentType = keys[i]
          const contentSchema = contentProperty[contentType].schema
          if (!contentSchema) {
            throw new FST_ERR_SCH_CONTENT_MISSING_SCHEMA(contentType)
          }
        }
        continue
      }
    }
  }

  if (routeSchemas.response) {
    const httpCodes = Object.keys(routeSchemas.response)
    for (const code of httpCodes) {
      if (isCustomSchemaPrototype(routeSchemas.response[code])) {
        continue
      }

      const contentProperty = routeSchemas.response[code].content

      if (contentProperty) {
        const keys = Object.keys(contentProperty)
        for (let i = 0; i < keys.length; i++) {
          const mediaName = keys[i]
          if (!contentProperty[mediaName].schema) {
            throw new FST_ERR_SCH_CONTENT_MISSING_SCHEMA(mediaName)
          }
        }
      }
    }
  }

  routeSchemas[kSchemaVisited] = true
  return routeSchemas
}

function generateFluentSchema (schema) {
  for (const key of SCHEMAS_SOURCE) {
    if (schema[key] && (schema[key].isFluentSchema || schema[key][kFluentSchema])) {
      schema[key] = schema[key].valueOf()
    }
  }

  if (schema.response) {
    const httpCodes = Object.keys(schema.response)
    for (const code of httpCodes) {
      if (schema.response[code].isFluentSchema || schema.response[code][kFluentSchema]) {
        schema.response[code] = schema.response[code].valueOf()
      }
    }
  }
}

/**
 * Resolve the right output validator for a per-media-type (`content`) response
 * schema map, given the response media type.
 *
 * @param {object} contentSchema the compiled per-content-type schema map
 * @param {string} [mediaType] the response media type (lowercased), undefined
 *   when the reply has no valid content type
 * @param {string|number} statusCode the resolved http status key
 * @param {boolean} failClosed whether to throw when no schema matches (used
 *   for route response serialization) or return false (used by the error
 *   handler, which falls back to the default error serializer)
 * @returns {function|false} the output validator, or false when no schema
 *   applies and failClosed is false
 */
function getContentValidator (contentSchema, mediaType, statusCode, failClosed) {
  if (contentSchema[mediaType]) {
    return contentSchema[mediaType]
  }

  // fallback to match all media-types
  if (contentSchema['*/*']) {
    return contentSchema['*/*']
  }

  // The response content-type is not declared in the route's content map. When
  // serializing a route response, do not fall back to a raw JSON dump (which
  // would bypass the response schema); surface the misconfiguration instead.
  if (failClosed) {
    throw new FST_ERR_MISSING_CONTENTTYPE_SERIALIZATION_FN(statusCode, mediaType)
  }

  return false
}

/**
 * Search for the output validator in the request context setup by the route
 * configuration `schema.response`.
 * It will look for the exact match (eg 200) or generic (eg 2xx)
 *
 * @param {object} context the request context
 * @param {number} statusCode the http status code
 * @param {string} [contentType] the reply content type
 * @param {boolean} [failClosed] when true, throw when the response
 *   content-type is not declared in the content map; otherwise return false
 * @returns {function|false} the output validator of the reply or false if it
 * is not set
 */
function getOutputValidator (context, statusCode, contentType, failClosed = false) {
  const responseSchemaDef = context[kSchemaOutputValidator]
  if (!responseSchemaDef) {
    return false
  }
  if (responseSchemaDef[statusCode]) {
    if (responseSchemaDef[statusCode].constructor === Object) {
      const mediaType = ContentType.from(contentType).mediaType
      return getContentValidator(responseSchemaDef[statusCode], mediaType, statusCode, failClosed)
    }
    return responseSchemaDef[statusCode]
  }
  const fallbackStatusCode = (statusCode + '')[0] + 'xx'
  if (responseSchemaDef[fallbackStatusCode]) {
    if (responseSchemaDef[fallbackStatusCode].constructor === Object) {
      const mediaType = ContentType.from(contentType).mediaType
      return getContentValidator(responseSchemaDef[fallbackStatusCode], mediaType, fallbackStatusCode, failClosed)
    }

    return responseSchemaDef[fallbackStatusCode]
  }
  if (responseSchemaDef.default) {
    if (responseSchemaDef.default.constructor === Object) {
      const mediaType = ContentType.from(contentType).mediaType
      return getContentValidator(responseSchemaDef.default, mediaType, 'default', failClosed)
    }

    return responseSchemaDef.default
  }
  return false
}

/**
 * Search for the output validator declared for an exact response schema key.
 * Unlike `getOutputValidator`, there is no NXX, default or wildcard content
 * type fallback: the key is the http status (and content type) of the route
 * `schema.response`.
 *
 * @param {object} context the request context
 * @param {number|string} httpStatus the http status key of the response schema
 * @param {string} [contentType] the content type key of the response schema
 * @returns {function|undefined} the output validator or undefined if it is not
 * set
 */
function getStatusOutputValidator (context, httpStatus, contentType) {
  let validate = context[kSchemaOutputValidator]?.[httpStatus]
  if (contentType != null) {
    validate = validate?.[contentType]
  }
  return typeof validate === 'function' ? validate : undefined
}

module.exports = {
  buildSchemas (initStore) { return new Schemas(initStore) },
  getOutputValidator,
  getStatusOutputValidator,
  normalizeSchema
}
