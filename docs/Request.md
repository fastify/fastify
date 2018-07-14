<h1 align="center">Fastify</h1>

## Request
The first parameter of the handler function is `Request`.<br>
Request is a core Fastify object containing the following properties:
- `query` - the parsed querystring
- `body` - the body content, properly parsed by the Content-Type value
- `params` - the params matching the URL
- `headers` - the parsed headers
- `raw` - the incoming HTTP request from Node core *(you can use the alias `req`)*
- `id` - the request id
- `log` - the logger instance of the incoming request

**Example**

```js
fastify.post('/resource/:section/:id', options, function (request, reply) {
  console.log('parsed body params\n' + JSON.stringify(request.body, null, 2))
  console.log('parsed query params\n' + JSON.stringify(request.query, null, 2))
  console.log('routing params\n' + JSON.stringify(request.params, null, 2))
  console.log('parsed headers\n' + JSON.stringify(request.headers, null, 2))
  console.log('request inner id' + request.id)
  console.log('raw request instance\n' + request.raw)
  request.log.info('some info')
  response.send('ok')
})
```

```bash
curl -d '{"key1":"value1", "key2":"value2"}' -H "Content-Type: application/json" -X POST http://localhost:9876/resource/article/234?sort=title

parsed body params
{
  "key1": "value1",
  "key2": "value2"
}
parsed query params
{
  "sort": "title"
}
routing params
{
  "section": "article",
  "id": "234"
}
parsed headers
{
  "host": "localhost:9876",
  "user-agent": "curl/7.58.0",
  "accept": "*/*",
  "content-type": "application/json",
  "content-length": "34"
}
request inner id
1
raw request instance
IncomingMessage {
  ...
}
{"level":30,"time":1531553011571,"msg":"some info","pid":15499,"hostname":"workstation","reqId":1,"v":1}

```

