<h1 align="center">Fastify</h1>

## `Content-Type` Parser
Natively, Fastify only supports `'application/json'` and `'text/plain'` content
types. If the content type is not one of these, an
`FST_ERR_CTP_INVALID_MEDIA_TYPE` error will be thrown.
Other common content types are supported through the use of
[plugins](https://fastify.dev/ecosystem/).

The default charset is `utf-8`. If you need to support different content types,
you can use the `addContentTypeParser` API. *The default JSON and/or plain text
parser can be changed or removed.*

*Note: If you decide to specify your own content type with the `Content-Type`
header, UTF-8 will not be the default. Be sure to include UTF-8 like this
`text/html; charset=utf-8`.*

As with the other APIs, `addContentTypeParser` is encapsulated in the scope in
which it is declared. This means that if you declare it in the root scope it
will be available everywhere, while if you declare it inside a plugin it will be
available only in that scope and its children.

Fastify automatically adds the parsed request payload to the [Fastify
request](./Request.md) object which you can access with `request.body`.

Note that for `GET` and `HEAD` requests the payload is never parsed. For
`OPTIONS` and `DELETE` requests the payload is only parsed if the content type
is given in the content-type header. If it is not given, the
[catch-all](#catch-all) parser is not executed as with `POST`, `PUT` and
`PATCH`, but the payload is simply not parsed.

> ## ⚠  Security Notice
> When using with RegExp to detect `Content-Type`, you should beware of
> how to properly detect the `Content-Type`. For example, if you need
> `application/*`, you should use `/^application\/([\w-]+);?/` to match the
> [essence MIME type](https://mimesniff.spec.whatwg.org/#mime-type-miscellaneous)
> only.

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

// Handle all content types that matches RegExp
fastify.addContentTypeParser(/^image\/([\w-]+);?/, function (request, payload, done) {
  imageParser(payload, function (err, body) {
    done(err, body)
  })
})

// Can use default JSON/Text parser for different content Types
fastify.addContentTypeParser('text/json', { parseAs: 'string' }, fastify.getDefaultJsonParser('ignore', 'ignore'))
```

Fastify first tries to match a content-type parser with a `string` value before
trying to find a matching `RegExp`. If you provide overlapping content types,
Fastify tries to find a matching content type by starting with the last one
passed and ending with the first one. So if you want to specify a general
content type more precisely, first specify the general content type and then the
more specific one, like in the example below.

```js
// Here only the second content type parser is called because its value also matches the first one
fastify.addContentTypeParser('application/vnd.custom+xml', (request, body, done) => {} )
fastify.addContentTypeParser('application/vnd.custom', (request, body, done) => {} )

// Here the desired behavior is achieved because fastify first tries to match the
// `application/vnd.custom+xml` content type parser
fastify.addContentTypeParser('application/vnd.custom', (request, body, done) => {} )
fastify.addContentTypeParser('application/vnd.custom+xml', (request, body, done) => {} )
```

### Using addContentTypeParser with fastify.register
When using `addContentTypeParser` in combination with `fastify.register`,
`await` should not be used when registering routes. Using `await` causes
the route registration to be asynchronous and can lead to routes being registered
before the addContentTypeParser has been set.

#### Correct Usage
```js
const fastify = require('fastify')();


fastify.register((fastify, opts) => {
  fastify.addContentTypeParser('application/json', function (request, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.get('/hello', async (req, res) => {});
});
```

Besides the `addContentTypeParser` API there are further APIs that can be used.
These are `hasContentTypeParser`, `removeContentTypeParser` and
`removeAllContentTypeParsers`.

#### hasContentTypeParser

You can use the `hasContentTypeParser` API to find if a specific content type
parser already exists.

```js
if (!fastify.hasContentTypeParser('application/jsoff')){
  fastify.addContentTypeParser('application/jsoff', function (request, payload, done) {
    jsoffParser(payload, function (err, body) {
      done(err, body)
    })
  })
}
```

#### removeContentTypeParser

With `removeContentTypeParser` a single or an array of content types can be
removed. The method supports `string` and `RegExp` content types.

```js
fastify.addContentTypeParser('text/xml', function (request, payload, done) {
  xmlParser(payload, function (err, body) {
    done(err, body)
  })
})

// Removes the both built-in content type parsers so that only the content type parser for text/html is available
fastify.removeContentTypeParser(['application/json', 'text/plain'])
```

#### removeAllContentTypeParsers

In the example from just above, it is noticeable that we need to specify each
content type that we want to remove. To solve this problem Fastify provides the
`removeAllContentTypeParsers` API. This can be used to remove all currently
existing content type parsers. In the example below we achieve the same as in
the example above except that we do not need to specify each content type to
delete. Just like `removeContentTypeParser`, this API supports encapsulation.
The API is especially useful if you want to register a [catch-all content type
parser](#catch-all) that should be executed for every content type and the
built-in parsers should be ignored as well.

```js
fastify.removeAllContentTypeParsers()

fastify.addContentTypeParser('text/xml', function (request, payload, done) {
  xmlParser(payload, function (err, body) {
    done(err, body)
  })
})
```

**Notice**: The old syntaxes `function(req, done)` and `async function(req)` for
the parser are still supported but they are deprecated.

#### Body Parser
You can parse the body of a request in two ways. The first one is shown above:
you add a custom content type parser and handle the request stream. In the
second one, you should pass a `parseAs` option to the `addContentTypeParser`
API, where you declare how you want to get the body. It could be of type
`'string'` or `'buffer'`. If you use the `parseAs` option, Fastify will
internally handle the stream and perform some checks, such as the [maximum
size](./Server.md#factory-body-limit) of the body and the content length. If the
limit is exceeded the custom parser will not be invoked.
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

See
[`example/parser.js`](https://github.com/fastify/fastify/blob/main/examples/parser.js)
for an example.

##### Custom Parser Options
+ `parseAs` (string): Either `'string'` or `'buffer'` to designate how the
  incoming data should be collected. Default: `'buffer'`.
+ `bodyLimit` (number): The maximum payload size, in bytes, that the custom
  parser will accept. Defaults to the global body limit passed to the [`Fastify
  factory function`](./Server.md#bodylimit).

#### Catch-All
There are some cases where you need to catch all requests regardless of their
content type. With Fastify, you can just use the `'*'` content type.
```js
fastify.addContentTypeParser('*', function (request, payload, done) {
  var data = ''
  payload.on('data', chunk => { data += chunk })
  payload.on('end', () => {
    done(null, data)
  })
})
```

Using this, all requests that do not have a corresponding content type parser
will be handled by the specified function.

This is also useful for piping the request stream. You can define a content
parser like:

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

Here is a complete example that logs incoming [json
line](https://jsonlines.org/) objects:

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

For piping file uploads you may want to check out [this
plugin](https://github.com/fastify/fastify-multipart).

If you want the content type parser to be executed on all content types and not
only on those that don't have a specific one, you should call the
`removeAllContentTypeParsers` method first.

```js
// Without this call, the request body with the content type application/json would be processed by the built-in JSON parser
fastify.removeAllContentTypeParsers()

fastify.addContentTypeParser('*', function (request, payload, done) {
  var data = ''
  payload.on('data', chunk => { data += chunk })
  payload.on('end', () => {
    done(null, data)
  })
})
```
