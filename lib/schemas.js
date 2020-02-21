'use strict'

const fastClone = require('rfdc')({ circles: false, proto: true })
const { kSchemaVisited } = require('./symbols')
const kFluentSchema = Symbol.for('fluent-schema-object')

const {
  codes: {
    FST_ERR_SCH_MISSING_ID,
    FST_ERR_SCH_ALREADY_PRESENT,
    FST_ERR_SCH_NOT_PRESENT,
    FST_ERR_SCH_DUPLICATE
  }
} = require('./errors')

const URI_NAME_FRAGMENT = /^#[A-Za-z]{1}[\w-:.]{0,}$/

function Schemas () {
  this.store = {}
}

Schemas.prototype.add = function (inputSchema, refResolver) {
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

  this.store[id] = this.resolveRefs(schema, true, refResolver)
}

Schemas.prototype.resolve = function (id) {
  if (this.store[id] === undefined) {
    throw new FST_ERR_SCH_NOT_PRESENT(id)
  }
  return Object.assign({}, this.store[id])
}

Schemas.prototype.resolveRefs = function (routeSchemas, dontClearId, refResolver) {
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

  // let's check if our schemas have a custom prototype
  for (const key of ['headers', 'querystring', 'params', 'body']) {
    if (typeof routeSchemas[key] === 'object' && Object.getPrototypeOf(routeSchemas[key]) !== Object.prototype) {
      return routeSchemas
    }
  }

  // See issue https://github.com/fastify/fastify/issues/1767
  const cachedSchema = Object.assign({}, routeSchemas)

  try {
    // this will work only for standard json schemas
    // other compilers such as Joi will fail
    this.traverse(routeSchemas, refResolver)

    // when a plugin uses the 'skip-override' and call addSchema
    // the same JSON will be pass throug all the avvio tree. In this case
    // it is not possible clean the id. The id will be cleared
    // in the startup phase by the call of validation.js. Details PR #1496
    if (dontClearId !== true) {
      this.cleanId(routeSchemas)
    }
  } catch (err) {
    // if we have failed because `resolve` has thrown
    // let's rethrow the error and let avvio handle it
    if (/FST_ERR_SCH_*/.test(err.code)) throw err

    // otherwise, the schema must not be a JSON schema
    // so we let the user configured schemaCompiler handle it
    return cachedSchema
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

  routeSchemas[kSchemaVisited] = true
  return routeSchemas
}

Schemas.prototype.traverse = function (schema, refResolver) {
  for (var key in schema) {
    // resolve the `sharedSchemaId#' only if is not a standard $ref JSON Pointer
    if (typeof schema[key] === 'string' && key !== '$schema' && key !== '$ref' && schema[key].slice(-1) === '#') {
      schema[key] = this.resolve(schema[key].slice(0, -1))
    } else if (key === '$ref' && refResolver) {
      const refValue = schema[key]

      const framePos = refValue.indexOf('#')
      const refId = framePos >= 0 ? refValue.slice(0, framePos) : refValue
      if (refId.length > 0 && !this.store[refId]) {
        const resolvedSchema = refResolver(refId)
        if (resolvedSchema) {
          this.add(resolvedSchema, refResolver)
        }
      }
    }

    if (schema[key] !== null && typeof schema[key] === 'object' &&
    (key !== 'enum' || (key === 'enum' && schema.type !== 'string'))) {
      // don't traverse non-object values and the `enum` keyword when used for string type
      this.traverse(schema[key], refResolver)
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
