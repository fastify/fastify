'use strict'

const { buildSchemas } = require('./schemas')

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

  const compilersFactory = Object.assign({
    buildValidator: null,
    buildSerializer: null
  }, opts?.compilersFactory)

  if (!compilersFactory.buildValidator) {
    const ValidatorSelector = require('@fastify/ajv-compiler')
    compilersFactory.buildValidator = ValidatorSelector()
  }
  if (!compilersFactory.buildSerializer) {
    const SerializerSelector = require('@fastify/fast-json-stringify-compiler')
    compilersFactory.buildSerializer = SerializerSelector()
  }

  const option = {
    bucket: (opts && opts.bucket) || buildSchemas,
    compilersFactory,
    isCustomValidatorCompiler: typeof opts?.compilersFactory?.buildValidator === 'function',
    isCustomSerializerCompiler: typeof opts?.compilersFactory?.buildSerializer === 'function'
  }

  return new SchemaController(undefined, option)
}

class SchemaController {
  constructor (parent, options) {
    this.opts = options || parent?.opts
    this.addedSchemas = false

    this.compilersFactory = this.opts.compilersFactory

    if (parent) {
      this.validatorBucket = this.opts.bucket(parent.getValidatorSchemas())
      this.serializerBucket = this.opts.bucket(parent.getSerializerSchemas())
      this.validatorCompiler = parent.getValidatorCompiler()
      this.serializerCompiler = parent.getSerializerCompiler()
      this.isCustomValidatorCompiler = parent.isCustomValidatorCompiler
      this.isCustomSerializerCompiler = parent.isCustomSerializerCompiler
      this.parent = parent
    } else {
      this.validatorBucket = this.opts.bucket()
      this.serializerBucket = this.opts.bucket()
      this.isCustomValidatorCompiler = this.opts.isCustomValidatorCompiler || false
      this.isCustomSerializerCompiler = this.opts.isCustomSerializerCompiler || false
    }
  }

  // Bucket interface
  add (schema, options) {
    this.addedSchemas = true

    let addValidator = true
    let addSerializer = true

    if (options) {
      if (options.validator !== undefined && options.serializer === undefined) {
        addSerializer = !options.validator
      } else if (options.serializer !== undefined && options.validator === undefined) {
        addValidator = !options.serializer
      } else {
        addValidator = options.validator !== false
        addSerializer = options.serializer !== false
      }
    }

    if (addValidator) this.validatorBucket.add(schema)
    if (addSerializer) this.serializerBucket.add(schema)

    return this
  }

  getSchema (schemaId) {
    return this.validatorBucket.getSchema(schemaId) || this.serializerBucket.getSchema(schemaId)
  }

  getSchemas () {
    return Object.assign({}, this.serializerBucket.getSchemas(), this.validatorBucket.getSchemas())
  }

  getValidatorSchemas () {
    return this.validatorBucket.getSchemas()
  }

  getSerializerSchemas () {
    return this.serializerBucket.getSchemas()
  }

  setValidatorCompiler (validatorCompiler) {
    // Set up as if the fixed validator compiler had been provided
    // by a custom 'options.compilersFactory.buildValidator' that
    // always returns the same compiler object. This is required because:
    //
    // - setValidatorCompiler must immediately install a compiler to preserve
    //   legacy behavior
    // - setupValidator will recreate compilers from builders in some
    //   circumstances, so we have to install this adapter to make it
    //   behave the same if the legacy API is used
    //
    // The cloning of the compilersFactory object is necessary because
    // we are aliasing the parent compilersFactory if none was provided
    // to us (see constructor.)
    this.compilersFactory = Object.assign(
      {},
      this.compilersFactory,
      { buildValidator: () => validatorCompiler })
    this.validatorCompiler = validatorCompiler
    this.isCustomValidatorCompiler = true
  }

  setSerializerCompiler (serializerCompiler) {
    // Set up as if the fixed serializer compiler had been provided
    // by a custom 'options.compilersFactory.buildSerializer' that
    // always returns the same compiler object. This is required because:
    //
    // - setSerializerCompiler must immediately install a compiler to preserve
    //   legacy behavior
    // - setupSerializer will recreate compilers from builders in some
    //   circumstances, so we have to install this adapter to make it
    //   behave the same if the legacy API is used
    //
    // The cloning of the compilersFactory object is necessary because
    // we are aliasing the parent compilersFactory if none was provided
    // to us (see constructor.)
    this.compilersFactory = Object.assign(
      {},
      this.compilersFactory,
      { buildSerializer: () => serializerCompiler })
    this.serializerCompiler = serializerCompiler
    this.isCustomSerializerCompiler = true
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
   * @param {object} serverOptions the fastify server options
   */
  setupValidator (serverOptions) {
    const isReady = this.validatorCompiler !== undefined && !this.addedSchemas
    if (isReady) {
      return
    }
    this.validatorCompiler = this.getValidatorBuilder()(this.validatorBucket.getSchemas(), serverOptions.ajv)
  }

  /**
   * This method will be called when a serializer must be setup.
   * Do not setup the compiler more than once
   * @param {object} serverOptions the fastify server options
   */
  setupSerializer (serverOptions) {
    const isReady = this.serializerCompiler !== undefined && !this.addedSchemas
    if (isReady) {
      return
    }

    this.serializerCompiler = this.getSerializerBuilder()(
      this.serializerBucket.getSchemas(),
      serverOptions.serializerOpts
    )
  }
}

SchemaController.buildSchemaController = buildSchemaController
module.exports = SchemaController
