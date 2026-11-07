'use strict'

const { buildSchemas } = require('./schemas')

/**
 * The defaults of the output Ajv pool.
 *
 * The output side validates *and* shapes the response payload, which is then
 * sent with `JSON.stringify`, so the defaults differ from the input side ones
 * and they favour the speed of the response:
 *
 * - `useDefaults: true` — a missing property that declares a `default` is
 *   filled in.
 * - `coerceTypes: true` — a response value is coerced into the declared type
 *   (`'42'` to `42`, `42` to `'42'`, `null` to `''`). A top-level primitive
 *   cannot be coerced in place, so it is sent as it is.
 * - `removeAdditional: true` — the properties that the schema does not
 *   describe are stripped only where the schema declares
 *   `additionalProperties: false`: the other ones are sent.
 * - `allErrors: false` — a single error is enough to reject the payload.
 * - `validateFormats: false` — checking the `format` keyword is the most
 *   expensive part of the validation.
 * - `strict: false` — a schema lint switch only. The output side must not
 *   reject a response schema for carrying an unknown or an annotation keyword
 *   (`example`, `discriminator`, ...) or for omitting `type`.
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
    buildInputValidator: null,
    buildOutputValidator: null
  }, opts?.compilersFactory)

  if (!compilersFactory.buildInputValidator) {
    const ValidatorSelector = require('@fastify/ajv-compiler')
    compilersFactory.buildInputValidator = ValidatorSelector()
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
    inputValidatorOptions: opts?.inputValidatorOptions,
    outputValidatorOptions: opts?.outputValidatorOptions,
    isCustomInputValidatorCompiler: typeof opts?.compilersFactory?.buildInputValidator === 'function',
    isCustomOutputValidatorCompiler: typeof opts?.compilersFactory?.buildOutputValidator === 'function'
  }

  return new SchemaController(undefined, option)
}

class SchemaController {
  constructor (parent, options) {
    this.opts = options || parent?.opts
    this.addedSchemas = false

    // A child context created by `register` inherits the compilersFactory of
    // its parent, so the adapters installed by `set*Compiler` in an ancestor
    // survive when the child rebuilds its compilers after an `addSchema`.
    this.compilersFactory = options ? this.opts.compilersFactory : parent.compilersFactory

    if (parent) {
      this.schemaBucket = this.opts.bucket(parent.getSchemas())
      this.inputValidatorCompiler = parent.getInputValidatorCompiler()
      this.outputValidatorCompiler = parent.getOutputValidatorCompiler()
      this.isCustomInputValidatorCompiler = parent.isCustomInputValidatorCompiler
      this.isCustomOutputValidatorCompiler = parent.isCustomOutputValidatorCompiler
      this.parent = parent
    } else {
      this.schemaBucket = this.opts.bucket()
      this.isCustomInputValidatorCompiler = this.opts.isCustomInputValidatorCompiler || false
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

  setInputValidatorCompiler (inputValidatorCompiler) {
    // Set up as if the fixed validator compiler had been provided
    // by a custom 'options.compilersFactory.buildInputValidator' that
    // always returns the same compiler object. This is required because:
    //
    // - setInputValidatorCompiler must immediately install a compiler to preserve
    //   legacy behavior
    // - setupInputValidator will recreate compilers from builders in some
    //   circumstances, so we have to install this adapter to make it
    //   behave the same if the legacy API is used
    //
    // The cloning of the compilersFactory object is necessary because
    // we are aliasing the parent compilersFactory if none was provided
    // to us (see constructor.)
    this.compilersFactory = Object.assign(
      {},
      this.compilersFactory,
      { buildInputValidator: () => inputValidatorCompiler })
    this.inputValidatorCompiler = inputValidatorCompiler
    this.isCustomInputValidatorCompiler = true
  }

  setOutputValidatorCompiler (outputValidatorCompiler) {
    // Same as setInputValidatorCompiler: the adapter makes setupOutputValidator
    // return this compiler when it rebuilds the compilers after an `addSchema`.
    this.compilersFactory = Object.assign(
      {},
      this.compilersFactory,
      { buildOutputValidator: () => outputValidatorCompiler })
    this.outputValidatorCompiler = outputValidatorCompiler
    this.isCustomOutputValidatorCompiler = true
  }

  getInputValidatorCompiler () {
    return this.inputValidatorCompiler || (this.parent && this.parent.getInputValidatorCompiler())
  }

  getInputValidatorBuilder () {
    return this.compilersFactory.buildInputValidator || (this.parent && this.parent.getInputValidatorBuilder())
  }

  getOutputValidatorCompiler () {
    return this.outputValidatorCompiler || (this.parent && this.parent.getOutputValidatorCompiler())
  }

  getOutputValidatorBuilder () {
    return this.compilersFactory.buildOutputValidator || (this.parent && this.parent.getOutputValidatorBuilder())
  }

  /**
   * This method will be called when an input validator must be setup.
   * Do not setup the compiler more than once
   */
  setupInputValidator () {
    const isReady = this.inputValidatorCompiler !== undefined && !this.addedSchemas
    if (isReady) {
      return
    }
    this.inputValidatorCompiler = this.getInputValidatorBuilder()(
      this.schemaBucket.getSchemas(),
      Object.assign({ customOptions: {}, plugins: [] }, this.opts.inputValidatorOptions)
    )
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
