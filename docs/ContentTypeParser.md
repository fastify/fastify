<h1 align="center">Fastify</h1>

## Content Type Parser
Natively, Fastify only supports the `'application/json'` content type. If you need to support different content types, you can use the `addContentTypeParser` API. *Note that you can't add a custom content type parser for `'application/json'` because Fastify has a fast case for it.*

As with the other APIs, `addContentTypeParser` is encapsulated in the scope in which it is declared. This means that if you declare it in the root scope it will be available everywhere, while if you declare it inside a register it will be available only in that scope and its children.

#### Usage
```js
fastify.addContentTypeParser('application/jsoff', function (req, done) {
  jsoffParser(req, function (err, body) {
    done(err || body)
  })
})
```

You can also use the `hasContentTypeParser` API to find if a specific content type parser already exists.

##### Catch All
There are some cases where you need to catch all requests regardless of their content type. With Fastify, you just need to add the `'*'` content type.
```js
fastify.addContentTypeParser('*', function (req, done) {
  var data = ''
  req.on('data', chunk => { data += chunk })
  req.on('end', () => {
    done(data)
  })
})
```

In this way, all of the requests that do not have a corresponding content type parser will be handled by the specified function. *Remember that `'application/json'` is always handled by Fastify.*
