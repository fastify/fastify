'use strict'

const fastJsonStringify = require('fast-json-stringify')

function SerializerCompiler (externalSchemas) {
  return function ({ schema, method, url, httpStatus }) {
    return fastJsonStringify(schema, { schema: externalSchemas })
  }
}

module.exports.SerializerCompiler = SerializerCompiler
