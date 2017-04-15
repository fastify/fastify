<h1 align="center">Fastify</h1>

## Validation and Serialize
Fastify uses a schema based approach, and even if it is not mandatory we recommend to use [JSON Schema](http://json-schema.org/) to validate you routes and serialize your outputs, internally Fastify compiles the schema in an highly performant function.

<a name="validation"></a>
### Validation
The route validation internally uses [Ajv](https://www.npmjs.com/package/ajv), which is an highly performant JSON schema validator.
Validate the input is very easy, just add the fields that you need inside the route schema and you are done!  
The supported validations are:
- `body`: validates the body of the request if it is a POST or a PUT.
- `querystring`: validates the querystring. This can be a complete JSON Schema object, with the property type of object and properties object of parameters, or simply the values of what would be contained in the properties object as shown below.
- `params`: validates the route params.

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
    }
  }
```
*Note that Ajv will try to [coerce](https://github.com/epoberezkin/ajv#coercing-data-types) the values to the types specified in your schema type keywords, both to pass the validation and to use the correctly typed data afterwards.*

<a name="serialize"></a>
### Serialize
Usually you will send your data to the clients via JSON, and Fastify has two powerful tools to help you, [fast-json-stringify](https://www.npmjs.com/package/fast-json-stringify) and [fast-safe-stringify](https://www.npmjs.com/package/fast-safe-stringify).  
The first one is used if you have provided an output schema in the route options, otherwise the second one will do de job. We encourage you to use an output schema, it will increase your throughput by x1-4 depending by your payload.

Example:
```js
  const schema = {
    out: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        otherValue: { type: 'boolean' }
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
