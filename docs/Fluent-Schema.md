<h1 align="center">Fastify</h1>

## Fluent Schema

The [Validation and Serialization](https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md)
has explained all the parameter accepted by Fastify to set a JSON Schema Validation, to validates
the input, and a JSON Schema Serialization to optimize the output.

To set up the schemas of our Fastify application, we can use [`fluent-schema`][fluent-schema-repo]
to simplify this task.

### Basic settings

```js
const S = require('fluent-schema')

const bodyJsonSchema = S.object()
  .prop('someKey', S.string())
  .prop('someOtherKey', S.number())
  .prop('requiredKey', S.array().maxItems(3).items(S.integer()).required())
  .prop('nullableKey', S.mixed([S.TYPES.NUMBER, S.TYPES.NULL]))
  .prop('multipleTypesKey', S.mixed([S.TYPES.BOOLEAN, S.TYPES.NUMBER]))
  .prop('multipleRestrictedTypesKey', S.oneOf([S.string().maxLength(5), S.number().minimum(10)]))
  .prop('enumKey', S.enum(['John', 'Foo']))
  .prop('notTypeKey', S.not(S.array()))

const queryStringJsonSchema = S.object()
  .prop('name', S.string())
  .prop('excitement', S.integer())

const paramsJsonSchema = S.object()
  .prop('par1', S.string())
  .prop('par2', S.integer())

const headersJsonSchema = S.object()
  .prop('x-foo', S.string().required())

const schema = {
  body: bodyJsonSchema.valueOf(),
  querystring: queryStringJsonSchema.valueOf(),
  params: paramsJsonSchema.valueOf(),
  headers: headersJsonSchema.valueOf()
}

fastify.post('/the/url', { schema }, handler)
```

### Reuse

**`$ref-way`**: refer to external schema.

```js
const addressSchema = S.object()
  .id('#address')
  .prop('line1').required()
  .prop('line2')
  .prop('country').required()
  .prop('city').required()
  .prop('zipcode').required()

const commonSchemas = S.object()
  .id('https://fastify/demo')
  .definition('addressSchema', addressSchema.valueOf())
  .definition('otherSchema', otherSchema.valueOf())

fastify.addSchema(commonSchemas.valueOf())

const bodyJsonSchema = S.object()
  .prop('residence', S.ref('https://fastify/demo#address')).required()
  .prop('office', S.ref('https://fastify/demo#/definitions/addressSchema')).required()

const schema = { body: bodyJsonSchema.valueOf() }

fastify.post('/the/url', { schema }, handler)
```


**`replace-way`**: refer to a shared schema to replace before the validation process.

```js
const sharedAddressSchema = { ...addressSchema.valueOf(), '$id': 'sharedAddress' }
fastify.addSchema(sharedAddressSchema)

const bodyJsonSchema = { ...S.object().valueOf(), vacation: 'sharedAddress#' }

const schema = { body: bodyJsonSchema }

fastify.post('/the/url', { schema }, handler)
```

NB: you can mix up the usage `$ref-way` and the `replace-way` with `fastify.addSchema`.

[fluent-schema-repo]: https://github.com/fastify/fluent-schema