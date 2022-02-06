'use strict'

const { buildSchemas } = require('./schemas')
const { serializerCompiler } = require('./schema-compilers')
const ValidatorSelector = require('@fastify/ajv-compiler')

/**
 * Called at every fastify context that is being created.
 * @param {object} parentSchemaCtrl: the SchemaController instance of the Fastify parent context
 * @param {object} opts: the `schemaController` server option. It can be undefined when a parentSchemaCtrl is set
 * @return {object}:a new SchemaController
 */
function buildSchemaController (parentSchemaCtrl, opts) {
  if (parentSchemaCtrl) {
    return new SchemaController(parentSchemaCtrl, opts)
  }

  let compilersFactory = {
    buildValidator: ValidatorSelector(),
    buildSerializer: serializerCompiler
  }
  if (opts && opts.compilersFactory) {
    compilersFactory = Object.assign(compilersFactory, opts.compilersFactory)
  }

  const option = {
    bucket: (opts && opts.bucket) || buildSchemas,
    compilersFactory
  }

  return new SchemaController(undefined, option)
}

class SchemaController {
  constructor (parent, options) {
    this.opts = options || (parent && parent.opts)
    this.addedSchemas = false

    this.compilersFactory = this.opts.compilersFactory

    if (parent) {
      this.schemaBucket = this.opts.bucket(parent.getSchemas())
      this.validatorCompiler = parent.getValidatorCompiler()
      this.serializerCompiler = parent.getSerializerCompiler()
      this.parent = parent
    } else {
      this.schemaBucket = this.opts.bucket()
    }
  }

  // Bucket interface
  add (schema) {
    this.addedSchemas = true
    return this.schemaBucket.add(schema)
  }

  getSchema (schemaId) {
    return this.schemaBucket.getSchema(schemaId)
  }

  getSchemas () {
    return this.schemaBucket.getSchemas()
  }

  // Schema Controller compilers holder
  setValidatorCompiler (validatorCompiler) {
    this.validatorCompiler = validatorCompiler
  }

  setSerializerCompiler (serializerCompiler) {
    this.serializerCompiler = serializerCompiler
  }

  getValidatorCompiler () {
    return this.validatorCompiler || (this.parent && this.parent.getValidatorCompiler())
  }

  getSerializerCompiler () {
    return this.serializerCompiler || (this.parent && this.parent.getSerializerCompiler())
  }

  getSerializerBuilder () {
    return this.compilersFactory.buildSerializer || (this.parent && this.parent.getSerializerBuilder())
  }

  getValidatorBuilder () {
    return this.compilersFactory.buildValidator || (this.parent && this.parent.getValidatorBuilder())
  }

  /**
   * This method will be called when a validator must be setup.
   * Do not setup the compiler more than once
   * @param {object} serverOptions: the fastify server option
   */
  setupValidator (serverOption) {
    const isReady = this.validatorCompiler !== undefined && !this.addedSchemas
    if (isReady) {
      return
    }
    this.validatorCompiler = this.getValidatorBuilder()(this.schemaBucket.getSchemas(), serverOption.ajv)
  }

  /**
   * This method will be called when a serializer must be setup.
   * Do not setup the compiler more than once
   * @param {object} serverOptions: the fastify server option
   */
  setupSerializer (serverOption) {
    const isReady = this.serializerCompiler !== undefined && !this.addedSchemas
    if (isReady) {
      return
    }

    this.serializerCompiler = this.getSerializerBuilder()(this.schemaBucket.getSchemas(), serverOption.serializerOpts)
  }
}

SchemaController.buildSchemaController = buildSchemaController
module.exports = SchemaController
