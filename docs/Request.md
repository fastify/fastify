<h1 align="center">Fastify</h1>

## Request
The first parameter of the handler function is `Request`.<br>
Request is a core Fastify object containing the following fields:
- `query` - the parsed querystring
- `body` - the body
- `params` - the params matching the URL
- `headers` - the headers
- `raw` - the incoming HTTP request from Node core *(you can use the alias `req`)*
- `id` - the request id
- `log` - the logger instance of the incoming request
- `ip` - the IP address of the incoming request
- `ips` - an array of the IP addresses in the `X-Forwarded-For` header of the incoming request (only when the [`trustProxy`](https://github.com/fastify/fastify/blob/master/docs/Server.md#factory-trust-proxy) option is enabled)
- `hostname` - the hostname of the incoming request

```js
fastify.post('/:params', options, function (request, reply) {
  console.log(request.body)
  console.log(request.query)
  console.log(request.params)
  console.log(request.headers)
  console.log(request.raw)
  console.log(request.id)
  console.log(request.ip)
  console.log(request.ips)
  console.log(request.hostname)
  request.log.info('some info')
})
```
