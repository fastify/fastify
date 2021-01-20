<h1 align="center">Fastify</h1>

## `Content-Type` Parser
Natively, Fastify only supports `'application/json'` and `'text/plain'` content types. The default charset is `utf-8`. If you need to support different content types, you can use the `addContentTypeParser` API. *The default JSON and/or plain text parser can be changed.*

As with the other APIs, `addContentTypeParser` is encapsulated in the scope in which it is declared. This means that if you declare it in the root scope it will be available everywhere, while if you declare it inside a plugin it will be available only in that scope and its children.

Fastify automatically adds the parsed request payload to the [Fastify request](Request.md) object which you can access with `request.body`.

### Usage
```js
fastify.addContentTypeParser('application/jsoff', function (request, payload, done) {
  jsoffParser(payload, function (err, body) {
    done(err, body)
  })
})

// Handle multiple content types with the same function
fastify.addContentTypeParser(['text/xml', 'application/xml'], function (request, payload, done) {
  xmlParser(payload, function (err, body) {
    done(err, body)
  })
})

// Async is also supported in Node versions >= 8.0.0
fastify.addContentTypeParser('application/jsoff', async function (request, payload) {
  var res = await jsoffParserAsync(payload)

  return res
})

// Can use default JSON/Text parser for different content Types
fastify.addContentTypeParser('text/json', { parseAs: 'string' }, fastify.getDefaultJsonParser('ignore', 'ignore'))
```

You can also use the `hasContentTypeParser` API to find if a specific content type parser already exists.

```js
if (!fastify.hasContentTypeParser('application/jsoff')){
  fastify.addContentTypeParser('application/jsoff', function (request, payload, done) {
    jsoffParser(payload, function (err, body) {
      done(err, body)
    })
  })
}
```

**Notice**: The old syntaxes `function(req, done)` and `async function(req)` for the parser are still supported but they are deprecated.

#### Body Parser
You can parse the body of a request in two ways. The first one is shown above: you add a custom content type parser and handle the request stream. In the second one, you should pass a `parseAs` option to the `addContentTypeParser` API, where you declare how you want to get the body. It could be of type `'string'` or `'buffer'`. If you use the `parseAs` option, Fastify will internally handle the stream and perform some checks, such as the [maximum size](Server.md#factory-body-limit) of the body and the content length. If the limit is exceeded the custom parser will not be invoked.
```js
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
  try {
    var json = JSON.parse(body)
    done(null, json)
  } catch (err) {
    err.statusCode = 400
    done(err, undefined)
  }
})
```

See [`example/parser.js`](../examples/parser.js) for an example.

##### Custom Parser Options
+ `parseAs` (string): Either `'string'` or `'buffer'` to designate how the incoming data should be collected. Default: `'buffer'`.
+ `bodyLimit` (number): The maximum payload size, in bytes, that the custom parser will accept. Defaults to the global body limit passed to the [`Fastify factory function`](Server.md#bodylimit).

#### Catch-All
There are some cases where you need to catch all requests regardless of their content type. With Fastify, you can just use the `'*'` content type.
```js
fastify.addContentTypeParser('*', function (request, payload, done) {
  var data = ''
  payload.on('data', chunk => { data += chunk })
  payload.on('end', () => {
    done(null, data)
  })
})
```

Using this, all requests that do not have a corresponding content type parser will be handled by the specified function.

This is also useful for piping the request stream. You can define a content parser like:

```js
fastify.addContentTypeParser('*', function (request, payload, done) {
  done()
})
```

and then access the core HTTP request directly for piping it where you want:

```js
app.post('/hello', (request, reply) => {
  reply.send(request.raw)
})
```

Here is a complete example that logs incoming [json line](https://jsonlines.org/) objects:

```js
const split2 = require('split2')
const pump = require('pump')

fastify.addContentTypeParser('*', (request, payload, done) => {
  done(null, pump(payload, split2(JSON.parse)))
})

fastify.route({
  method: 'POST',
  url: '/api/log/jsons',
  handler: (req, res) => {
    req.body.on('data', d => console.log(d)) // log every incoming object
  }
})
 ```

For piping file uploads you may want to checkout [this plugin](https://github.com/fastify/fastify-multipart).
