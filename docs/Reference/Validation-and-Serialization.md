<h1 align="center">Fastify</h1>

## Validation and Serialization
Fastify uses a schema-based approach. We recommend using
[JSON Schema](https://json-schema.org/) to validate routes and serialize outputs.
Fastify compiles the schema into a highly performant function.

Validation is only attempted if the content type is `application/json`,
unless the body schema uses the [`content`](#body-content-type-validation)
property to specify validation per content type. When the body schema defines
a `content` field, it must enumerate all possible content types the
application expects to handle with the associated handler.

All examples use the
[JSON Schema Draft 7](https://json-schema.org/draft-07)
specification.

> ⚠ Warning:
> Treat schema definitions as application code. The validation features use
> `new Function()`, which is unsafe with user-provided schemas. See
> [Ajv](https://www.npmjs.com/package/ajv) for details.
>
> Whilst Fastify supports the
> [`$async` Ajv feature](https://ajv.js.org/guide/async-validation.html),
> it should not be used for initial validation. Accessing databases during
> validation may lead to Denial of Service attacks. Use
> [Fastify's hooks](./Hooks.md) like `preHandler` for `async` tasks after validation.
>
> When using custom validators with async `preValidation` hooks,
> validators **must return** `{error}` objects instead of throwing errors.
> Throwing errors from custom validators will cause unhandled promise rejections
> that crash the application when combined with async hooks. See the
> [custom validator examples](#using-other-validation-libraries) below for the
> correct pattern.

### Core concepts
Validation is handled by [Ajv v8](https://www.npmjs.com/package/ajv), for both
the request validation and the [response validation](#output-validation). A
response that matches its schema is sent with `JSON.stringify`.

The request and the response validators share only the JSON schemas added to
Fastify's instance via `.addSchema(schema)`. They use two different Ajv
instances, each one with its own options.

#### Adding a shared schema
<a id="shared-schema"></a>

The `addSchema` API allows adding multiple schemas to the Fastify instance for
reuse throughout the application. This API is encapsulated.

Shared schemas can be reused with the JSON Schema
[**`$ref`**](https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-01#section-8)
keyword. Here is an overview of how references work:

+ `myField: { $ref: '#foo' }` searches for `$id: '#foo'` in the current schema
+ `myField: { $ref: '#/definitions/foo' }` searches for `definitions.foo` in the
  current schema
+ `myField: { $ref: 'http://url.com/sh.json#' }` searches for a shared schema
  with `$id: 'http://url.com/sh.json'`
+ `myField: { $ref: 'http://url.com/sh.json#/definitions/foo' }` searches for a
  shared schema with `$id: 'http://url.com/sh.json'` and uses `definitions.foo`
+ `myField: { $ref: 'http://url.com/sh.json#foo' }` searches for a shared schema
  with `$id: 'http://url.com/sh.json'` and looks for `$id: '#foo'` within it

**Simple usage:**

```js
fastify.addSchema({
  $id: 'http://fastify.example/',
  type: 'object',
  properties: {
    hello: { type: 'string' }
  }
})

fastify.post('/', {
  handler () {},
  schema: {
    body: {
      type: 'array',
      items: { $ref: 'http://fastify.example#/properties/hello' }
    }
  }
})
```

**`$ref` as root reference:**

```js
fastify.addSchema({
  $id: 'commonSchema',
  type: 'object',
  properties: {
    hello: { type: 'string' }
  }
})

fastify.post('/', {
  handler () {},
  schema: {
    body: { $ref: 'commonSchema#' },
    headers: { $ref: 'commonSchema#' }
  }
})
```

#### Retrieving the shared schemas
<a id="get-shared-schema"></a>

If the validator and serializer are customized, `.addSchema` is not useful since
Fastify no longer controls them. To access schemas added to the Fastify instance,
use `.getSchemas()`:

```js
fastify.addSchema({
  $id: 'schemaId',
  type: 'object',
  properties: {
    hello: { type: 'string' }
  }
})

const mySchemas = fastify.getSchemas()
const mySchema = fastify.getSchema('schemaId')
```

The `getSchemas` function is encapsulated and returns shared schemas available
in the selected scope:

```js
fastify.addSchema({ $id: 'one', my: 'hello' })
// will return only `one` schema
fastify.get('/', (request, reply) => { reply.send(fastify.getSchemas()) })

fastify.register((instance, opts, done) => {
  instance.addSchema({ $id: 'two', my: 'ciao' })
  // will return `one` and `two` schemas
  instance.get('/sub', (request, reply) => { reply.send(instance.getSchemas()) })

  instance.register((subinstance, opts, done) => {
    subinstance.addSchema({ $id: 'three', my: 'hola' })
    // will return `one`, `two` and `three`
    subinstance.get('/deep', (request, reply) => { reply.send(subinstance.getSchemas()) })
    done()
  })
  done()
})
```


### Validation
Route validation relies on [Ajv v8](https://www.npmjs.com/package/ajv), a
high-performance JSON Schema validator. To validate input, add the required
fields to the route schema.

Supported validations include:
- `body`: validates the request body for POST, PUT, or PATCH methods.
- `querystring` or `query`: validates the query string.
- `params`: validates the route parameters.
- `headers`: validates the request headers.

Validations can be a complete JSON Schema object with a `type` of `'object'` and
a `'properties'` object containing parameters, or a simpler variation listing
parameters at the top level.

> ℹ For using the latest Ajv (v8), refer to the
> [`schemaController`](./Server.md#schema-controller) section.

##### Header name case

Node.js exposes request header names in lowercase. Fastify normalizes header
names in a `headers` schema to lowercase before compilation, so assertions
written in the canonical header-name case still match the request, for example
`required: ['X-Api-Key']`, `dependencies`, and a `propertyNames` deny-list that
uses `enum` or `const`.

Regular-expression constraints on header names are the exception. A
`patternProperties` key and a `propertyNames` `pattern` are regular expressions
matched against the already-lowercased header names, and Fastify cannot safely
rewrite a regular expression. Author them to match lowercase (for example
`^x-debug-.*$`, not `^X-Debug-.*$`) or make them case-insensitive. A pattern
written in canonical case will not match, and the assertion it guards will not
apply.

Example:
```js
const bodyJsonSchema = {
  type: 'object',
  required: ['requiredKey'],
  properties: {
    someKey: { type: 'string' },
    someOtherKey: { type: 'number' },
    requiredKey: {
      type: 'array',
      maxItems: 3,
      items: { type: 'integer' }
    },
    nullableKey: { type: ['number', 'null'] }, // or { type: 'number', nullable: true }
    multipleTypesKey: { type: ['boolean', 'number'] },
    multipleRestrictedTypesKey: {
      oneOf: [
        { type: 'string', maxLength: 5 },
        { type: 'number', minimum: 10 }
      ]
    },
    enumKey: {
      type: 'string',
      enum: ['John', 'Foo']
    },
    notTypeKey: {
      not: { type: 'array' }
    }
  }
}

const queryStringJsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    excitement: { type: 'integer' }
  }
}

const paramsJsonSchema = {
  type: 'object',
  properties: {
    par1: { type: 'string' },
    par2: { type: 'number' }
  }
}

const headersJsonSchema = {
  type: 'object',
  properties: {
    'x-foo': { type: 'string' }
  },
  required: ['x-foo']
}

const schema = {
  body: bodyJsonSchema,
  querystring: queryStringJsonSchema,
  params: paramsJsonSchema,
  headers: headersJsonSchema
}

fastify.post('/the/url', { schema }, handler)
```

#### Body Content-Type Validation
<a id="body-content-type-validation"></a>

For `body` schema, it is further possible to differentiate the schema per content
type by nesting the schemas inside `content` property. The schema validation
will be applied based on the `Content-Type` header in the request.

```js
fastify.post('/the/url', {
  schema: {
    body: {
      content: {
        'application/json': {
          schema: { type: 'object' }
        },
        'text/plain': {
          schema: { type: 'string' }
        }
        // Other content types will not be validated
      }
    }
  }
}, handler)
```

> ⚠ Warning:
> When using [custom content type parsers](./ContentTypeParser.md), the parsed
> body is validated **only** when the request content type matches a key in the
> schema `content` map.
>
> Schema selection uses an exact match on the request's
> [essence MIME type](https://mimesniff.spec.whatwg.org/#mime-type-miscellaneous)
> (for example, `application/json`). If a parser is registered with a regular
> expression (for example, `/^application\/.*json$/`), the parser can accept
> more content types than the `content` map covers. Requests in that gap are
> parsed but **not validated**.
>
> Ensure every content type accepted by the parser has a corresponding key in
> the `content` map, or use a catch-all body schema without `content` when
> strict per-content-type discrimination is not required.
>
> ```js
> // Add a custom parser for YAML
> fastify.addContentTypeParser('application/yaml', { parseAs: 'string' }, (req, body, done) => {
>   done(null, YAML.parse(body))
> })
>
> fastify.post('/the/url', {
>   schema: {
>     body: {
>       content: {
>         'application/json': {
>           schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }
>         },
>         // Without this entry, application/yaml requests will NOT be validated
>         'application/yaml': {
>           schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }
>         }
>       }
>     }
>   }
> }, handler)
> ```

Note that Ajv will try to [coerce](https://ajv.js.org/coercion.html) values to
the types specified in the schema `type` keywords, both to pass validation and
to use the correctly typed data afterwards.

> ⚠ Important:
> Fastify uses a custom [AJV configuration][1] such as `coerceTypes: 'array'`.
> Evaluate its behavior and verify if it meets the project requirements.

[1]: https://github.com/fastify/ajv-compiler?tab=readme-ov-file#ajv-configuration

The Ajv default configuration in Fastify supports coercing array parameters in
`querystring`. Example:

```js
const opts = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          default: []
        },
      },
    }
  }
}

fastify.get('/', opts, (request, reply) => {
  reply.send({ params: request.query }) // echo the querystring
})

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err
})
```

```sh
curl -X GET "http://localhost:3000/?ids=1

{"params":{"ids":["1"]}}
```

A custom schema validator can be specified for each parameter type (body,
querystring, params, headers).

For example, the following code disables type coercion only for the `body`
parameters, changing the Ajv default options:

```js
const schemaCompilers = {
  body: new Ajv({
    removeAdditional: false,
    coerceTypes: false,
    allErrors: true
  }),
  params: new Ajv({
    removeAdditional: false,
    coerceTypes: true,
    allErrors: true
  }),
  querystring: new Ajv({
    removeAdditional: false,
    coerceTypes: true,
    allErrors: true
  }),
  headers: new Ajv({
    removeAdditional: false,
    coerceTypes: true,
    allErrors: true
  })
}

server.setInputValidatorCompiler(req => {
    if (!req.httpPart) {
      throw new Error('Missing httpPart')
    }
    const compiler = schemaCompilers[req.httpPart]
    if (!compiler) {
      throw new Error(`Missing compiler for ${req.httpPart}`)
    }
    return compiler.compile(req.schema)
})
```

When type coercion is enabled, using `anyOf` with nullable primitive types
can produce unexpected results. For example, a value of `0` or `false` may be
coerced to `null` because Ajv evaluates `anyOf` schemas in order and applies
type coercion during matching. This means the `{ "type": "null" }` branch can
match before the intended type:

```json
{
  "anyOf": [
    { "type": "null" },
    { "type": "number" }
  ]
}
```

To avoid this, use the `nullable` keyword instead of `anyOf` for primitive
types:

```json
{
  "type": "number",
  "nullable": true
}
```

For more information, see [Ajv Coercion](https://ajv.js.org/coercion.html).

#### Ajv Plugins
<a id="ajv-plugins"></a>

A list of plugins can be provided for use with the default input Ajv instance.
Ensure the plugin is **compatible with the Ajv version shipped within Fastify**.

> Refer to [`schemaController.inputValidatorOptions`](./Server.md#schema-controller)
> to check plugins format.

```js
const fastify = require('fastify')({
  schemaController: {
    inputValidatorOptions: {
      plugins: [
        require('ajv-merge-patch')
      ]
    }
  }
})

fastify.post('/', {
  handler (req, reply) { reply.send({ ok: 1 }) },
  schema: {
    body: {
      $patch: {
        source: {
          type: 'object',
          properties: {
            q: {
              type: 'string'
            }
          }
        },
        with: [
          {
            op: 'add',
            path: '/properties/q',
            value: { type: 'number' }
          }
        ]
      }
    }
  }
})

fastify.post('/foo', {
  handler (req, reply) { reply.send({ ok: 1 }) },
  schema: {
    body: {
      $merge: {
        source: {
          type: 'object',
          properties: {
            q: {
              type: 'string'
            }
          }
        },
        with: {
          required: ['q']
        }
      }
    }
  }
})
```

#### Input Validator Compiler
<a id="schema-validator"></a>

The `inputValidatorCompiler` is a function that returns a function to validate
the body, URL parameters, headers, and query string. The default
`inputValidatorCompiler`
returns a function that implements the [ajv](https://ajv.js.org/) validation
interface. Fastify uses it internally to speed up validation.

Fastify's [baseline ajv
configuration](https://github.com/fastify/ajv-compiler#ajv-configuration) is:

```js
{
  coerceTypes: 'array', // change data type of data to match type keyword
  useDefaults: true, // replace missing properties and items with the values from corresponding default keyword
  removeAdditional: true, // remove additional properties if additionalProperties is set to false, see: https://ajv.js.org/guide/modifying-data.html#removing-additional-properties
  uriResolver: require('fast-uri'),
  addUsedSchema: false,
  // Explicitly set allErrors to `false`.
  // When set to `true`, a DoS attack is possible.
  allErrors: false
}
```

Modify the baseline configuration by providing
[`schemaController.inputValidatorOptions.customOptions`](./Server.md#schema-controller)
to the Fastify factory.

To change or set additional config options, create a custom instance and
override the existing one:

```js
const fastify = require('fastify')()
const Ajv = require('ajv')
const ajv = new Ajv({
  removeAdditional: 'all',
  useDefaults: true,
  coerceTypes: 'array',
  // any other options
  // ...
})
fastify.setInputValidatorCompiler(({ schema, method, url, httpPart }) => {
  return ajv.compile(schema)
})
```

> ℹ️ Note:
> When using a custom validator instance, add schemas to the validator
> instead of Fastify. Fastify's `addSchema` method will not recognize the custom
> validator.

##### Using other validation libraries
<a id="using-other-validation-libraries"></a>

The `setInputValidatorCompiler` function allows substituting `ajv` with other
JavaScript validation libraries like [joi](https://github.com/hapijs/joi/) or
[yup](https://github.com/jquense/yup/), or a custom one:

```js
const Joi = require('joi')

fastify.setInputValidatorCompiler(({ schema }) => {
  return (data) => {
    try {
      const { error, value } = schema.validate(data)
      if (error) {
        return { error } // Return the error, do not throw it
      }
      return { value }
    } catch (e) {
      return { error: e } // Catch any unexpected errors too
    }
  }
})

fastify.post('/the/url', {
  schema: {
    body: Joi.object().keys({
      hello: Joi.string().required()
    }).required()
  }
}, handler)
```

```js
const yup = require('yup')
// Validation options to match ajv's baseline options used in Fastify
const yupOptions = {
  strict: false,
  abortEarly: false, // return all errors
  stripUnknown: true, // remove additional properties
  recursive: true
}

fastify.post('/the/url', {
  schema: {
    body: yup.object({
      age: yup.number().integer().required(),
      sub: yup.object().shape({
        name: yup.string().required()
      }).required()
    })
  },
  inputValidatorCompiler: ({ schema, method, url, httpPart }) => {
    return function (data) {
      // with option strict = false, yup `validateSync` function returns the
      // coerced value if validation was successful, or throws if validation failed
      try {
        const result = schema.validateSync(data, yupOptions)
        return { value: result }
      } catch (e) {
        return { error: e }
      }
    }
  }
}, handler)
```

Fastify supports different JSON Schema validators via
`setInputValidatorCompiler`. Community plugins that integrate alternative JSON
Schema validators are listed on the
[Ecosystem](https://fastify.dev/docs/latest/Guides/Ecosystem/) page.

##### Custom Validator Best Practices

When implementing custom validators, follow these patterns to ensure compatibility
with all Fastify features:

**Always return objects, never throw:**
```js
return { value: validatedData }  // On success
return { error: validationError } // On failure
```

**Use try-catch for safety:**
```js
fastify.setInputValidatorCompiler(({ schema }) => {
  return (data) => {
    try {
      // Validation logic here
      const result = schema.validate(data)
      if (result.error) {
        return { error: result.error }
      }
      return { value: result.value }
    } catch (e) {
      // Catch any unexpected errors
      return { error: e }
    }
  }
})
```

This pattern ensures validators work correctly with both sync and async
`preValidation` hooks, preventing unhandled promise rejections that can crash
an application.

> [!IMPORTANT]
> The `{ value, error }` result convention applies to **synchronous** validator
> compilers only. An **asynchronous** validator (a compiler that returns a
> promise, including an [`$async` Ajv schema](https://ajv.js.org/guide/async-validation.html))
> is treated as pass/fail only: its resolved value is not unwrapped as
> `{ value, error }`. An async schema resolves with the validated data itself, so
> unwrapping it would let a payload that carries `value` or `error` keys replace
> the request part or inject a validation error. An async validator must signal
> failure by rejecting (throwing), and it cannot coerce the request part through
> a resolved `value`.

##### `headers` and the `{ value }` result

For the `headers` part specifically, the synchronous success `value` is applied
through the additive [`request.headers`](./Request.md#headers) setter. That
setter *adds or overrides* headers on top of the raw request headers; it does
**not** replace them. Raw request headers remain separately available as
`request.raw.headers`, and any incoming header that is not present in the
returned `value` is still visible on `request.headers`.

Consequently, a synchronous custom `headers` validator cannot remove a header by
simply omitting it from `value`. The same applies to the default Ajv validator:
`request.headers` is the incoming request's headers (plus any additive values)
and is not a sanitized, authoritative view. If your application needs a
sanitized or allow-listed header view — for example to drive an authorization
decision — build and consume that view explicitly from the validated data rather
than re-reading `request.headers`.

##### .statusCode property

All validation errors have a `.statusCode` property set to `400`, ensuring the
default error handler sets the response status code to `400`.

```js
fastify.setErrorHandler(function (error, request, reply) {
  request.log.error(error, `This error has status code ${error.statusCode}`)
  reply.status(error.statusCode).send(error)
})
```

##### Validation messages with other validation libraries

Fastify's validation error messages are tightly coupled to the default
validation engine: errors returned from `ajv` are eventually run through the
`schemaErrorFormatter` function which builds human-friendly error messages.
However, the `schemaErrorFormatter` function is written with `ajv` in mind.
This may result in odd or incomplete error messages when using other validation
libraries.

To circumvent this issue, there are two main options:

1. Ensure the validation function (returned by the custom
   `inputValidatorCompiler`)
   returns errors in the same structure and format as `ajv`.
2. Use a custom `errorHandler` to intercept and format custom validation errors.

Fastify adds two properties to all validation errors to help write a custom
`errorHandler`:

* `validation`: the content of the `error` property of the object returned by
  the validation function (returned by the custom `inputValidatorCompiler`)
* `validationContext`: the context (body, params, query, headers) where the
  validation error occurred, or `response` when the
  [response payload](#output-validation) does not match the response schema

A contrived example of such a custom `errorHandler` handling validation errors
is shown below:

```js
const errorHandler = (error, request, reply) => {
  const statusCode = error.statusCode
  let response

  const { validation, validationContext } = error

  // check if we have a validation error
  if (validation) {
    response = {
      // validationContext will be 'body', 'params', 'headers', or 'query'
      message: `A validation error occurred when validating the ${validationContext}...`,
      // this is the result of the validation library...
      errors: validation
    }
  } else {
    response = {
      message: 'An error occurred...'
    }
  }

  // any additional work here, eg. log error
  // ...

  reply.status(statusCode).send(response)
}
```

### Serialization
<a id="serialization"></a>

When the route options provide an output schema, Fastify validates the payload
against it and then sends it as JSON with `JSON.stringify`. A payload that does
not match the schema is rejected with a `500` error. See
[Output Validation](#output-validation).

> ⚠ Warning:
> The properties that the schema does not declare are sent to the client,
> unless the schema declares `additionalProperties: false`. To avoid
> accidental disclosure of sensitive information, declare
> `additionalProperties: false` on the response schemas, or set
> `removeAdditional: 'all'` in the
> [response validator options](#output-validation-options).

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

The response schema is based on the status code. To use the same schema for
multiple status codes, use `'2xx'` or `default`, for example:
```js
const schema = {
  response: {
    default: {
      type: 'object',
      properties: {
        error: {
          type: 'boolean',
          default: true
        }
      }
    },
    '2xx': {
      type: 'object',
      properties: {
        value: { type: 'string' },
        otherValue: { type: 'boolean' }
      }
    },
    201: {
      // the contract syntax
      value: { type: 'string' }
    }
  }
}

fastify.post('/the/url', { schema }, handler)
```
A specific response schema can be defined for different content types.
For example:
```js
const schema = {
  response: {
    200: {
      description: 'Response schema that support different content types',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              image: { type: 'string' },
              address: { type: 'string' }
            }
          }
        },
        'application/vnd.v1+json': {
          schema: {
            type: 'array',
            items: { $ref: 'test' }
          }
        }
      }
    },
    '3xx': {
      content: {
        'application/vnd.v2+json': {
          schema: {
            type: 'object',
            properties: {
              fullName: { type: 'string' },
              phone: { type: 'string' }
            }
          }
        }
      }
    },
    default: {
      content: {
        // */* is match-all content-type
        '*/*': {
          schema: {
            type: 'object',
            properties: {
              desc: { type: 'string' }
            }
          }
        }
      }
    }
  }
}

fastify.post('/url', { schema }, handler)
```

> When the route declares a per-content-type response schema through `content`,
> Fastify matches the response `Content-Type` against the declared keys and falls
> back to `*/*` (if present). If the response `Content-Type` is not declared and
> there is no `*/*` key, serialization **fails closed**: Fastify throws
> `FST_ERR_MISSING_CONTENTTYPE_SERIALIZATION_FN` and replies with a `500` error,
> instead of silently serializing the payload with `JSON.stringify` (which would
> bypass the response schema). Every `Content-Type` a route may respond with must
> be declared, or the route must define a `*/*` catch-all.

#### Output Validation
<a id="output-validation"></a>

When a route declares a response schema, Fastify validates the payload with Ajv
and then sends it with `JSON.stringify`. The response validator is picked by the
exact status code first, then the `2xx`-style wildcard, then `default`, and
finally the content type when the schema uses `content`.

The validator also changes the payload **in place** before it is serialized:
missing properties that declare a `default` are filled in, values are coerced
to the declared type, and undeclared properties are removed where the schema
declares `additionalProperties: false`.

```js
fastify.get('/user', {
  schema: {
    response: {
      200: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string', default: 'anonymous' }
        }
      }
    }
  }
}, async () => {
  return { id: '42' }
  // responds 200 with {"id":42,"name":"anonymous"}
})

fastify.get('/broken', {
  schema: {
    response: {
      200: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
      }
    }
  }
}, async () => {
  return { name: 'foo' }
  // responds 500 with FST_ERR_SCH_OUTPUT_VALIDATION:
  // "Response validation failed. Errors: must have required property 'id'"
})
```

A payload that does not match the schema is rejected with a
[`FST_ERR_SCH_OUTPUT_VALIDATION`](./Errors.md#fst_err_sch_output_validation)
error (status code `500`), and the error goes through the
[error handler](#error-handling). This covers cases that the v5 serializer
(`fast-json-stringify`) patched silently, for example a missing `required`
property, an object sent for a `type: 'string'` schema, a `const` mismatch, or
keywords that it ignored such as `minimum`.

The payload is not validated when:
- it is `null` or a string;
- a custom serializer is set with [`reply.serializer()`](./Reply.md#serializerfunc)
  or [`setReplySerializer`](./Server.md#setreplyserializer).

If a response schema can not be compiled by the response validator, Fastify
throws [`FST_ERR_SCH_OUTPUT_VALIDATION_BUILD`](./Errors.md#fst_err_sch_output_validation_build)
at startup.

##### Response validator options
<a id="output-validation-options"></a>

The response validator uses its own Ajv instance. It does not read the
`inputValidatorOptions` used by the request validator: it is configured with
the `outputValidatorOptions` of the [`schemaController`](./Server.md#schemacontroller).
The defaults keep the v5 serializer (`fast-json-stringify`) behaviour where
Ajv can, and keep the response fast:

| Option | Default | Why |
|---|---|---|
| `useDefaults` | `true` | Missing properties are filled in from `default`, like the v5 serializer did. |
| `coerceTypes` | `true` | Values are coerced to the declared type (`'42'` to `42`, `42` to `'42'`, `null` to `''`), like the v5 serializer did. |
| `removeAdditional` | `true` | Undeclared properties are removed where the schema declares `additionalProperties: false`. |
| `allErrors` | `false` | A single error is enough to reject the payload. |
| `validateFormats` | `false` | The v5 serializer never checked `format`, and checking it is the most expensive part of the validation. |
| `strict` | `false` | The v5 serializer never linted response schemas, so annotation keywords such as `example` are accepted. |

The `customOptions` override these defaults. `plugins` and `onCreate` are
forwarded to [`@fastify/ajv-compiler`](https://github.com/fastify/ajv-compiler)
as they are. The JTD `mode` is not supported for responses.

```js
const fastify = Fastify({
  schemaController: {
    outputValidatorOptions: {
      customOptions: {
        validateFormats: true, // check the `format` keyword of the responses
        removeAdditional: 'all' // remove all the undeclared properties
      }
    }
  }
})
```

The options are encapsulated: a plugin can change them for its own routes with
`setSchemaController`:

```js
fastify.register(async function (child) {
  child.setSchemaController({
    outputValidatorOptions: { customOptions: { coerceTypes: false } }
  })

  child.get('/strict', { schema }, handler)
})
```

##### Response validator compiler
<a id="output-validation-compiler"></a>

To replace the response validator with another library, use
[`setOutputValidatorCompiler`](./Server.md#set-output-validator-compiler). The
compiler is called once per response schema with
`{ schema, method, url, httpStatus, contentType }` and returns a function that
validates the payload:

- it rejects the payload only by returning `false`, with the reasons in its
  `errors` property (an Ajv-style array, it can be empty); any other return
  value, `{ error }` included, accepts it;
- it can change the payload in place, and the changed payload is the one that
  is serialized.

```js
const Ajv = require('ajv')
const ajv = new Ajv({ removeAdditional: 'all', coerceTypes: true })

fastify.setOutputValidatorCompiler(({ schema, method, url, httpStatus, contentType }) => {
  return ajv.compile(schema)
})
```

The compiler is used as it is: it does not receive the `outputValidatorOptions`
and it does not resolve the schemas added with
[`addSchema`](./Server.md#add-schema) by itself. Like
[`setInputValidatorCompiler`](./Server.md#set-input-validator-compiler), it
applies to the routes of the current context and its children only.

To build the response validator from the shared schemas and the
`outputValidatorOptions`, set
[`schemaController.compilersFactory.buildOutputValidator`](./Server.md#schemacontroller)
instead. The compiled response validator can be read with
[`fastify.outputValidatorCompiler`](./Server.md#outputvalidatorcompiler).

##### Differences from v5
<a id="output-validation-differences"></a>

In v5 the responses were serialized by `fast-json-stringify`, which wrote only
what the schema declares. The response validator followed by `JSON.stringify`
differs in some cases:
- Without `additionalProperties: false`, undeclared properties are sent to the
  client. `fast-json-stringify` always dropped them. Declare
  `additionalProperties: false`, or set `removeAdditional: 'all'` to strip them
  during validation.
- `Date` objects are rejected for a `type: 'string'` schema, while
  `fast-json-stringify` serialized them as ISO strings. A `Date` in an
  undeclared property is sent as an ISO string by its `toJSON` method.
- Non-integer numbers are rejected for a `type: 'integer'` schema, while
  `fast-json-stringify` rounded them. The `serializerOpts.rounding` option is
  removed.
- A top-level primitive is not coerced: a `{ type: 'string' }` schema sends the
  number `42` as `42`, where `fast-json-stringify` sent `"42"`.
- The properties are sent in the order of the object, not of the schema; the
  properties filled in from `default` come last.
- `$async` response schemas are not awaited, and the payload is sent as it is.

#### Custom Serializer
<a id="schema-serializer"></a>

There is no serializer compiler: a response with a schema is always validated
and then sent with `JSON.stringify`. To replace the response validator, see
[Response validator compiler](#output-validation-compiler).

To serialize the payload differently, set a custom serializer with
[`reply.serializer(...)`](./Reply.md#serializerfunc) or
[`setReplySerializer`](./Server.md#setreplyserializer).

> ⚠ Warning: A custom serializer skips the
> [output validation](#output-validation): the payload is not checked against
> the response schema.

### Error Handling
When schema validation fails for a request, Fastify will automatically return a
status 400 response including the result from the validator in the payload. For
example, if the following schema is used for a route:

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

If the request fails to satisfy the schema, the route will return a response
with the following payload:

```js
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "body should have required property 'name'"
}
```

> ⚠ Security Consideration: By default, validation error details from the schema
> are included in the response payload. If your organization requires sanitizing
> or customizing these error messages (e.g., to avoid exposing internal schema
> details), configure a custom error handler using
> [`setErrorHandler()`](./Server.md#seterrorhandler).

To handle errors inside the route, specify the `attachValidation` option. If
there is a validation error, the `validationError` property of the request will
contain the same `Error` object Fastify would have sent on its own, so no
message has to be rebuilt from the raw validation result:

- `message` is the formatted message, identical to the one in the response
  payload above (for example `body must have required property 'name'`). It is
  produced by [`schemaErrorFormatter`](#schemaerrorformatter), so a custom
  formatter is reflected here too.
- `validation` is the raw validation result, as returned by the validator.
- `validationContext` is the part of the request that failed validation
  (`body`, `params`, `querystring` or `headers`).
- `code` is `FST_ERR_VALIDATION` and `statusCode` is `400`.
- When the validator reports a list of errors (as Ajv does) and the default
  [`schemaErrorFormatter`](#schemaerrorformatter) is used, the error is an
  instance of [`FST_ERR_VALIDATION`](./Errors.md#fst_err_validation) without a
  [stack trace](./Errors.md#errors-in-input-data). Errors returned by the
  validator itself, or by a custom formatter, are used as they are.

```js
const fastify = Fastify()

fastify.post('/', { schema, attachValidation: true }, function (req, reply) {
  if (req.validationError) {
    // `req.validationError.message` is the formatted message
    // `req.validationError.validation` contains the raw validation result
    reply.code(400).send(req.validationError)
  }
})
```

When the response payload fails the [output validation](#output-validation),
the error is a
[`FST_ERR_SCH_OUTPUT_VALIDATION`](./Errors.md#fst_err_sch_output_validation)
with status code `500`. It carries the same `validation` property and its
`validationContext` is `response`, so an error handler can tell it apart from
the request validation errors:

```js
fastify.setErrorHandler(function (error, request, reply) {
  if (error.validationContext === 'response') {
    request.log.error({ errors: error.validation }, 'invalid response payload')
    reply.code(500).send({ message: 'Internal Server Error' })
    return
  }
  reply.send(error)
})
```

#### `schemaErrorFormatter`

To format errors, provide a sync function that returns an error as the
`schemaErrorFormatter` option when instantiating Fastify. The context function
will be the Fastify server instance.

`errors` is an array of Fastify schema errors `FastifySchemaValidationError`.
`dataVar` is the currently validated part of the schema (params, body,
querystring, headers).

```js
const fastify = Fastify({
  schemaErrorFormatter: (errors, dataVar) => {
    // ... my formatting logic
    return new Error(myErrorMessage)
  }
})

// or
fastify.setSchemaErrorFormatter(function (errors, dataVar) {
  this.log.error({ err: errors }, 'Validation failed')
  // ... my formatting logic
  return new Error(myErrorMessage)
})
```

Use [setErrorHandler](./Server.md#seterrorhandler) to define a custom response
for validation errors such as:

```js
fastify.setErrorHandler(function (error, request, reply) {
  if (error.validation) {
     reply.status(422).send(new Error('validation failed'))
  }
})
```

For custom error responses in the schema, see
[`ajv-errors`](https://github.com/ajv-validator/ajv-errors). Check out the
[example](https://github.com/fastify/example/blob/HEAD/validation-messages/custom-errors-messages.js)
usage.

> Fastify v5 uses AJV v8 and requires a compatible `ajv-errors` version.
> Fastify v3 requires `ajv-errors@1.0.1`, which supports AJV v6.
> See the [AJV compiler versions table](https://github.com/fastify/ajv-compiler/#versions)
> for the AJV version used by each Fastify release.

Below is an example showing how to add **custom error messages for each
property** of a schema by supplying custom AJV options. Inline comments in the
schema describe how to configure it to show a different error message for each
case:

```js
const fastify = Fastify({
  schemaController: {
    inputValidatorOptions: {
      customOptions: {
        jsonPointers: true,
        // ⚠ Warning: Enabling this option may lead to this security issue https://www.cvedetails.com/cve/CVE-2020-8192/
        allErrors: true
      },
      plugins: [
        require('ajv-errors')
      ]
    }
  }
})

const schema = {
  body: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        errorMessage: {
          type: 'Bad name'
        }
      },
      age: {
        type: 'number',
        errorMessage: {
          type: 'Bad age', // specify custom message for
          min: 'Too young' // all constraints except required
        }
      }
    },
    required: ['name', 'age'],
    errorMessage: {
      required: {
        name: 'Why no name!', // specify error message for when the
        age: 'Why no age!' // property is missing from input
      }
    }
  }
}

fastify.post('/', { schema, }, (request, reply) => {
  reply.send({
    hello: 'world'
  })
})
```

To return localized error messages, see
[ajv-i18n](https://github.com/ajv-validator/ajv-i18n).

```js
const localize = require('ajv-i18n')

const fastify = Fastify()

const schema = {
  body: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
      },
      age: {
        type: 'number',
      }
    },
    required: ['name', 'age'],
  }
}

fastify.setErrorHandler(function (error, request, reply) {
  if (error.validation) {
    localize.ru(error.validation)
    reply.status(400).send(error.validation)
    return
  }
  reply.send(error)
})
```

### JSON Schema support

JSON Schema provides utilities to optimize schemas. Combined with Fastify's
shared schema, all schemas can be easily reused.

| Use Case                          | Validator | Serializer |
|-----------------------------------|-----------|------------|
| `$ref` to `$id`                   | ️️✔️ | ✔️ |
| `$ref` to `/definitions`          | ✔️ | ✔️ |
| `$ref` to shared schema `$id`          | ✔️ | ✔️ |
| `$ref` to shared schema `/definitions` | ✔️ | ✔️ |

#### Examples

##### Usage of `$ref` to `$id` in same JSON Schema

```js
const refToId = {
  type: 'object',
  definitions: {
    foo: {
      $id: '#address',
      type: 'object',
      properties: {
        city: { type: 'string' }
      }
    }
  },
  properties: {
    home: { $ref: '#address' },
    work: { $ref: '#address' }
  }
}
```


##### Usage of `$ref` to `/definitions` in same JSON Schema
```js
const refToDefinitions = {
  type: 'object',
  definitions: {
    foo: {
      $id: '#address',
      type: 'object',
      properties: {
        city: { type: 'string' }
      }
    }
  },
  properties: {
    home: { $ref: '#/definitions/foo' },
    work: { $ref: '#/definitions/foo' }
  }
}
```

##### Usage `$ref` to a shared schema `$id` as external schema
```js
fastify.addSchema({
  $id: 'http://foo/common.json',
  type: 'object',
  definitions: {
    foo: {
      $id: '#address',
      type: 'object',
      properties: {
        city: { type: 'string' }
      }
    }
  }
})

const refToSharedSchemaId = {
  type: 'object',
  properties: {
    home: { $ref: 'http://foo/common.json#address' },
    work: { $ref: 'http://foo/common.json#address' }
  }
}
```

##### Usage `$ref` to a shared schema `/definitions` as external schema
```js
fastify.addSchema({
  $id: 'http://foo/shared.json',
  type: 'object',
  definitions: {
    foo: {
      type: 'object',
      properties: {
        city: { type: 'string' }
      }
    }
  }
})

const refToSharedSchemaDefinitions = {
  type: 'object',
  properties: {
    home: { $ref: 'http://foo/shared.json#/definitions/foo' },
    work: { $ref: 'http://foo/shared.json#/definitions/foo' }
  }
}
```

### Resources
<a id="resources"></a>

- [JSON Schema](https://json-schema.org/)
- [Understanding JSON
  Schema](https://json-schema.org/understanding-json-schema/about)
- [Ajv documentation](https://github.com/ajv-validator/ajv/blob/master/README.md)
- [Ajv i18n](https://github.com/ajv-validator/ajv-i18n)
- [Ajv custom errors](https://github.com/ajv-validator/ajv-errors)
- Custom error handling with core methods with error file dumping
  [example](https://github.com/fastify/example/tree/main/validation-messages)
