'use strict'

const Ajv = require('ajv')
const ajv = new Ajv({ removeAdditional: true, useDefaults: true, coerceTypes: true })
const deepClone = require('rfdc')({ circles: true, proto: false })
const {
  codes: {
    FST_ERR_INIT_OPTS_INVALID
  }
} = require('./errors')

// We add a keyword that allow us to set default values
ajv.addKeyword('setDefaultValue', {
  modifying: true,
  validate: function (schemaParamValue, validatedParamValue, validationSchemaObject, currentDataPath, validatedParamObject, validatedParam) {
    validatedParamObject[validatedParam] = schemaParamValue

    return true
  },
  errors: false
})

function validateInitialConfig (options, defaults) {
  const opts = deepClone(options)

  const optsSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      bodyLimit: { type: 'integer', default: defaults.bodyLimit },
      caseSensitive: { type: 'boolean', default: defaults.caseSensitive },
      http2: { type: 'boolean' },
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
      ignoreTrailingSlash: { type: 'boolean', default: defaults.ignoreTrailingSlash },
      maxParamLength: { type: 'integer', default: defaults.maxParamLength },
      onProtoPoisoning: { type: 'string', default: defaults.onProtoPoisoning },
      pluginTimeout: { type: 'integer', default: defaults.pluginTimeout },
      requestIdHeader: { type: 'string', default: defaults.requestIdHeader }
    }
  }

  const validate = ajv.compile(optsSchema)
  const isOptionValid = validate(opts)

  if (!isOptionValid) {
    const error = new FST_ERR_INIT_OPTS_INVALID(validate.errors.map(e => e.message))
    error.errors = validate.errors
    throw error
  }

  return deepFreezeObject(opts)
}

function deepFreezeObject (object) {
  const properties = Object.getOwnPropertyNames(object)

  for (const name of properties) {
    const value = object[name]

    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
      continue
    }

    object[name] = value && typeof value === 'object' ? deepFreezeObject(value) : value
  }

  return Object.freeze(object)
}

module.exports = validateInitialConfig
module.exports.utils = { deepFreezeObject }
