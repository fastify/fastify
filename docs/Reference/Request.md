<h1 align="center">Fastify</h1>

## Request
- [Introduction](#introduction)
- [Request](#request-object)
  - [Properties](#properties)
    - [.body](#body)
    - [.query](#query)
    - [.params](#params)
    - [.headers](#headers)
    - [.id](#id)
    - [.log](#log)
    - [.method](#method)
    - [.url](#url)
    - [.routeOptions](#routeoptions)
    - [.server](#server)
    - [.raw](#raw)
    - [.ip](#ip)
    - [.ips](#ips)
    - [.host](#host)
    - [.hostname](#hostname)
    - [.port](#port)
    - [.protocol](#protocol)
    - [.originalUrl](#originalurl)
    - [.mediaType](#mediatype)
    - [.signal](#signal)
    - [.socket](#socket)
    - [.is404](#is404)
    - [.validationError](#validationerror)
  - [Methods](#methods)
    - [.getDecorator(name)](#getdecorator)
    - [.setDecorator(name, value)](#setdecorator)
    - [.getValidationFunction(schema | httpPart)](#getvalidationfunction)
    - [.compileValidationSchema(schema, [httpPart])](#compilevalidationschema)
    - [.validateInput(data, [schema | httpPart], [httpPart])](#validate)

### Introduction
<a id="introduction"></a>

The first parameter of the handler function is `Request`.

Request is a core Fastify object containing the following fields:
- `query` - The parsed querystring.
- `body` - The request payload.
- `params` - The params matching the URL.
- [`headers`](#headers) - The headers getter and setter.
- `raw` - The incoming HTTP request from Node core.
- `server` - The Fastify server instance.
- `id` - The request ID.
- `log` - The logger instance of the incoming request.
- `ip` - The IP address of the incoming request.
- `ips` - An array of IP addresses from `X-Forwarded-For`.
- `host` - The host of the incoming request.
- `hostname` - The hostname parsed from `request.host`.
- `port` - The port parsed from `request.host`.
- `protocol` - The protocol of the incoming request (`https` or `http`).
- `method` - The method of the incoming request.
- `url` - The URL of the incoming request.
- `originalUrl` - The original URL of the incoming request.
- `mediaType` - The media type extracted from `Content-Type` header.
- `is404` - `true` if request is being handled by 404 handler, `false` otherwise.
- `socket` - The underlying connection of the incoming request.
- `signal` - An `AbortSignal` that aborts on handler timeout or client
  disconnect.
- `routeOptions` - The route [`option`](./Routes.md#routes-options) object.
- `validationError` - The validation error, when `attachValidation` is set.
- `getDecorator(name)` - Returns the value of a request decorator.
- `setDecorator(name, value)` - Sets the value of a request decorator.
- [.getValidationFunction(schema | httpPart)](#getvalidationfunction) -
  Returns a validation function for the specified schema or HTTP part, if
  set or cached.
- [.compileValidationSchema(schema, [httpPart])](#compilevalidationschema) -
  Compiles the specified schema and returns a validation function using the
  default (or customized) `ValidationCompiler`. The optional `httpPart` is
  forwarded to the `ValidationCompiler` if provided, defaults to `null`.
- [.validateInput(data, schema | httpPart, [httpPart])](#validate) -
  Validates the input using the specified schema or HTTP part and returns
  `true` if the input is valid, `false` otherwise. If `httpPart` is provided,
  the function uses the validator for that HTTP part. Defaults to `null`.

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
  console.log(request.routeOptions.handlerTimeout)
  console.log(request.routeOptions.url)
  console.log(request.routeOptions.attachValidation)
  console.log(request.routeOptions.logLevel)
  console.log(request.routeOptions.version)
  console.log(request.routeOptions.exposeHeadRoute)
  console.log(request.routeOptions.prefixTrailingSlash)
  console.log(request.routeOptions.config)
  request.log.info('some info')
})
```

> ⚠️ Security:
> `request.params`, `request.query`, `request.headers`, and `request.body`
> are untrusted network input. Route parameter values are percent-decoded
> before your handler runs, so a segment like `..%2ffile` becomes `../file`
> in `request.params`. Do not use parameter values as filesystem paths,
> template names, or redirect targets without validating or containing
> them. Prefer [`@fastify/static`](https://github.com/fastify/fastify-static)
> (or `reply.sendFile`) when serving files from a root directory.
>
> `request.ip`, `request.ips`, `request.host`, `request.hostname`,
> `request.port`, and `request.protocol` come from request metadata
> (socket and/or forwarding headers) and should also be treated as
> untrusted input. Fastify does not perform security validation for
> business logic. If these values are used in security-sensitive decisions,
> they must be validated explicitly (for example: trusted proxy
> configuration, allow-lists, strict parsing, and normalization).

### Request
<a id="request-object"></a>

#### Properties
<a id="properties"></a>

##### .body

The request payload. See [Content-Type Parser](./ContentTypeParser.md) for
details on what request payloads Fastify natively parses and how to support
other content types.

##### .query

The parsed querystring. Its format is specified by
[`querystringParser`](./Server.md#querystringparser).

##### .params

The params matching the URL. Values are percent-decoded (for example `%20`
becomes a space, and `%2f` becomes `/`). Decoded values may contain `.`, `..`,
`/`, or other characters; treat them as untrusted input. See the
[security note](#introduction) and
[Routes - Url building](./Routes.md#url-building).

##### .headers

The `request.headers` is a getter that returns an object with the headers of the
incoming request. Set custom headers as follows:

```js
request.headers = {
  'foo': 'bar',
  'baz': 'qux'
}
```

This operation adds new values to the request headers, accessible via
`request.headers.foo`. Standard request headers remain accessible via
`request.raw.headers`.

For performance reasons, `Symbol('fastify.RequestAcceptVersion')` may be added
to headers on `not found` routes.

> ℹ️ Note:
> Schema validation may mutate the `request.headers` and
> `request.raw.headers` objects, causing the headers to become empty.

> ℹ️ Note:
> The setter is additive, so it cannot be used to *remove* a header, and a
> `headers` schema validator's synchronous `{ value }` result is applied through
> this same setter. `request.headers` is therefore the incoming request's
> headers (plus any additive values), not a sanitized or authoritative view. If
> your application needs an allow-listed header subset, build and consume it
> explicitly from the validated data or from `request.raw.headers`.

##### .id

The request ID. It is generated by [`genReqId`](./Server.md#genreqid), or read
from the header configured with [`requestIdHeader`](./Server.md#requestidheader)
when the incoming request includes it.

##### .log

The logger instance of the incoming request. By default, it is a child logger of
the server logger that adds the request ID (`reqId`) to every log line. See
[`childLoggerFactory`](./Server.md#childLoggerFactory) to customize it.

##### .method

The method of the incoming request.

##### .url

The URL of the incoming request.

##### .routeOptions

The route [`option`](./Routes.md#routes-options) object.
- `bodyLimit` - Either server limit or route limit.
- `handlerTimeout` - The handler timeout configured for this route.
- `config` - The [`config`](./Routes.md#routes-config) object for this route.
- `method` - The HTTP method for the route.
- `url` - The path of the URL to match this route.
- `handler` - The handler for this route.
- `attachValidation` - Attach `validationError` to request (if there is
  a schema defined).
- `logLevel` - Log level defined for this route.
- `schema` - The JSON schemas definition for this route.
- `version` - A semver compatible string that defines the version of the
  endpoint.
- `exposeHeadRoute` - Creates a sibling HEAD route for any GET routes.
- `prefixTrailingSlash` - String used to determine how to handle passing `/`
  as a route with a prefix.

##### .server

The Fastify server instance, scoped to the current
[encapsulation context](./Encapsulation.md).

##### .raw

The incoming HTTP request from Node core.

##### .ip

The IP address of the incoming request. This value is taken from
`socket.remoteAddress` (or from `X-Forwarded-For` when
[`trustProxy`](./Server.md#factory-trust-proxy) is enabled). It is `undefined`
when the underlying socket is not available.

##### .ips

An array of IP addresses, ordered from closest to furthest, from
`X-Forwarded-For` (only when [`trustProxy`](./Server.md#factory-trust-proxy) is
enabled). It is `undefined` when `trustProxy` is not enabled.

##### .host

The host of the incoming request (derived from `X-Forwarded-Host` when
[`trustProxy`](./Server.md#factory-trust-proxy) is enabled). For HTTP/2
compatibility, it returns `:authority` if no host header exists. The host header
may return an empty string if `requireHostHeader` is `false`, not provided with
HTTP/1.0, or removed by schema validation.

##### .hostname

The hostname parsed from `request.host`. For IPv6 hosts, the brackets are kept
(for example, `[::1]`).

##### .port

The port parsed from `request.host`, which may refer to the port the server is
listening on. It is `null` when the host does not include a port.

##### .protocol

The protocol of the incoming request (`https` or `http`). This value comes from
`socket.encrypted` (or `X-Forwarded-Proto` when
[`trustProxy`](./Server.md#factory-trust-proxy) is enabled). It is `undefined`
when the underlying socket is not available.

##### .originalUrl

Similar to `url`, allows access to the original `url` in case of internal
re-routing.

##### .mediaType

The media type extracted from `Content-Type` header. When `Content-Type` header
is missing, it will return `undefined`.

##### .signal

An `AbortSignal` that aborts when the handler timeout fires or the client
disconnects. Created lazily on first access, so there is zero overhead when not
used. When [`handlerTimeout`](./Server.md#factory-handler-timeout) is
configured, the signal is pre-created and also aborts on timeout. Pass it to
`fetch()`, database queries, or any API accepting a `signal` option for
cooperative cancellation. On timeout, `signal.reason` is the
`FST_ERR_HANDLER_TIMEOUT` error; on client disconnect it is a generic
`AbortError`. Check `signal.reason.code` to distinguish the two cases.

##### .socket

The underlying connection of the incoming request.

##### .is404

`true` if request is being handled by 404 handler, `false` otherwise.

##### .validationError

The validation error of the request. It is set only when the route has the
[`attachValidation`](./Routes.md#routes-options) option enabled and the
validation fails; otherwise it is `undefined`. In that case, Fastify calls the
handler instead of replying with a `400` error. See
[Validation and Serialization](./Validation-and-Serialization.md#error-handling)
for the properties of the error object.

```js
fastify.post('/', { schema, attachValidation: true }, function (request, reply) {
  if (request.validationError) {
    // `request.validationError.validationContext` is the failed part,
    // for example `body`
    reply.code(422).send(request.validationError)
    return
  }
  reply.send({ hello: 'world' })
})
```

#### Methods
<a id="methods"></a>

##### .getDecorator(name)
<a id="getdecorator"></a>

Returns the value of a request decorator declared with
[`decorateRequest`](./Decorators.md#decoraterequestname-value-dependencies).
If the decorator is a function, it is returned bound to the request. It throws
an `FST_ERR_DEC_UNDECLARED` error if the decorator has not been declared. See
[`getDecorator`](./Decorators.md#getdecoratorname) for more details.

```js
fastify.decorateRequest('user', null)

fastify.get('/', function (request, reply) {
  const user = request.getDecorator('user')
  reply.send({ user })
})
```

##### .setDecorator(name, value)
<a id="setdecorator"></a>

Sets the value of a request decorator declared with
[`decorateRequest`](./Decorators.md#decoraterequestname-value-dependencies).
It throws an `FST_ERR_DEC_UNDECLARED` error if the decorator has not been
declared. See [`setDecorator`](./Decorators.md#setdecoratorname-value) for more
details.

```js
fastify.decorateRequest('user', null)

fastify.addHook('preHandler', async (request) => {
  request.setDecorator('user', 'Bob Dylan')
})
```

##### .getValidationFunction(schema | httpPart)
<a id="getvalidationfunction"></a>

By calling this function with a provided `schema` or `httpPart`, it returns a
`validation` function to validate diverse inputs. It returns `undefined` if no
validation function is found using the provided inputs.

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

##### .compileValidationSchema(schema, [httpPart])
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
                  }, 'body')
console.log(validate({ foo: {} })) // false
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
schema1.properties.foo.type = 'integer'
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

##### .validateInput(data, [schema | httpPart], [httpPart])
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
