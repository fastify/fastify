const { sep } = require('node:path')
const { test } = require('node:test')
const Fastify = require('../../fastify')

test('SchemaController are NOT loaded when the controllers are custom', async t => {
  const app = Fastify({
    schemaController: {
      compilersFactory: {
        buildValidator: () => () => { },
        buildSerializer: () => () => { }
      }
    }
  })

  await app.ready()

  const loaded = Object.keys(require.cache)
  const ajvModule = loaded.find((path) => path.includes(`@fastify${sep}ajv-compiler`))
  const stringifyModule = loaded.find((path) => path.includes(`@fastify${sep}fast-json-stringify-compiler`))

  t.assert.equal(ajvModule, undefined, 'Ajv compiler is loaded')
  t.assert.equal(stringifyModule, undefined, 'Stringify compiler is loaded')
})

test('isCustomSerializerCompiler is true when only a custom serializer is provided', async t => {
  const { buildSchemaController } = require('../../lib/schema-controller')

  const sc = buildSchemaController(null, {
    compilersFactory: {
      buildSerializer: () => () => { }
    }
  })

  t.assert.equal(sc.isCustomValidatorCompiler, false, 'isCustomValidatorCompiler should be false')
  t.assert.equal(sc.isCustomSerializerCompiler, true, 'isCustomSerializerCompiler should be true')
})

test('isCustomValidatorCompiler is true when only a custom validator is provided', async t => {
  const { buildSchemaController } = require('../../lib/schema-controller')

  const sc = buildSchemaController(null, {
    compilersFactory: {
      buildValidator: () => () => { }
    }
  })

  t.assert.equal(sc.isCustomValidatorCompiler, true, 'isCustomValidatorCompiler should be true')
  t.assert.equal(sc.isCustomSerializerCompiler, false, 'isCustomSerializerCompiler should be false')
})

test('SchemaController are loaded when the controllers are not custom', async t => {
  const app = Fastify()
  await app.ready()

  const loaded = Object.keys(require.cache)
  const ajvModule = loaded.find((path) => path.includes(`@fastify${sep}ajv-compiler`))
  const stringifyModule = loaded.find((path) => path.includes(`@fastify${sep}fast-json-stringify-compiler`))

  t.after(() => {
    delete require.cache[ajvModule]
    delete require.cache[stringifyModule]
  })

  t.assert.ok(ajvModule, 'Ajv compiler is loaded')
  t.assert.ok(stringifyModule, 'Stringify compiler is loaded')
})
