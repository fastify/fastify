<h1 align="center">Fastify</h1>

## Fluent Schema

The [Validation and Serialization](https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md)
has explained all the parameter accepted by Fastify to set a JSON Schema Validation, to validates
the input, and a JSON Schema Serialization to optimize the output.

To set up the JSON schemas of our Fastify application, we can use [`fluent-schema`][fluent-schema-repo]
to simplify this task and reuse constants values.

### Basic settings

```js
const S = require('fluent-schema')

// You can have an object like this, or query a db to get the values
const MY_KEY = {
  KEY1: 'ONE',
  KEY2: 'TWO'
}

const bodyJsonSchema = S.object()
  .prop('someKey', S.string())
  .prop('someOtherKey', S.number())
  .prop('requiredKey', S.array().maxItems(3).items(S.integer()).required())
  .prop('nullableKey', S.mixed([S.TYPES.NUMBER, S.TYPES.NULL]))
  .prop('multipleTypesKey', S.mixed([S.TYPES.BOOLEAN, S.TYPES.NUMBER]))
  .prop('multipleRestrictedTypesKey', S.oneOf([S.string().maxLength(5), S.number().minimum(10)]))
  .prop('enumKey', S.enum(Object.values(MY_KEYS)))
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

With `fluent-schema` you can manipulate your schemas in an easier and programmatic way and then reuse them
thanks to the `addSchema()` method. You can refer to the schema in two different manners that are detailed
in [Validation-and-Serialization.md](./Validation-and-Serialization.md#adding-a-shared-schema) document.

Here some example usage:

**`$ref-way`**: refer to external schema.

```js
const addressSchema = S.object()
  .id('#address')
  .prop('line1').required()
  .prop('line2')
  .prop('country').required()
  .prop('city').required()
  .prop('zipcode').required()
  .valueOf()

const commonSchemas = S.object()
  .id('https://fastify/demo')
  .definition('addressSchema', addressSchema)
  .definition('otherSchema', otherSchema) // you can add any schemas you need
  .valueOf()

fastify.addSchema(commonSchemas)

const bodyJsonSchema = S.object()
  .prop('residence', S.ref('https://fastify/demo#address')).required()
  .prop('office', S.ref('https://fastify/demo#/definitions/addressSchema')).required()
  .valueOf()

const schema = { body: bodyJsonSchema }

fastify.post('/the/url', { schema }, handler)
```


**`replace-way`**: refer to a shared schema to replace before the validation process.

```js
const sharedAddressSchema = {
  $id: 'sharedAddress',
  type: 'object',
  required: ['line1', 'country', 'city', 'zipcode'],
  properties: {
    line1: { type: 'string' },
    line2: { type: 'string' },
    country: { type: 'string' },
    city: { type: 'string' },
    zipcode: { type: 'string' }
  }
}
fastify.addSchema(sharedAddressSchema)

const bodyJsonSchema = {
  type: 'object',
  properties: {
    vacation: 'sharedAddress#'
  }
}

const schema = { body: bodyJsonSchema }

fastify.post('/the/url', { schema }, handler)
```

NB: you can mix up the usage `$ref-way` and the `replace-way` with `fastify.addSchema`.

[fluent-schema-repo]: https://github.com/fastify/fluent-schema
