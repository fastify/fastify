'use strict'

const { buildSchemas } = require('./schemas')

/**
 * The defaults of the output Ajv pool.
 *
 * The output side validates *and* shapes the response payload, so the defaults
 * differ from the input side ones. They reproduce what `fast-json-stringify`
 * writes today and they favour the speed of the response:
 *
 * - `useDefaults: true` — a missing property that declares a `default` is
 *   filled in, exactly like `fast-json-stringify` does.
 * - `coerceTypes: true` — a response value is coerced into the declared type
 *   (`'42'` to `42`, `42` to `'42'`, `null` to `''`), exactly like
 *   `fast-json-stringify` does.
 * - `removeAdditional: true` — the properties that the schema does not
 *   describe are stripped where the schema declares
 *   `additionalProperties: false`.
 * - `allErrors: false` — a single error is enough to reject the payload.
 * - `validateFormats: false` — `fast-json-stringify` never checked the
 *   `format` keyword, and checking it is the most expensive part of the
 *   validation.
 * - `strict: false` — a schema lint switch only. `fast-json-stringify` never
 *   linted the response schemas, so the output side must not reject a schema
 *   for carrying an unknown or an annotation keyword (`example`,
 *   `discriminator`, ...) or for omitting `type`.
 *
 * The payload returned by the handler is mutated in place. Every default can
 * be overridden through `schemaController.outputValidatorOptions.customOptions`.
 */
const outputValidatorDefaults = {
  useDefaults: true,
  coerceTypes: true,
  removeAdditional: true,
  allErrors: false,
  validateFormats: false,
  strict: false
}

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
    buildSerializer: null,
    buildOutputValidator: null
  }, opts?.compilersFactory)

  if (!compilersFactory.buildValidator) {
    const ValidatorSelector = require('@fastify/ajv-compiler')
    compilersFactory.buildValidator = ValidatorSelector()
  }
  if (!compilersFactory.buildSerializer) {
    const SerializerSelector = require('@fastify/fast-json-stringify-compiler')
    compilersFactory.buildSerializer = SerializerSelector()
  }
  if (!compilersFactory.buildOutputValidator) {
    // A dedicated pool, so the output validators never share an Ajv instance
    // with the input ones.
    const ValidatorSelector = require('@fastify/ajv-compiler')
    compilersFactory.buildOutputValidator = ValidatorSelector()
  }

  const option = {
    bucket: (opts && opts.bucket) || buildSchemas,
    compilersFactory,
    outputValidatorOptions: opts?.outputValidatorOptions,
    isCustomValidatorCompiler: typeof opts?.compilersFactory?.buildValidator === 'function',
    isCustomSerializerCompiler: typeof opts?.compilersFactory?.buildSerializer === 'function',
    isCustomOutputValidatorCompiler: typeof opts?.compilersFactory?.buildOutputValidator === 'function'
  }

  return new SchemaController(undefined, option)
}

class SchemaController {
  constructor (parent, options) {
    this.opts = options || parent?.opts
    this.addedSchemas = false

    this.compilersFactory = this.opts.compilersFactory

    if (parent) {
      this.schemaBucket = this.opts.bucket(parent.getSchemas())
      this.validatorCompiler = parent.getValidatorCompiler()
      this.serializerCompiler = parent.getSerializerCompiler()
      this.outputValidatorCompiler = parent.getOutputValidatorCompiler()
      this.isCustomValidatorCompiler = parent.isCustomValidatorCompiler
      this.isCustomSerializerCompiler = parent.isCustomSerializerCompiler
      this.isCustomOutputValidatorCompiler = parent.isCustomOutputValidatorCompiler
      this.parent = parent
    } else {
      this.schemaBucket = this.opts.bucket()
      this.isCustomValidatorCompiler = this.opts.isCustomValidatorCompiler || false
      this.isCustomSerializerCompiler = this.opts.isCustomSerializerCompiler || false
      this.isCustomOutputValidatorCompiler = this.opts.isCustomOutputValidatorCompiler || false
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

  getOutputValidatorCompiler () {
    return this.outputValidatorCompiler || (this.parent && this.parent.getOutputValidatorCompiler())
  }

  getOutputValidatorBuilder () {
    return this.compilersFactory.buildOutputValidator || (this.parent && this.parent.getOutputValidatorBuilder())
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
    this.validatorCompiler = this.getValidatorBuilder()(this.schemaBucket.getSchemas(), serverOptions.ajv)
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

    this.serializerCompiler = this.getSerializerBuilder()(this.schemaBucket.getSchemas(), serverOptions.serializerOpts)
  }

  /**
   * This method will be called when an output validator must be setup.
   * Do not setup the compiler more than once
   */
  setupOutputValidator () {
    const isReady = this.outputValidatorCompiler !== undefined && !this.addedSchemas
    if (isReady) {
      return
    }

    // The `customOptions` are merged on top of the output defaults: the
    // user's values win. The other options (`plugins`, `onCreate`) are
    // forwarded as they are.
    const outputValidatorOptions = this.opts.outputValidatorOptions || {}
    this.outputValidatorCompiler = this.getOutputValidatorBuilder()(
      this.schemaBucket.getSchemas(),
      Object.assign({}, outputValidatorOptions, {
        customOptions: Object.assign({}, outputValidatorDefaults, outputValidatorOptions.customOptions)
      })
    )
  }
}

SchemaController.buildSchemaController = buildSchemaController
module.exports = SchemaController
