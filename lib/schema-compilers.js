'use strict'

const fastJsonStringify = require('fast-json-stringify')

function serializerFactory (externalSchemas) {
  return function responseSchemaCompiler ({ schema /* method, url, httpStatus */ }) {
    return fastJsonStringify(schema, { schema: externalSchemas })
  }
}

module.exports.serializerCompiler = serializerFactory
