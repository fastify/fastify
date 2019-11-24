'use strict'

const test = require('tap').test
const { Schemas } = require('../../lib/schemas')

test('Should not change resolved schema', t => {
  t.plan(4)

  const schemas = new Schemas()
  schemas.add({
    $id: 'A',
    field: 'value'
  })
  const schema = {
    a: 'A#'
  }
  const resolvedSchema = schemas.resolveRefs(schema)

  t.same(resolvedSchema.a, {
    field: 'value'
  })
  t.same(resolvedSchema.$id, undefined)

  schemas.getJsonSchemas()

  t.same(resolvedSchema.a, {
    field: 'value'
  })
  t.same(resolvedSchema.$id, undefined)
})
