'use strict'

const fastClone = require('rfdc')({ circles: false, proto: true })
const kFluentSchema = Symbol.for('fluent-schema-object')

const {
  codes: {
    // FST_ERR_SCH_MISSING_ID, // TODO remove
    FST_ERR_SCH_ALREADY_PRESENT,
    // FST_ERR_SCH_NOT_PRESENT, // TODO remove
    FST_ERR_SCH_DUPLICATE
  }
} = require('./errors')

function Schemas () {
  this.store = []
  this.idStored = new Set()

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
  if (id) {
    if (this.idStored.has(id)) {
      throw new FST_ERR_SCH_ALREADY_PRESENT(id)
    }
    this.idStored.add(id)
  }

  this.store.push(schema)
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

  generateFluentSchema(routeSchemas)
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
  return this.store.slice()
}

function buildSchemas (s) {
  const schema = new Schemas()
  schema.cache = s.cache
  s.getSchemas().forEach(_ => schema.add(_))
  return schema
}

module.exports = { Schemas, buildSchemas }

function getSchemaAnyway (schema) {
  if (schema.oneOf || schema.allOf || schema.anyOf || schema.$merge || schema.$patch) return schema
  if (!schema.type || !schema.properties) {
    return {
      type: 'object',
      properties: schema
    }
  }
  return schema
}
