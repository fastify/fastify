<h1 align="center">Fastify</h1>

## Validation and Serialize
Fastify uses a schema based approach, and even if it is not mandatory we recommend to use [JSON Schema](http://json-schema.org/) to validate you routes and serialize your outputs, internally Fastify compiles the schema in a highly performant function.

<a name="validation"></a>
### Validation
The route validation internally uses [Ajv](https://www.npmjs.com/package/ajv), which is a highly performant JSON schema validator.
Validate the input is very easy, just add the fields that you need inside the route schema and you are done!  
The supported validations are:
- `body`: validates the body of the request if it is a POST or a PUT.
- `querystring`: validates the querystring. This can be a complete JSON Schema object, with the property type of object and properties object of parameters, or simply the values of what would be contained in the properties object as shown below.
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
*Note that Ajv will try to [coerce](https://github.com/epoberezkin/ajv#coercing-data-types) the values to the types specified in your schema type keywords, both to pass the validation and to use the correctly typed data afterwards.*

<a name="schema-compiler"></a>
#### Schema Compiler

The `schemaCompiler` is a function that returns a function that validates the body, url parameters, headers and the query string.

The default `schemaCompiler` returns a function that implements the `ajv` validation interface.
`fastify` use it internally to speed the validation up.

If you want to change the default options of the `ajv` instance you can pass the ajv option to Fastify.
You can find all the options in the [Ajv documentation](https://github.com/epoberezkin/ajv#options).

```js
const fastify = require('fastify')({
  ajv: {
    removeAdditional: true,
    useDefaults:      true,
    coerceTypes:      true
  }
})
```

But maybe you want to change the validation library. Perhaps you like `Joi`.
In this case you can use it to validate the url parameters, the body and the querystring!

```js
const Joi = require('joi')

fastify.post('/the/url', {
  schema: {
    body: Joi.object().keys({
      hello: Joi.string().required()
    }).required()
  },
  schemaCompiler: function (schema) {
    return schema.validate.bind(validate)
  }
})
```

In that case the function retuned by schemaCompiler returns an object like:
* `error`: filled with an instance of `Error` or a string that describes the validation error
* `value`: the coerced value that passes the validation

<a name="serialize"></a>
### Serialize
Usually you will send your data to the clients via JSON, and Fastify has a powerful tools to help you: [fast-json-stringify](https://www.npmjs.com/package/fast-json-stringify), which is used if you have provided an output schema in the route options. We encourage you to use an output schema, as it will increase your throughput by x1-4 depending on your payload, and it will prevent accidental disclosure of sensitive information.

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
As you can see the response schema is based on the status code, if you want to use the same schema for multiple status codes you can use `'2xx'`, for example:
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

<a name="resources"></a>
### Resources
- [JSON Schema](http://json-schema.org/)
- [Understanding JSON schema](https://spacetelescope.github.io/understanding-json-schema/)


- [fast-safe-stringify documentation](https://github.com/davidmarkclements/fast-safe-stringify/blob/master/readme.md)
- [fast-json-stringify documentation](https://github.com/fastify/fast-json-stringify)
- [Ajv documentation](https://github.com/epoberezkin/ajv/blob/master/README.md)
