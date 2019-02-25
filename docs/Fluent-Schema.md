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

TODO $ref + addSchema + encapsulation in action.

```js
TODO
```

[fluent-schema-repo]: https://github.com/fastify/fluent-schema