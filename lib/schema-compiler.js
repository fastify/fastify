'use strict'

const Ajv = require('ajv')

function ValidatorCompiler (externalSchemas, options, cache) {
  // This instance of Ajv is private
  // it should not be customized or used
  const ajv = new Ajv(Object.assign({
    coerceTypes: true,
    useDefaults: true,
    removeAdditional: true,
    allErrors: true,
    nullable: true
  }, options.customOptions, { cache }))

  if (options.plugins && options.plugins.length > 0) {
    for (const plugin of options.plugins) {
      plugin[0](ajv, plugin[1])
    }
  }

  if (Array.isArray(externalSchemas)) {
    externalSchemas.forEach(s => ajv.addSchema(s))
  }

  return (httpPart, schema) => {
    // TODO here we can store the compiled schemas and use them to improve startup time
    return ajv.compile(schema)
  }
}

module.exports.ValidatorCompiler = ValidatorCompiler
