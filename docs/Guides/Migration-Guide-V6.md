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

### The serializer compiler and `fast-json-stringify` are removed

A response with a schema is now
[validated](../Reference/Validation-and-Serialization.md#output-validation)
by the response validator and then sent with `JSON.stringify`.
`fast-json-stringify` is no longer used, and the serializer compiler APIs are
removed ([#550](https://github.com/Eomm/fastify/pull/550)):

| v5 | v6 |
|---|---|
| `fastify.setSerializerCompiler()` | [`fastify.setOutputValidatorCompiler()`](../Reference/Server.md#set-output-validator-compiler) |
| `fastify.serializerCompiler` | [`fastify.outputValidatorCompiler`](../Reference/Server.md#output-validator-compiler) |
| route option `serializerCompiler` | removed |
| `schemaController.compilersFactory.buildSerializer` | [`schemaController.compilersFactory.buildOutputValidator`](../Reference/Server.md#schema-controller) |
| `serializerOpts` server option | removed, see [`outputValidatorOptions`](../Reference/Validation-and-Serialization.md#output-validation-options) |
| `FST_ERR_SCH_SERIALIZATION_BUILD` | [`FST_ERR_SCH_OUTPUT_VALIDATION_BUILD`](../Reference/Errors.md#fst_err_sch_output_validation_build) |

The old names are removed without a deprecation warning: an old route option,
`buildSerializer` factory or `serializerOpts` option is ignored.

The response validator compiler validates the payload instead of serializing
it: it returns a function that returns `false` for an invalid payload.

```js
// v5
fastify.setSerializerCompiler(({ schema }) => {
  return data => JSON.stringify(data)
})

// v6
fastify.setOutputValidatorCompiler(({ schema }) => ajv.compile(schema))
```

To serialize the payload yourself, use
[`reply.serializer()`](../Reference/Reply.md#serializerfunc) or
[`fastify.setReplySerializer()`](../Reference/Server.md#setreplyserializer).
They skip the response validation.

`reply.serializeInput()`, `reply.compileSerializationSchema()` and
`reply.getSerializationFunction()` are kept: the function they return validates
the data with the response validator and then serializes it with
`JSON.stringify`.

#### What is sent to the client changes

`fast-json-stringify` wrote only the properties that the schema declares. Now
the validated object is sent as it is:

- **Undeclared properties are sent** unless the schema declares
  `additionalProperties: false`. Review the response schemas of the routes that
  return objects with internal fields, or set `removeAdditional: 'all'` in
  `outputValidatorOptions.customOptions`.
- **Route error schemas:** the error body is built from the own enumerable
  properties of the `Error` plus `statusCode`, `code`, `error` and `message`.
  Without `additionalProperties: false`, every own enumerable property of the
  error is sent. See [Reply errors](../Reference/Reply.md#errors).
- `Date` objects for a `type: 'string'` schema and non-integer numbers for a
  `type: 'integer'` schema are rejected with a `500`
  [`FST_ERR_SCH_OUTPUT_VALIDATION`](../Reference/Errors.md#fst_err_sch_output_validation)
  error, where `fast-json-stringify` converted or rounded them.
- A top-level primitive is not coerced to the schema type.
- The properties are sent in the order of the object, not of the schema.

See [Differences from v5](../Reference/Validation-and-Serialization.md#output-validation-differences)
for the full list.
