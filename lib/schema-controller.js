'use strict'

const { Schemas, buildSchemas } = require('./schemas')

function SchemaController () {
  this.schemaBucket = new Schemas()
}

SchemaController.prototype.add = function add (schema) {
  return this.schemaBucket.add(schema)
}
SchemaController.prototype.getSchema = function getSchema (schemaId) {
  return this.schemaBucket.getSchema(schemaId)
}
SchemaController.prototype.getSchemas = function getSchemas () {
  return this.schemaBucket.getSchemas()
}
SchemaController.prototype.clone = function clone () {
  const wrapper = new SchemaController()
  wrapper.schemaBucket = buildSchemas(this.schemaBucket)
  return wrapper
}

module.exports = SchemaController
