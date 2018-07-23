'use strict'

function Schemas () {
  this.store = {}
}

Schemas.prototype.add = function (schema) {
  const id = schema['$id']
  if (id === undefined) {
    throw new Error('Missing schema $id property')
  }

  if (this.store[id] !== undefined) {
    throw new Error(`Schema with id '${id}' already declared!`)
  }

  this.store[id] = schema
}

Schemas.prototype.resolve = function (id) {
  if (this.store[id] === undefined) {
    const error = new Error(`Schema with id '${id}' does not exist!`)
    error.code = 404
    throw error
  }
  return this.store[id]
}

Schemas.prototype.resolveRefs = function (routeSchemas) {
  // save the schema in case the user is not using a standard json schema
  const swapSchema = Object.assign({}, routeSchemas)

  try {
    // this will work only for standard json schemas
    // other compilers such as Joi will fail
    this.traverse(routeSchemas)
    this.cleanId(routeSchemas)
  } catch (err) {
    // if we have failed because `resolve has thrown
    // let's rethrow the error and let avvio handle it
    if (err.code === 404) throw err
    return swapSchema
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

Schemas.prototype.traverse = function (schema) {
  for (var key in schema) {
    if (typeof schema[key] === 'string' && schema[key].slice(-1) === '#') {
      schema[key] = this.resolve(schema[key].slice(0, -1))
    }

    if (schema[key] !== null && typeof schema[key] === 'object') {
      this.traverse(schema[key])
    }
  }
}

Schemas.prototype.cleanId = function (schema) {
  for (var key in schema) {
    if (key === '$id') delete schema[key]
    if (schema[key] !== null && typeof schema[key] === 'object') {
      this.cleanId(schema[key])
    }
  }
}

Schemas.prototype.getSchemaAnyway = function (schema) {
  if (schema.oneOf || schema.allOf || schema.anyOf) return schema
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

module.exports = Schemas
