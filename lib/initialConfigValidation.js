'use strict'

const Ajv = require('ajv')
const ajv = new Ajv({ removeAdditional: true, useDefaults: true, coerceTypes: true })

// We add a keyword that allow us to set default values
ajv.addKeyword('setDefaultValue', {
  modifying: true,
  validate: function (schemaParamValue, validatedParamValue, validationSchemaObject, currentDataPath, validatedParamObject, validatedParam) {
    validatedParamObject[validatedParam] = schemaParamValue

    return true
  },
  errors: false
})

const optsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    bodyLimit: { type: 'integer' },
    caseSensitive: { type: 'boolean' },
    http2: {
      oneOf: [
        { type: 'boolean' },
        { type: 'null' }
      ]
    },
    https: {
      if: {
        not: {
          oneOf: [
            { type: 'boolean' },
            { type: 'null' },
            {
              type: 'object',
              additionalProperties: false,
              required: ['allowHTTP1'],
              properties: {
                allowHTTP1: { type: 'boolean' }
              }
            }
          ]
        }
      },
      then: { setDefaultValue: true }
    },
    ignoreTrailingSlash: { type: 'boolean' },
    maxParamLength: { type: 'integer' },
    onProtoPoisoning: { type: 'string' },
    pluginTimeout: { type: 'integer' },
    requestIdHeader: { type: 'string' }
  }
}

const validate = ajv.compile(optsSchema)

function validateInitialConfig (opts) {
  const isOptionValid = validate(opts)

  if (!isOptionValid) {
    const error = new Error(validate.errors.map(e => e.message))
    error.errors = validate.errors
    throw error
  }

  return opts
}

module.exports = validateInitialConfig
