<h1 align="center">Fastify</h1>

## Request
The first parameter of the handler function is `Request`.<br>
Request is a core Fastify object containing the following fields:
- `query` - the parsed querystring
- `body` - the body
- `params` - the params matching the URL
- `headers` - the headers
- `raw` - the incoming HTTP request from Node core
- `req` *(deprecated, use `.raw` instead)* - the incoming HTTP request from Node core
- `server` - The Fastify server instance, scoped to the current [encapsulation context](Encapsulation.md)
- `id` - the request id
- `log` - the logger instance of the incoming request
- `ip` - the IP address of the incoming request
- `ips` - an array of the IP addresses, ordered from closest to furthest, in the `X-Forwarded-For` header of the incoming request (only when the [`trustProxy`](Server.md#factory-trust-proxy) option is enabled)
- `hostname` - the hostname of the incoming request (derived from `X-Forwarded-Host` header when the [`trustProxy`](Server.md#factory-trust-proxy) option is enabled)
- `protocol` - the protocol of the incoming request (`https` or `http`)
- `method` - the method of the incoming request
- `url` - the url of the incoming request
- `routerMethod` - the method defined for the router that is handling the request
- `routerPath` - the path pattern defined for the router that is handling the request
- `is404` - true if request is being handled by 404 handler, false if it is not
- `connection` - Deprecated, use `socket` instead. The underlying connection of the incoming request.
- `socket` - the underlying connection of the incoming request
- `context` - A Fastify internal object. You should not use it directly or modify it. It is usefull to access one special key:
  - `context.config` - The route [`config`](Routes.md#routes-config) object.


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
  request.log.info('some info')
})
```
