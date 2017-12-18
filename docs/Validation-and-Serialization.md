<h1 align="center">Fastify</h1>

## Validation and Serialization
Fastify uses a schema-based approach, and even if it is not mandatory we recommend using [JSON Schema](http://json-schema.org/) to validate your routes and serialize your outputs. Internally, Fastify compiles the schema into a highly performant function.

<a name="validation"></a>
### Validation
The route validation internally relies upon [Ajv](https://www.npmjs.com/package/ajv), which is a high-performance JSON schema validator. Validating the input is very easy: just add the fields that you need inside the route schema, and you are done! The supported validations are:
- `body`: validates the body of the request if it is a POST or a PUT.
- `querystring`: validates the query string. This can be a complete JSON Schema object (with a `type` property of `'object'` and a `'properties'` object containing parameters) or a simpler variation in which the `type` and `properties` attributes are forgone and the query parameters are listed at the top level (see the example below).
- `params`: validates the route params.
- `headers`: validates the request headers.

Example:
```js
const schema = {
  body: {
    type: 'object',
    properties: {
      someKey: { type: 'string' },
      someOtherKey: { type: 'number' }
    }
  },

  querystring: {
    name: { type: 'string' },
    excitement: { type: 'integer' }
  },

  params: {
    type: 'object',
    properties: {
      par1: { type: 'string' },
      par2: { type: 'number' }
    }
  },

  headers: {
    type: 'object',
    properties: {
      'x-foo': { type: 'string' }
    },
    required: ['x-foo']
  }
}
```
*Note that Ajv will try to [coerce](https://github.com/epoberezkin/ajv#coercing-data-types) the values to the types specified in your schema `type` keywords, both to pass the validation and to use the correctly typed data afterwards.*

<a name="schema-compiler"></a>
#### Schema Compiler

The `schemaCompiler` is a function that returns a function that validates the body, url parameters, headers, and query string. The default `schemaCompiler` returns a function that implements the `ajv` validation interface. Fastify uses it internally to speed the validation up.

If you want to change the default options of the `ajv` instance, you can pass the `ajv` option to Fastify. The options are described in the [Ajv documentation](https://github.com/epoberezkin/ajv#options).

```js
const fastify = require('fastify')({
  ajv: {
    removeAdditional: true,
    useDefaults:      true,
    coerceTypes:      true
  }
})
```

But maybe you want to change the validation library. Perhaps you like `Joi`. In this case, you can use it to validate the url parameters, body, and query string!

```js
const Joi = require('joi')

fastify.post('/the/url', {
  schema: {
    body: Joi.object().keys({
      hello: Joi.string().required()
    }).required()
  },
  schemaCompiler: schema => data => Joi.validate(data, schema)
})
```

In that case the function returned by `schemaCompiler` returns an object like:
* `error`: filled with an instance of `Error` or a string that describes the validation error
* `value`: the coerced value that passed the validation

If you are using the same `schemaCompiler` for all endpoints, you can call `fastify.setSchemaCompiler` to set the default schema compiler.

<a name="serialization"></a>
### Serialization
Usually you will send your data to the clients via JSON, and Fastify has a powerful tool to help you, [fast-json-stringify](https://www.npmjs.com/package/fast-json-stringify), which is used if you have provided an output schema in the route options. We encourage you to use an output schema, as it will increase your throughput by 100-400% depending on your payload and will prevent accidental disclosure of sensitive information.

Example:
```js
const schema = {
  response: {
    200: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        otherValue: { type: 'boolean' }
      }
    }
  }
}
```

As you can see, the response schema is based on the status code. If you want to use the same schema for multiple status codes, you can use `'2xx'`, for example:
```js
const schema = {
  response: {
    '2xx': {
      type: 'object',
      properties: {
        value: { type: 'string' },
        otherValue: { type: 'boolean' }
      }
    },
    201: {
      type: 'object',
      properties: {
        value: { type: 'string' }
      }
    }
  }
}
```

*If you need a custom serializer in a very specific part of your code, you can always set one with `reply.serializer(...)`.*


<a name="sharing-schemas-cached-validation-serialization"></a>
#### Sharing Schemas and Cached Validation/Serialization
If you are re-using the same schemas in multiple places, or want to take advantage of JSON Schema's ability to reference external documents, you can alternatively add your schemas in one step and then reference them in your route options.

For example, this:
```js
const schema = {
  response: {
    200: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        otherValue: { type: 'boolean' }
      }
    },
    '4xx': {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'string' }
      }
    },
    '5xx': {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'string' }
      }
    }
  }
}
```

Becomes:
```js
fastify.addSchema({
  $id: 'error',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'string' }
  }
})

const schema = {
  response: {
    200: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        otherValue: { type: 'boolean' }
      }
    },
    '4xx': 'error#',
    '5xx': 'error#'
  }
}
```

Shared schemas are referenced by an id. This id comes from (in order of prefence):
- an optional second argument passed into `addSchema`
- the `$id` field on the schema, which is consistent with JSON Schema draft 6
- the `id` field on the schema, which is consistent with JSON Schema draft 4

When trying to resolve a reference, fastify will call `schemaResolver` with two arguments:
- `keyRef`: the reference to the schema
- `allSchemas`: the dictionary of all schemas added to the library

This is expected to return the same output as a `schemaCompiler` would. If you want to use your own `schemaResolver` function, you can pass it in either on route options or through `setSchemaResolver`.

Note that calls to `schemaResolver` are cached, so if two APIs ask for the same schema it is not going to be called twice.

Additional examples are available [here](../examples/shared-schemas.js) and [here](../examples/shared-custom-schemas.js)

<a name="resources"></a>
### Resources
- [JSON Schema](http://json-schema.org/)
- [Understanding JSON schema](https://spacetelescope.github.io/understanding-json-schema/)
- [fast-json-stringify documentation](https://github.com/fastify/fast-json-stringify)
- [Ajv documentation](https://github.com/epoberezkin/ajv/blob/master/README.md)
