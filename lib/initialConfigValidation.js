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

const optsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    bodyLimit: { type: 'integer', default: 1024 * 1024 },
    caseSensitive: { type: 'boolean', default: true },
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
    ignoreTrailingSlash: { type: 'boolean', default: false },
    maxParamLength: { type: 'integer', default: 100 },
    onProtoPoisoning: { type: 'string', default: 'error' },
    pluginTimeout: { type: 'integer', default: 10000 },
    requestIdHeader: { type: 'string', default: 'request-id' }
  }
}

const validate = ajv.compile(optsSchema)

function validateInitialConfig (options) {
  const opts = deepClone(options)

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
