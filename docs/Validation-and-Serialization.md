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

fastify.post('/the/url', { schema }, handler)
```
*Note that Ajv will try to [coerce](https://github.com/epoberezkin/ajv#coercing-data-types) the values to the types specified in your schema `type` keywords, both to pass the validation and to use the correctly typed data afterwards.*

<a name="shared-schema"></a>
#### Adding a shared schema
Thanks to the `addSchema` API, you can add multiple schemas to the Fastify instance and then reuse them in multiple parts of your application. As usual, this API is encapsulated.
```js
const fastify = require('fastify')()

fastify.addSchema({
  $id: 'greetings',
  type: 'object',
  properties: {
    hello: { type: 'string' }
  }
})

fastify.route({
  method: 'POST',
  url: '/',
  schema: {
    body: 'greetings#'
  },
  handler: () => {}
})

fastify.register((instance, opts, next) => {

  /**
   * In children's scope can use schemas defined in upper scope like 'greetings'.
   * Parent scope can't use the children schemas.
   */
  instance.addSchema({
    $id: 'framework',
    type: 'object',
    properties: {
      fastest: { type: 'string' },
      hi: 'greetings#'
    }
  })

  instance.route({
    method: 'POST',
    url: '/sub',
    schema: {
      body: 'framework#'
    },
    handler: () => {}
  })

  next()
})
```
You can use the shared schema everywhere, as top level schema or nested inside other schemas:
```js
const fastify = require('fastify')()

fastify.addSchema({
  $id: 'greetings',
  type: 'object',
  properties: {
    hello: { type: 'string' }
  }
})

fastify.route({
  method: 'POST',
  url: '/',
  schema: {
    body: {
      type: 'object',
      properties: {
        greeting: 'greetings#',
        timestamp: { type: 'number' }
      }
    }
  },
  handler: () => {}
})
```

<a name="get-shared-schema"></a>
#### Retrieving a copy of shared schemas

The function `getSchemas` returns the shared schemas available in the selected scope:
```js
fastify.addSchema({ $id: 'one', my: 'hello' })
fastify.get('/', (request, reply) => { reply.send(fastify.getSchemas()) })

fastify.register((instance, opts, next) => {
  instance.addSchema({ $id: 'two', my: 'ciao' })
  instance.get('/sub', (request, reply) => { reply.send(instance.getSchemas()) })

  instance.register((subinstance, opts, next) => {
    subinstance.addSchema({ $id: 'three', my: 'hola' })
    subinstance.get('/deep', (request, reply) => { reply.send(subinstance.getSchemas()) })
    next()
  })
  next()
})
```
This example will returns:

|  URL  | Schemas |
|-------|---------|
| /     | one             |
| /sub  | one, two        |
| /deep | one, two, three |

<a name="schema-compiler"></a>
#### Schema Compiler

The `schemaCompiler` is a function that returns a function that validates the body, url parameters, headers, and query string. The default `schemaCompiler` returns a function that implements the [ajv](https://ajv.js.org/) validation interface. Fastify uses it internally to speed the validation up.

Fastify's [baseline ajv configuration](https://github.com/epoberezkin/ajv#options-to-modify-validated-data) is:

```js
{
  removeAdditional: true, // remove additional properties
  useDefaults: true, // replace missing properties and items with the values from corresponding default keyword
  coerceTypes: true, // change data type of data to match type keyword
  allErrors: true    // check for all errors
}
```

This baseline configuration cannot be modified. If you want to change or set additional config options, you will need to create your own instance and override the existing one like:

```js
const fastify = require('fastify')()
const Ajv = require('ajv')
const ajv = new Ajv({
  // the fastify defaults (if needed)
  removeAdditional: true,
  useDefaults: true,
  coerceTypes: true,
  allErrors: true
  // any other options
  // ...
})
fastify.setSchemaCompiler(function (schema) {
  return ajv.compile(schema)
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
}, handler)
```

In that case the function returned by `schemaCompiler` returns an object like:
* `error`: filled with an instance of `Error` or a string that describes the validation error
* `value`: the coerced value that passed the validation

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

fastify.post('/the/url', { schema }, handler)
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

fastify.post('/the/url', { schema }, handler)
```

*If you need a custom serializer in a very specific part of your code, you can set one with `reply.serializer(...)`.*

### Error Handling
When schema validation fails for a request, Fastify will automtically return a  status 400 response including the result from the validator in the payload. As an example, if you have the following schema for your route

```js
const schema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' }
    },
    required: ['name']
  }
}
```

and fail to satisfy it, the route will immediately return a response with the following payload

```js
{ 
  "statusCode": 400,
  "error": "Bad Request",
  "message": "body should have required property 'name'" 
}
```

If you want to handle errors inside the route, you can specify the `attachValidation` option for your route. If there is a validation error, the `validationError` property of the request will contain the `Error` object with the raw `validation` result as shown below

```js
const fastify = Fastify()

fastify.post('/', { schema, attachValidation: true }, function (req, reply) {
  if (req.validationError) {
    // `req.validationError.validation` contains the raw validation error
    reply.code(400).send(req.validationError)
  }
})
```

You can also use [setErrorHandler](https://www.fastify.io/docs/latest/Server/#seterrorhandler) to define a custom response for validation errors such as

```js
fastify.setErrorHandler(function (error, request, reply) {
  if (error.validation) {
     reply.status(422).send(new Error('validation failed'))
  }
})
```

<a name="resources"></a>
### Resources
- [JSON Schema](http://json-schema.org/)
- [Understanding JSON schema](https://spacetelescope.github.io/understanding-json-schema/)
- [fast-json-stringify documentation](https://github.com/fastify/fast-json-stringify)
- [Ajv documentation](https://github.com/epoberezkin/ajv/blob/master/README.md)
