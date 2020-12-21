'use strict'

const { Schemas } = require('./schemas')

const Ajv = require('ajv')
const fastJsonStringify = require('fast-json-stringify')

let buildPerformanceValidator

function SchemaController () {
  this.schemaBucket = new Schemas()
  this.validatorCompiler = undefined
  this.serializerCompiler = undefined
  this.parent = undefined
}

SchemaController.prototype.setup = function () {
  // TODO it is not an instance value nor it cannot be global
  buildPerformanceValidator = ValidatorSelector()
}

SchemaController.prototype.clone = function clone () {
  const wrapper = new SchemaController()

  const clonedSchema = new Schemas()
  Object.values(this.schemaBucket.getSchemas())
    .forEach(_ => clonedSchema.add(_))
  clonedSchema.newSchemasAdded = false

  wrapper.schemaBucket = clonedSchema
  wrapper.validatorCompiler = this.validatorCompiler
  wrapper.serializerCompiler = this.serializerCompiler
  wrapper.parent = this
  return wrapper
}

SchemaController.prototype.add = function add (schema) { return this.schemaBucket.add(schema) }
SchemaController.prototype.getSchema = function getSchema (schemaId) { return this.schemaBucket.getSchema(schemaId) }
SchemaController.prototype.getSchemas = function getSchemas () { return this.schemaBucket.getSchemas() }

SchemaController.prototype.setValidatorCompiler = function (validatorCompiler) { this.validatorCompiler = validatorCompiler }
SchemaController.prototype.setSerializerCompiler = function (serializerCompiler) { this.serializerCompiler = serializerCompiler }
SchemaController.prototype.getValidatorCompiler = function () {
  return this.validatorCompiler || (this.parent && this.parent.getValidatorCompiler())
}
SchemaController.prototype.getSerializerCompiler = function () {
  return this.serializerCompiler || (this.parent && this.parent.getSerializerCompiler())
}

SchemaController.prototype.hasReadyValidator = function () {
  return this.validatorCompiler !== undefined && !this.schemaBucket.hasNewSchemas()
}
SchemaController.prototype.hasReadySerializer = function () {
  return this.serializerCompiler !== undefined && !this.schemaBucket.hasNewSchemas()
}

SchemaController.prototype.setupValidator = function (ajvOptions) {
  this.validatorCompiler = buildPerformanceValidator(this.schemaBucket.getSchemas(), ajvOptions)
}
SchemaController.prototype.setupSerializer = function () {
  this.serializerCompiler = buildDefaultSerializer(this.schemaBucket.getSchemas())
}

module.exports = SchemaController

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

  Object.values(externalSchemas).forEach(s => ajv.addSchema(s))

  return ({ schema, method, url, httpPart }) => {
    return ajv.compile(schema)
  }
}
