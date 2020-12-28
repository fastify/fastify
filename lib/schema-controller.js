'use strict'

const { Schemas } = require('./schemas')

const Ajv = require('ajv')
const fastJsonStringify = require('fast-json-stringify')

let buildPerformanceValidator

module.exports = SchemaController
module.exports.buildSchemaController = buildSchemaController

/**
 * Called at every fastify context that is being created.
 * @param {object} parentSchemaCtrl: the SchemaController instance of the Fastify parent context
 * @return {object}:a new SchemaController
 */
function buildSchemaController (parentSchemaCtrl) {
  const contextSchemaCtrl = new SchemaController()

  if (parentSchemaCtrl) {
    contextSchemaCtrl.schemaBucket.store = parentSchemaCtrl.getSchemas()
    contextSchemaCtrl.setValidatorCompiler(parentSchemaCtrl.getValidatorCompiler())
    contextSchemaCtrl.setSerializerCompiler(parentSchemaCtrl.getSerializerCompiler())
    contextSchemaCtrl.parent = parentSchemaCtrl
  } else {
    // it is needed once at the server built
    buildPerformanceValidator = ValidatorSelector()
  }

  return contextSchemaCtrl
}

function SchemaController () {
  this.schemaBucket = new Schemas()
  this.validatorCompiler = undefined
  this.serializerCompiler = undefined
  this.parent = undefined
}

/**
 * When the dev will execute `fastify.addSchema` this method will be called
 * @param {object} schema: the JSON Schema object
 */
SchemaController.prototype.add = function add (schema) {
  return this.schemaBucket.add(schema)
}

/**
 * When the dev will execute `fastify.getSchema` this method will be called
 * @param {object} schemaId: the id that reference the JSON schema (usually the $id field)
 */
SchemaController.prototype.getSchema = function (schemaId) {
  return this.schemaBucket.getSchema(schemaId)
}

/**
 * When the dev will execute `fastify.getSchemas` this method will be called.
 * This should return all the schemas added by the user in the fastify context
 */
SchemaController.prototype.getSchemas = function () {
  return this.schemaBucket.getSchemas()
}

/**
 * When the dev will execute `fastify.setValidatorCompiler` this method will be called.
 * @param {function} validatorCompiler: the validation compiler factory
 */
SchemaController.prototype.setValidatorCompiler = function (validatorCompiler) {
  this.validatorCompiler = validatorCompiler
}

/**
 * When the dev will execute `fastify.setSerializerCompiler` this method will be called.
 * @param {function} serializerCompiler: the serialization compiler factory
 */
SchemaController.prototype.setSerializerCompiler = function (serializerCompiler) {
  this.serializerCompiler = serializerCompiler
}

/**
 * When the dev will execute `fastify.validatorCompiler` this method will be called.
 */
SchemaController.prototype.getValidatorCompiler = function () {
  return this.validatorCompiler || (this.parent && this.parent.getValidatorCompiler())
}

/**
 * When the dev will execute `fastify.serializerCompiler` this method will be called.
 */
SchemaController.prototype.getSerializerCompiler = function () {
  return this.serializerCompiler || (this.parent && this.parent.getSerializerCompiler())
}

/**
 * This method will be called when a validator must be setup.
 * Do not setup the compiler more than once
 * @param {object} serverOptions: the fastify server option
 */
SchemaController.prototype.setupValidator = function (serverOption) {
  const isReady = this.validatorCompiler !== undefined && !this.schemaBucket.hasNewSchemas()
  if (isReady) {
    return
  }
  this.validatorCompiler = buildPerformanceValidator(this.schemaBucket.getSchemas(), serverOption.ajv)
}

/**
 * This method will be called when a serializer must be setup.
 * Do not setup the compiler more than once
 * @param {object} serverOptions: the fastify server option
 */
SchemaController.prototype.setupSerializer = function (serverOption) {
  const isReady = this.serializerCompiler !== undefined && !this.schemaBucket.hasNewSchemas()
  if (isReady) {
    return
  }
  this.serializerCompiler = buildDefaultSerializer(this.schemaBucket.getSchemas())
}

function buildDefaultSerializer (externalSchemas) {
  return function ({ schema, method, url, httpStatus }) {
    return fastJsonStringify(schema, { schema: externalSchemas })
  }
}

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

  for (const schemaId in externalSchemas) {
    ajv.addSchema(externalSchemas[schemaId])
  }

  return function ({ schema, method, url, httpPart }) {
    return ajv.compile(schema)
  }
}
