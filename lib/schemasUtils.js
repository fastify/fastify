'use strict'

const draft7Keys = [
  '$comment',
  '$id',
  '$ref',
  '$schema',
  'additionalItems',
  'additionalProperties',
  'allOf',
  'anyOf',
  'const',
  'contains',
  'contentEncoding',
  'contentMediaType',
  'default',
  'definitions',
  'dependencies',
  'description',
  'else',
  'enum',
  'examples',
  'exclusiveMaximum',
  'exclusiveMinimum',
  'format',
  'if',
  'items',
  'maxItems',
  'maxLength',
  'maxProperties',
  'maximum',
  'minItems',
  'minLength',
  'minProperties',
  'minimum',
  'multipleOf',
  'not',
  'oneOf',
  'pattern',
  'patternProperties',
  'properties',
  'propertyNames',
  'readOnly',
  'required',
  'then',
  'title',
  'type',
  'uniqueItems'
]

function isContentSchema (schema) {
  for (const key of Object.keys(schema)) {
    if (draft7Keys.includes(key)) {
      return true
    }
  }

  return false
}

module.exports = {
  isContentSchema
}
