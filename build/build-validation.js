'use strict'

const AjvStandaloneCompiler = require('@fastify/ajv-compiler/standalone')
const { _ } = require('ajv')
const fs = require('node:fs')
const path = require('node:path')

const factory = AjvStandaloneCompiler({
  readMode: false,
  storeFunction (routeOpts, schemaValidationCode) {
    const moduleCode = `// This file is autogenerated by ${__filename.replace(__dirname, 'build')}, do not edit
/* c8 ignore start */
${schemaValidationCode}

module.exports.defaultInitOptions = ${JSON.stringify(defaultInitOptions)}
/* c8 ignore stop */
`

    const file = path.join(__dirname, '..', 'lib', 'configValidator.js')
    fs.writeFileSync(file, moduleCode)
    console.log(`Saved ${file} file successfully`)
  }
})

const defaultInitOptions = {
  connectionTimeout: 0, // 0 sec
  keepAliveTimeout: 72000, // 72 seconds
  forceCloseConnections: undefined, // keep-alive connections
  maxRequestsPerSocket: 0, // no limit
  requestTimeout: 0, // no limit
  bodyLimit: 1024 * 1024, // 1 MiB
  caseSensitive: true,
  allowUnsafeRegex: false,
  disableRequestLogging: false,
  ignoreTrailingSlash: false,
  ignoreDuplicateSlashes: false,
  maxParamLength: 100,
  onProtoPoisoning: 'error',
  onConstructorPoisoning: 'error',
  pluginTimeout: 10000,
  requestIdHeader: false,
  requestIdLogLabel: 'reqId',
  http2SessionTimeout: 72000, // 72 seconds
  exposeHeadRoutes: true,
  useSemicolonDelimiter: false
}

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    connectionTimeout: { type: 'integer', default: defaultInitOptions.connectionTimeout },
    keepAliveTimeout: { type: 'integer', default: defaultInitOptions.keepAliveTimeout },
    forceCloseConnections: {
      oneOf: [
        {
          type: 'string',
          pattern: 'idle'
        },
        {
          type: 'boolean'
        }
      ]
    },
    maxRequestsPerSocket: { type: 'integer', default: defaultInitOptions.maxRequestsPerSocket, nullable: true },
    requestTimeout: { type: 'integer', default: defaultInitOptions.requestTimeout },
    bodyLimit: { type: 'integer', default: defaultInitOptions.bodyLimit },
    caseSensitive: { type: 'boolean', default: defaultInitOptions.caseSensitive },
    allowUnsafeRegex: { type: 'boolean', default: defaultInitOptions.allowUnsafeRegex },
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
    ignoreTrailingSlash: { type: 'boolean', default: defaultInitOptions.ignoreTrailingSlash },
    ignoreDuplicateSlashes: { type: 'boolean', default: defaultInitOptions.ignoreDuplicateSlashes },
    disableRequestLogging: {
      type: 'boolean',
      default: false
    },
    maxParamLength: { type: 'integer', default: defaultInitOptions.maxParamLength },
    onProtoPoisoning: { type: 'string', default: defaultInitOptions.onProtoPoisoning },
    onConstructorPoisoning: { type: 'string', default: defaultInitOptions.onConstructorPoisoning },
    pluginTimeout: { type: 'integer', default: defaultInitOptions.pluginTimeout },
    requestIdHeader: { anyOf: [{ type: 'boolean' }, { type: 'string' }], default: defaultInitOptions.requestIdHeader },
    requestIdLogLabel: { type: 'string', default: defaultInitOptions.requestIdLogLabel },
    http2SessionTimeout: { type: 'integer', default: defaultInitOptions.http2SessionTimeout },
    exposeHeadRoutes: { type: 'boolean', default: defaultInitOptions.exposeHeadRoutes },
    useSemicolonDelimiter: { type: 'boolean', default: defaultInitOptions.useSemicolonDelimiter },
    // deprecated style of passing the versioning constraint
    versioning: {
      type: 'object',
      additionalProperties: true,
      required: ['storage', 'deriveVersion'],
      properties: {
        storage: { },
        deriveVersion: { }
      }
    },
    constraints: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        required: ['name', 'storage', 'validate', 'deriveConstraint'],
        additionalProperties: true,
        properties: {
          name: { type: 'string' },
          storage: { },
          validate: { },
          deriveConstraint: { }
        }
      }
    }
  }
}

const compiler = factory({}, {
  customOptions: {
    code: {
      source: true,
      lines: true,
      optimize: 3
    },
    removeAdditional: true,
    useDefaults: true,
    coerceTypes: true,
    keywords: [
      {
        keyword: 'setDefaultValue',
        $data: true,
        // error: false,
        modifying: true,
        valid: true,
        code (keywordCxt) {
          const { gen, it, schemaValue } = keywordCxt
          const logicCode = gen.assign(_`${it.parentData}[${it.parentDataProperty}]`, schemaValue)
          return logicCode
        }
      }
    ]
  }
})

compiler({ schema })
