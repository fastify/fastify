'use strict'

const fastClone = require('rfdc')({ circles: false, proto: true })

const URI_NAME_FRAGMENT = /^#[A-Za-z]{1}[\w-:.]{0,}$/

function Schemas () {
  this.store = {}
}

Schemas.prototype.add = function (inputSchema) {
  const schema = fastClone(inputSchema)
  const id = schema['$id']
  if (id === undefined) {
    throw new Error('Missing schema $id property')
  }

  if (this.store[id] !== undefined) {
    throw new Error(`Schema with id '${id}' already declared!`)
  }

  this.store[id] = this.resolveRefs(schema, true)
}

Schemas.prototype.resolve = function (id) {
  if (this.store[id] === undefined) {
    const error = new Error(`Schema with id '${id}' does not exist!`)
    error.code = 404
    throw error
  }
  return this.store[id]
}

Schemas.prototype.resolveRefs = function (routeSchemas, dontClearId) {
  // let's check if our schemas have a custom prototype
  for (const key of ['headers', 'querystring', 'params', 'body']) {
    if (typeof routeSchemas[key] === 'object' && Object.getPrototypeOf(routeSchemas[key]) !== Object.prototype) {
      return routeSchemas
    }
  }

  // save the schema in case the user is not using a standard json schema
  const swapSchema = Object.assign({}, routeSchemas)

  try {
    // this will work only for standard json schemas
    // other compilers such as Joi will fail
    this.traverse(routeSchemas)

    // when a plugin uses the 'skip-override' and call addSchema
    // the same JSON will be pass throug all the avvio tree. In this case
    // it is not possible clean the id. The id will be cleared
    // in the startup phase by the call of validation.js. Details PR #1496
    if (dontClearId !== true) {
      this.cleanId(routeSchemas)
    }
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
    // resolve the `sharedSchemaId#' only if is not a standard $ref JSON Pointer
    if (typeof schema[key] === 'string' && key !== '$schema' && key !== '$ref' && schema[key].slice(-1) === '#') {
      schema[key] = this.resolve(schema[key].slice(0, -1))
    }

    if (schema[key] !== null && typeof schema[key] === 'object') {
      this.traverse(schema[key])
    }
  }
}

Schemas.prototype.cleanId = function (schema) {
  for (var key in schema) {
    if (key === '$id' && !URI_NAME_FRAGMENT.test(schema[key])) {
      delete schema[key]
    }
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
