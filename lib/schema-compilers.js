'use strict'

const fastJsonStringify = require('fast-json-stringify')

function serializerFactory (externalSchemas, serializerOpts) {
  const opts = Object.assign({}, serializerOpts, { schema: externalSchemas })
  return function responseSchemaCompiler ({ schema /* method, url, httpStatus */ }) {
    return fastJsonStringify(schema, opts)
  }
}

module.exports.serializerCompiler = serializerFactory
