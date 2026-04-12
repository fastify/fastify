const { sep } = require('node:path')
const { test } = require('node:test')
const Fastify = require('../../fastify')
const { kSchemaController } = require('../../lib/symbols')

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

test('isCustomSerializerCompiler flag is set correctly when only buildSerializer is provided', async t => {
  const app = Fastify({
    schemaController: {
      compilersFactory: {
        buildSerializer: () => () => { }
      }
    }
  })

  await app.ready()

  const schemaController = app[kSchemaController]
  t.assert.equal(schemaController.isCustomValidatorCompiler, false, 'isCustomValidatorCompiler should be false')
  t.assert.equal(schemaController.isCustomSerializerCompiler, true, 'isCustomSerializerCompiler should be true')
})

test('isCustomValidatorCompiler flag is set correctly when only buildValidator is provided', async t => {
  const app = Fastify({
    schemaController: {
      compilersFactory: {
        buildValidator: () => () => { }
      }
    }
  })

  await app.ready()

  const schemaController = app[kSchemaController]
  t.assert.equal(schemaController.isCustomValidatorCompiler, true, 'isCustomValidatorCompiler should be true')
  t.assert.equal(schemaController.isCustomSerializerCompiler, false, 'isCustomSerializerCompiler should be false')
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
