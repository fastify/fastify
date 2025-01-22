<h1 align="center">Fastify</h1>

## Request
The first parameter of the handler function is `Request`.

Request is a core Fastify object containing the following fields:
- `query` - the parsed querystring, its format is specified by
  [`querystringParser`](./Server.md#querystringparser)
- `body` - the request payload, see [Content-Type
  Parser](./ContentTypeParser.md) for details on what request payloads Fastify
  natively parses and how to support other content types
- `params` - the params matching the URL
- [`headers`](#headers) - the headers getter and setter
- `raw` - the incoming HTTP request from Node core
- `server` - The Fastify server instance, scoped to the current [encapsulation
  context](./Encapsulation.md)
- `id` - the request ID
- `log` - the logger instance of the incoming request
- `ip` - the IP address of the incoming request
- `ips` - an array of the IP addresses, ordered from closest to furthest, in the
  `X-Forwarded-For` header of the incoming request (only when the
  [`trustProxy`](./Server.md#factory-trust-proxy) option is enabled)
- `host` - the host of the incoming request (derived from `X-Forwarded-Host`
  header when the [`trustProxy`](./Server.md#factory-trust-proxy) option is
  enabled). For HTTP/2 compatibility it returns `:authority` if no host header
  exists. The host header may return an empty string if `requireHostHeader`
  is false, not provided with HTTP/1.0, or removed by schema validation.
- `hostname` - the hostname derived from the `host` property of
  the incoming request
- `port` - the port from the `host` property, which may refer to
  the port the server is listening on
- `protocol` - the protocol of the incoming request (`https` or `http`)
- `method` - the method of the incoming request
- `url` - the URL of the incoming request
- `originalUrl` - similar to `url`, this allows you to access the
  original `url` in case of internal re-routing
- `is404` - true if request is being handled by 404 handler, false if it is not
- `socket` - the underlying connection of the incoming request
- `context` - Deprecated, use `request.routeOptions.config` instead.
A Fastify internal object. You should not use
it directly or modify it. It is useful to access one special key:
  - `context.config` - The route [`config`](./Routes.md#routes-config) object.
- `routeOptions` - The route [`option`](./Routes.md#routes-options) object
  - `bodyLimit` - either server limit or route limit
  - `config` - the [`config`](./Routes.md#routes-config) object for this route
  - `method` - the http method for the route
  - `url` - the path of the URL to match this route
  - `handler` - the handler for this route
  - `attachValidation` - attach `validationError` to request
    (if there is a schema defined)
  - `logLevel` - log level defined for this route
  - `schema` - the JSON schemas definition for this route
  - `version` -  a semver compatible string that defines the version of the endpoint
  - `exposeHeadRoute` - creates a sibling HEAD route for any GET routes
  - `prefixTrailingSlash` - string used to determine how to handle passing /
    as a route with a prefix.
- [.getValidationFunction(schema | httpPart)](#getvalidationfunction) -
  Returns a validation function for the specified schema or http part,
  if any of either are set or cached.
- [.compileValidationSchema(schema, [httpPart])](#compilevalidationschema) -
  Compiles the specified schema and returns a validation function
  using the default (or customized) `ValidationCompiler`.
  The optional `httpPart` is forwarded to the `ValidationCompiler`
  if provided, defaults to `null`.
- [.validateInput(data, schema | httpPart, [httpPart])](#validate) -
  Validates the specified input by using the specified
  schema and returns the serialized payload. If the optional
  `httpPart` is provided, the function will use the serializer
  function given for that HTTP Status Code. Defaults to `null`.

### Headers

The `request.headers` is a getter that returns an object with the headers of the
incoming request. Set custom headers as follows:

```js
request.headers = {
  'foo': 'bar',
  'baz': 'qux'
}
```

This operation adds new values to the request headers, accessible via
`request.headers.bar`. Standard request headers remain accessible via
`request.raw.headers`.

For performance reasons, `Symbol('fastify.RequestAcceptVersion')` may be added
to headers on `not found` routes.

> Note: Schema validation may mutate the `request.headers` and
`request.raw.headers` objects, causing the headers to become empty.

```js
fastify.post('/:params', options, function (request, reply) {
  console.log(request.body)
  console.log(request.query)
  console.log(request.params)
  console.log(request.headers)
  console.log(request.raw)
  console.log(request.server)
  console.log(request.id)
  console.log(request.ip)
  console.log(request.ips)
  console.log(request.host)
  console.log(request.hostname)
  console.log(request.port)
  console.log(request.protocol)
  console.log(request.url)
  console.log(request.routeOptions.method)
  console.log(request.routeOptions.bodyLimit)
  console.log(request.routeOptions.method)
  console.log(request.routeOptions.url)
  console.log(request.routeOptions.attachValidation)
  console.log(request.routeOptions.logLevel)
  console.log(request.routeOptions.version)
  console.log(request.routeOptions.exposeHeadRoute)
  console.log(request.routeOptions.prefixTrailingSlash)
  console.log(request.routeOptions.logLevel)
  request.log.info('some info')
})
```
### .getValidationFunction(schema | httpPart)
<a id="getvalidationfunction"></a>

By calling this function with a provided `schema` or `httpPart`, it returns a
`validation` function to validate diverse inputs. It returns `undefined` if no
serialization function is found using the provided inputs.

This function has an `errors` property. Errors encountered during the last
validation are assigned to `errors`.

```js
const validate = request
                  .getValidationFunction({
                    type: 'object',
                    properties: {
                      foo: {
                        type: 'string'
                      }
                    }
                  })
console.log(validate({ foo: 'bar' })) // true
console.log(validate.errors) // null

// or

const validate = request
                  .getValidationFunction('body')
console.log(validate({ foo: 0.5 })) // false
console.log(validate.errors) // validation errors
```

See [.compileValidationSchema(schema, [httpStatus])](#compileValidationSchema)
for more information on compiling validation schemas.

### .compileValidationSchema(schema, [httpPart])
<a id="compilevalidationschema"></a>

This function compiles a validation schema and returns a function to validate data.
The returned function (a.k.a. _validation function_) is compiled using the provided
[`SchemaController#ValidationCompiler`](./Server.md#schema-controller). A `WeakMap`
is used to cache this, reducing compilation calls.

The optional parameter `httpPart`, if provided, is forwarded to the
`ValidationCompiler`, allowing it to compile the validation function if a custom
`ValidationCompiler` is provided for the route.

This function has an `errors` property. Errors encountered during the last
validation are assigned to `errors`.

```js
const validate = request
                  .compileValidationSchema({
                    type: 'object',
                    properties: {
                      foo: {
                        type: 'string'
                      }
                    }
                  })
console.log(validate({ foo: 'bar' })) // true
console.log(validate.errors) // null

// or

const validate = request
                  .compileValidationSchema({
                    type: 'object',
                    properties: {
                      foo: {
                        type: 'string'
                      }
                    }
                  }, 200)
console.log(validate({ hello: 'world' })) // false
console.log(validate.errors) // validation errors
```

Be careful when using this function, as it caches compiled validation functions
based on the provided schema. If schemas are mutated or changed, the validation
functions will not detect the alterations and will reuse the previously compiled
validation function, as the cache is based on the schema's reference.

If schema properties need to be changed, create a new schema object to benefit
from the cache mechanism.

Using the following schema as an example:
```js
const schema1 = {
  type: 'object',
  properties: {
    foo: {
      type: 'string'
    }
  }
}
```

*Not*
```js
const validate = request.compileValidationSchema(schema1)

// Later on...
schema1.properties.foo.type. = 'integer'
const newValidate = request.compileValidationSchema(schema1)

console.log(newValidate === validate) // true
```

*Instead*
```js
const validate = request.compileValidationSchema(schema1)

// Later on...
const newSchema = Object.assign({}, schema1)
newSchema.properties.foo.type = 'integer'

const newValidate = request.compileValidationSchema(newSchema)

console.log(newValidate === validate) // false
```

### .validateInput(data, [schema | httpStatus], [httpStatus])
<a id="validate"></a>

This function validates the input based on the provided schema or HTTP part. If
both are provided, the `httpPart` parameter takes precedence.

If no validation function exists for a given `schema`, a new validation function
will be compiled, forwarding the `httpPart` if provided.

```js
request
  .validateInput({ foo: 'bar'}, {
    type: 'object',
    properties: {
      foo: {
        type: 'string'
      }
    }
  }) // true

// or

request
  .validateInput({ foo: 'bar'}, {
    type: 'object',
    properties: {
      foo: {
        type: 'string'
      }
    }
  }, 'body') // true

// or

request
  .validateInput({ hello: 'world'}, 'query') // false
```

See [.compileValidationSchema(schema, [httpStatus])](#compileValidationSchema)
for more information on compiling validation schemas.
