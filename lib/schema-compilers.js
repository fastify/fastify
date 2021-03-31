'use strict'

const Ajv = require('ajv')
const fastJsonStringify = require('fast-json-stringify')

function ValidatorSelector () {
  const validatorPool = new Map()
  const cache = new Map()
  cache.put = cache.set

  return function buildCompilerFromPool (externalSchemas, options) {
    const externals = JSON.stringify(externalSchemas)
    const ajvConfig = JSON.stringify(options.customOptions)

    const uniqueAjvKey = `${externals}${ajvConfig}`
    if (validatorPool.has(uniqueAjvKey)) {
      return validatorPool.get(uniqueAjvKey)
    }

    const compiler = ValidatorCompiler(externalSchemas, options, cache)
    validatorPool.set(uniqueAjvKey, compiler)

    return compiler
  }
}

function ValidatorCompiler (externalSchemas, options, cache) {
  // This instance of Ajv is private
  // it should not be customized or used
  const ajv = new Ajv(Object.assign({
    coerceTypes: true,
    useDefaults: true,
    removeAdditional: true,
    // Explicitly set allErrors to `false`.
    // When set to `true`, a DoS attack is possible.
    allErrors: false,
    nullable: true
  }, options.customOptions, { cache }))

  if (options.plugins && options.plugins.length > 0) {
    for (const plugin of options.plugins) {
      plugin[0](ajv, plugin[1])
    }
  }

  const sourceSchemas = Object.values(externalSchemas)
  for (const extSchema of sourceSchemas) {
    ajv.addSchema(extSchema)
  }

  return function ({ schema, method, url, httpPart }) {
    // Ajv does not support compiling two schemas with the same
    // id inside the same instance. Therefore if we have already
    // compiled the schema with the given id, we just return it.
    if (schema.$id) {
      const stored = ajv.getSchema(schema.$id)
      if (stored) {
        return stored
      }
    }
    return ajv.compile(schema)
  }
}

function SerializerCompiler (externalSchemas) {
  return function ({ schema, method, url, httpStatus }) {
    return fastJsonStringify(schema, { schema: externalSchemas })
  }
}

module.exports.ValidatorSelector = ValidatorSelector
module.exports.SerializerCompiler = SerializerCompiler
