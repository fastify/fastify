'use strict'

const fastClone = require('rfdc')({ circles: false, proto: true })
const { kSchemaVisited, kSchemaResponse } = require('./symbols')
const kFluentSchema = Symbol.for('fluent-schema-object')

const {
  FST_ERR_SCH_MISSING_ID,
  FST_ERR_SCH_ALREADY_PRESENT,
  FST_ERR_SCH_DUPLICATE,
  FST_ERR_SCH_CONTENT_MISSING_SCHEMA
} = require('./errors')

const SCHEMAS_SOURCE = ['params', 'body', 'querystring', 'query', 'headers']

function Schemas (initStore) {
  this.store = initStore || {}
}

Schemas.prototype.add = function (inputSchema) {
  const schema = fastClone((inputSchema.isFluentSchema || inputSchema.isFluentJSONSchema || inputSchema[kFluentSchema])
    ? inputSchema.valueOf()
    : inputSchema
  )

  // devs can add schemas without $id, but with $def instead
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

function normalizeSchema (routeSchemas, serverOptions) {
  if (routeSchemas[kSchemaVisited]) {
    return routeSchemas
  }

  // alias query to querystring schema
  if (routeSchemas.query) {
    // check if our schema has both querystring and query
    if (routeSchemas.querystring) {
      throw new FST_ERR_SCH_DUPLICATE('querystring')
    }
    routeSchemas.querystring = routeSchemas.query
  }

  generateFluentSchema(routeSchemas)

  // let's check if our schemas have a custom prototype
  for (const key of ['headers', 'querystring', 'params', 'body']) {
    if (typeof routeSchemas[key] === 'object' && Object.getPrototypeOf(routeSchemas[key]) !== Object.prototype) {
      routeSchemas[kSchemaVisited] = true
      return routeSchemas
    }
  }

  if (routeSchemas.body) {
    routeSchemas.body = getSchemaAnyway(routeSchemas.body, serverOptions.jsonShorthand)
  }

  if (routeSchemas.headers) {
    routeSchemas.headers = getSchemaAnyway(routeSchemas.headers, serverOptions.jsonShorthand)
  }

  if (routeSchemas.querystring) {
    routeSchemas.querystring = getSchemaAnyway(routeSchemas.querystring, serverOptions.jsonShorthand)
  }

  if (routeSchemas.params) {
    routeSchemas.params = getSchemaAnyway(routeSchemas.params, serverOptions.jsonShorthand)
  }

  if (routeSchemas.response) {
    const httpCodes = Object.keys(routeSchemas.response)
    for (const code of httpCodes) {
      const contentProperty = routeSchemas.response[code].content

      let hasContentMultipleContentTypes = false
      if (contentProperty) {
        const keys = Object.keys(contentProperty)
        for (let i = 0; i < keys.length; i++) {
          const mediaName = keys[i]
          if (!contentProperty[mediaName].schema) {
            if (keys.length === 1) { break }
            throw new FST_ERR_SCH_CONTENT_MISSING_SCHEMA(mediaName)
          }
          routeSchemas.response[code].content[mediaName].schema = getSchemaAnyway(contentProperty[mediaName].schema, serverOptions.jsonShorthand)
          if (i === keys.length - 1) {
            hasContentMultipleContentTypes = true
          }
        }
      }

      if (!hasContentMultipleContentTypes) {
        routeSchemas.response[code] = getSchemaAnyway(routeSchemas.response[code], serverOptions.jsonShorthand)
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

function getSchemaAnyway (schema, jsonShorthand) {
  if (!jsonShorthand || schema.$ref || schema.oneOf || schema.allOf || schema.anyOf || schema.$merge || schema.$patch) return schema
  if (!schema.type && !schema.properties) {
    return {
      type: 'object',
      properties: schema
    }
  }
  return schema
}

/**
 * Search for the right JSON schema compiled function in the request context
 * setup by the route configuration `schema.response`.
 * It will look for the exact match (eg 200) or generic (eg 2xx)
 *
 * @param {object} context the request context
 * @param {number} statusCode the http status code
 * @param {string} contentType the reply content type
 * @returns {function|boolean} the right JSON Schema function to serialize
 * the reply or false if it is not set
 */
function getSchemaSerializer (context, statusCode, contentType) {
  const responseSchemaDef = context[kSchemaResponse]
  if (!responseSchemaDef) {
    return false
  }
  if (responseSchemaDef[statusCode]) {
    if (responseSchemaDef[statusCode].constructor === Object && contentType) {
      const mediaName = contentType.split(';')[0]
      if (responseSchemaDef[statusCode][mediaName]) {
        return responseSchemaDef[statusCode][mediaName]
      }

      return false
    }
    return responseSchemaDef[statusCode]
  }
  const fallbackStatusCode = (statusCode + '')[0] + 'xx'
  if (responseSchemaDef[fallbackStatusCode]) {
    if (responseSchemaDef[fallbackStatusCode].constructor === Object && contentType) {
      const mediaName = contentType.split(';')[0]
      if (responseSchemaDef[fallbackStatusCode][mediaName]) {
        return responseSchemaDef[fallbackStatusCode][mediaName]
      }

      return false
    }

    return responseSchemaDef[fallbackStatusCode]
  }
  if (responseSchemaDef.default) {
    if (responseSchemaDef.default.constructor === Object && contentType) {
      const mediaName = contentType.split(';')[0]
      if (responseSchemaDef.default[mediaName]) {
        return responseSchemaDef.default[mediaName]
      }

      return false
    }

    return responseSchemaDef.default
  }
  return false
}

module.exports = {
  buildSchemas (initStore) { return new Schemas(initStore) },
  getSchemaSerializer,
  normalizeSchema
}
