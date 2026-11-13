const { sep } = require('node:path')
const { test } = require('node:test')
const Fastify = require('../../fastify')
const { kSchemaController } = require('../../lib/symbols')

test('SchemaController are NOT loaded when the controllers are custom', async t => {
  const app = Fastify({
    schemaController: {
      compilersFactory: {
        buildInputValidator: () => () => { },
        buildOutputValidator: () => () => { }
      }
    }
  })

  await app.ready()

  const loaded = Object.keys(require.cache)
  const ajvModule = loaded.find((path) => path.includes(`@fastify${sep}ajv-compiler`))

  t.assert.equal(ajvModule, undefined, 'Ajv compiler is loaded')
})

test('isCustomInputValidatorCompiler flag is set correctly when only buildInputValidator is provided', async t => {
  const app = Fastify({
    schemaController: {
      compilersFactory: {
        buildInputValidator: () => () => { }
      }
    }
  })

  await app.ready()

  const schemaController = app[kSchemaController]
  t.assert.equal(schemaController.isCustomInputValidatorCompiler, true, 'isCustomInputValidatorCompiler should be true')
})

test('SchemaController are loaded when the controllers are not custom', async t => {
  const app = Fastify()
  app.get('/', { schema: { response: { 200: { type: 'object' } } } }, async () => ({}))
  await app.ready()
  await app.inject('/')

  const loaded = Object.keys(require.cache)
  const ajvModule = loaded.find((path) => path.includes(`@fastify${sep}ajv-compiler`))
  const stringifyModule = loaded.find((path) => path.includes(`${sep}fast-json-stringify`))

  t.after(() => {
    delete require.cache[ajvModule]
  })

  t.assert.ok(ajvModule, 'Ajv compiler is loaded')
  t.assert.equal(stringifyModule, undefined, 'fast-json-stringify is never loaded')
})
