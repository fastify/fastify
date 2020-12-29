'use strict'

const { buildSchema } = require('./schemas')
const {
  ValidatorSelector,
  SerializerCompiler: buildDefaultSerializer
} = require('./schema-compilers')

const defaultControllerOpts = {
  bucket: buildSchema,
  compilersFactory: {
    buildValidator: undefined, // load once per fastify server start
    buildSerializer: buildDefaultSerializer
  }
}

module.exports = SchemaController
module.exports.buildSchemaController = buildSchemaController
module.exports.buildContext = buildContext

/**
 * Called at every fastify context that is being created.
 * @param {object} parentSchemaCtrl: the SchemaController instance of the Fastify parent context
 * @return {object}:a new SchemaController
 */
function buildSchemaController (opts) {
  const option = opts || {
    bucket: buildSchema,
    compilersFactory: {
      buildValidator: ValidatorSelector(),
      buildSerializer: buildDefaultSerializer
    }
  }

  return new SchemaController(option)
}

function buildContext (parentSchemaCtrl) {
  const contextSchemaCtrl = new SchemaController(parentSchemaCtrl.opts)
  contextSchemaCtrl.schemaBucket.store = parentSchemaCtrl.getSchemas() // TODO
  contextSchemaCtrl.setValidatorCompiler(parentSchemaCtrl.getValidatorCompiler())
  contextSchemaCtrl.setSerializerCompiler(parentSchemaCtrl.getSerializerCompiler())
  contextSchemaCtrl.parent = parentSchemaCtrl
  return contextSchemaCtrl
}

function SchemaController (option) {
  this.opts = option || defaultControllerOpts

  this.schemaBucket = this.opts.bucket()
  this.compilersFactory = this.opts.compilersFactory

  this.validatorCompiler = undefined
  this.serializerCompiler = undefined
  this.parent = undefined
}

Object.defineProperties(SchemaController.prototype, {
  // Bucket interface
  add: {
    value: function (schema) {
      return this.schemaBucket.add(schema)
    }
  },
  getSchema: {
    value: function (schemaId) {
      return this.schemaBucket.getSchema(schemaId)
    }
  },
  getSchemas: {
    value: function () {
      return this.schemaBucket.getSchemas()
    }
  },

  // Schema Controller compilers holder
  setValidatorCompiler: {
    value: function (validatorCompiler) {
      this.validatorCompiler = validatorCompiler
    }
  },
  setSerializerCompiler: {
    value: function (serializerCompiler) {
      this.serializerCompiler = serializerCompiler
    }
  },
  getValidatorCompiler: {
    value: function () {
      return this.validatorCompiler || (this.parent && this.parent.getValidatorCompiler())
    }
  },
  getSerializerCompiler: {
    value: function () {
      return this.serializerCompiler || (this.parent && this.parent.getSerializerCompiler())
    }
  }
})

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
  this.validatorCompiler = this.compilersFactory.buildValidator(this.schemaBucket.getSchemas(), serverOption.ajv)
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
  this.serializerCompiler = this.compilersFactory.buildSerializer(this.schemaBucket.getSchemas())
}
