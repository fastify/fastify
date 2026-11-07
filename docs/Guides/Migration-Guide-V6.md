# V6 Migration Guide

This guide is intended to help with migration from Fastify v5 to v6.

## Breaking Changes

### The validator compiler APIs are renamed to their input counterpart

The request validator APIs are renamed so that they pair with the
[response validator](../Reference/Validation-and-Serialization.md#output-validation)
ones ([#549](https://github.com/Eomm/fastify/pull/549)):

| v5 | v6 |
|---|---|
| `fastify.setValidatorCompiler()` | [`fastify.setInputValidatorCompiler()`](../Reference/Server.md#set-input-validator-compiler) |
| `fastify.validatorCompiler` | [`fastify.inputValidatorCompiler`](../Reference/Server.md#input-validator-compiler) |
| route option `validatorCompiler` | [route option `inputValidatorCompiler`](../Reference/Routes.md#routes-options) |
| `schemaController.compilersFactory.buildValidator` | [`schemaController.compilersFactory.buildInputValidator`](../Reference/Server.md#schema-controller) |

The old names are removed without a deprecation warning: an old route option
or `buildValidator` factory is ignored and the default validator is used.

```js
// v5
fastify.setValidatorCompiler(({ schema }) => ajv.compile(schema))

fastify.post('/', { validatorCompiler, schema }, handler)

// v6
fastify.setInputValidatorCompiler(({ schema }) => ajv.compile(schema))

fastify.post('/', { inputValidatorCompiler: validatorCompiler, schema }, handler)
```

### The `ajv` option is replaced by `schemaController.inputValidatorOptions`

The top-level `ajv` server option is removed. Its options (`customOptions`,
`plugins`, `onCreate`, `mode`) move to
[`schemaController.inputValidatorOptions`](../Reference/Server.md#schema-controller),
next to the `outputValidatorOptions` of the response validator
([#549](https://github.com/Eomm/fastify/pull/549)).

An `ajv` option passed to v6 is ignored.

```js
// v5
const fastify = Fastify({
  ajv: {
    customOptions: { removeAdditional: 'all' },
    plugins: [require('ajv-errors')]
  }
})

// v6
const fastify = Fastify({
  schemaController: {
    inputValidatorOptions: {
      customOptions: { removeAdditional: 'all' },
      plugins: [require('ajv-errors')]
    }
  }
})
```

Unlike `ajv`, `inputValidatorOptions` is encapsulated: a plugin can change it
for its own routes with `fastify.setSchemaController()`.

The `FST_ERR_AJV_CUSTOM_OPTIONS_OPT_NOT_OBJ` and
`FST_ERR_AJV_CUSTOM_OPTIONS_OPT_NOT_ARR` errors are removed: Fastify no longer
checks the shape of these options and forwards them to
[`@fastify/ajv-compiler`](https://github.com/fastify/ajv-compiler) as they are.

A custom `buildInputValidator` receives `inputValidatorOptions` as its second
argument, with `customOptions` and `plugins` defaulting to `{}` and `[]`, as it
did with the `ajv` option.

In TypeScript, `FastifyServerOptions.ajv` is removed and the new
`FastifyInputValidatorOptions` type describes `inputValidatorOptions`.
