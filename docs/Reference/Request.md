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
- `hostname` - the host of the incoming request (derived from `X-Forwarded-Host`
  header when the [`trustProxy`](./Server.md#factory-trust-proxy) option is
  enabled). For HTTP/2 compatibility it returns `:authority` if no host header
  exists.
- `protocol` - the protocol of the incoming request (`https` or `http`)
- `method` - the method of the incoming request
- `url` - the URL of the incoming request
- `routerMethod` - the method defined for the router that is handling the
  request
- `routerPath` - the path pattern defined for the router that is handling the
  request
- `is404` - true if request is being handled by 404 handler, false if it is not
- `connection` - Deprecated, use `socket` instead. The underlying connection of
  the incoming request.
- `socket` - the underlying connection of the incoming request
- `context` - A Fastify internal object. You should not use it directly or
  modify it. It is useful to access one special key:
  - `context.config` - The route [`config`](./Routes.md#routes-config) object.

### Headers

The `request.headers` is a getter that returns an Object with the headers of the
incoming request. You can set custom headers like this:

```js
request.headers = {
  'foo': 'bar',
  'baz': 'qux'
}
```

This operation will add to the request headers the new values that can be read
calling `request.headers.bar`. Moreover, you can still access the standard
request's headers with the `request.raw.headers` property.

> Note: For performance reason on `not found` route, you may see that we will
add an extra property `Symbol('fastify.RequestAcceptVersion')` on the headers.

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
  console.log(request.hostname)
  console.log(request.protocol)
  console.log(request.url)
  console.log(request.routerMethod)
  console.log(request.routerPath)
  request.log.info('some info')
})
```
