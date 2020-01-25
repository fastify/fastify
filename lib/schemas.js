'use strict'

const fastClone = require('rfdc')({ circles: false, proto: true })
const kFluentSchema = Symbol.for('fluent-schema-object')

const {
  codes: {
    FST_ERR_SCH_MISSING_ID,
    FST_ERR_SCH_ALREADY_PRESENT,
    FST_ERR_SCH_DUPLICATE
  }
} = require('./errors')

function Schemas () {
  this.store = {}

  this.schemaCache = new Map()
  this.schemaCache.put = this.schemaCache.set
}

Object.defineProperties(Schemas.prototype, {
  cache: {
    get () {
      return this.schemaCache
    },
    set (schemaCacheIn) {
      this.schemaCache = schemaCacheIn
    }
  }
})

Schemas.prototype.add = function (inputSchema) {
  var schema = fastClone((inputSchema.isFluentSchema || inputSchema[kFluentSchema])
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

Schemas.prototype.normalizeSchema = function (routeSchemas) {
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
      return routeSchemas
    }
  }

  if (routeSchemas.body) {
    routeSchemas.body = getSchemaAnyway(routeSchemas.body)
  }

  if (routeSchemas.headers) {
    routeSchemas.headers = getSchemaAnyway(routeSchemas.headers)
  }

  if (routeSchemas.querystring) {
    routeSchemas.querystring = getSchemaAnyway(routeSchemas.querystring)
  }

  if (routeSchemas.params) {
    routeSchemas.params = getSchemaAnyway(routeSchemas.params)
  }

  if (routeSchemas.response) {
    Object.keys(routeSchemas.response).forEach(code => {
      routeSchemas.response[code] = getSchemaAnyway(routeSchemas.response[code])
    })
  }

  return routeSchemas
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

Schemas.prototype.getSchemas = function () {
  return Object.assign({}, this.store)
}

Schemas.prototype.getSchema = function (schemaId) {
  return this.store[schemaId]
}

function buildSchemas (s) {
  const schema = new Schemas()
  schema.cache = s.cache
  Object.values(s.getSchemas()).forEach(_ => schema.add(_))
  return schema
}

module.exports = { Schemas, buildSchemas }

function getSchemaAnyway (schema) {
  if (schema.$ref || schema.oneOf || schema.allOf || schema.anyOf || schema.$merge || schema.$patch) return schema
  if (!schema.type && !schema.properties) {
    return {
      type: 'object',
      properties: schema
    }
  }
  return schema
}
