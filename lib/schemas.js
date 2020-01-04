'use strict'

const fastClone = require('rfdc')({ circles: false, proto: true })
const kFluentSchema = Symbol.for('fluent-schema-object')

const {
  codes: {
    FST_ERR_SCH_MISSING_ID,
    FST_ERR_SCH_ALREADY_PRESENT,
    FST_ERR_SCH_NOT_PRESENT,
    FST_ERR_SCH_DUPLICATE
  }
} = require('./errors')

function Schemas () {
  this.store = {}
}

Schemas.prototype.add = function (inputSchema) {
  var schema = fastClone((inputSchema.isFluentSchema || inputSchema[kFluentSchema])
    ? inputSchema.valueOf()
    : inputSchema
  )
  const id = schema.$id
  if (id === undefined) {
    throw new FST_ERR_SCH_MISSING_ID()
  }

  if (this.store[id] !== undefined) {
    throw new FST_ERR_SCH_ALREADY_PRESENT(id)
  }

  this.store[id] = this.normalizeSchema(schema)
}

Schemas.prototype.resolve = function (id) {
  if (this.store[id] === undefined) {
    throw new FST_ERR_SCH_NOT_PRESENT(id)
  }
  return Object.assign({}, this.store[id])
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
    routeSchemas.body = this.getSchemaAnyway(routeSchemas.body)
  }

  if (routeSchemas.headers) {
    routeSchemas.headers = this.getSchemaAnyway(routeSchemas.headers)
  }

  if (routeSchemas.querystring) {
    routeSchemas.querystring = this.getSchemaAnyway(routeSchemas.querystring)
  }

  if (routeSchemas.params) {
    routeSchemas.params = this.getSchemaAnyway(routeSchemas.params)
  }

  return routeSchemas
}

Schemas.prototype.getSchemaAnyway = function (schema) {
  if (schema.oneOf || schema.allOf || schema.anyOf || schema.$merge || schema.$patch) return schema
  if (!schema.type || !schema.properties) {
    return {
      type: 'object',
      properties: schema
    }
  }
  return schema
}

Schemas.prototype.getSchemas = function () {
  return Object.assign({}, this.store)
}

Schemas.prototype.getJsonSchemas = function (options) {
  const store = this.getSchemas()
  const schemasArray = Object.keys(store).map(schemaKey => {
    // if the shared-schema "replace-way" has been used, the $id field has been removed
    if (store[schemaKey].$id === undefined) {
      store[schemaKey].$id = schemaKey
    }
    return store[schemaKey]
  })

  if (options && options.onlyAbsoluteUri === true) {
    // the caller wants only the absolute URI (without the shared schema - "replace-way" usage)
    return schemasArray.filter(_ => !/^\w*$/g.test(_.$id))
  }
  return schemasArray
}

function buildSchemas (s) {
  const schema = new Schemas()
  s.getJsonSchemas().forEach(_ => schema.add(_))
  return schema
}

module.exports = { Schemas, buildSchemas }
