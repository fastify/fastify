<h1 align="center">Fastify</h1>

## Content Type Parser
Natively Fastify supports only `application/json` content-type. If you need to support different content types you can use the `addContentTypeParser` api.  
*Note that you can't add a custom content type parser for `application/json` because Fastify has a fast case for it.*

As the others api, `addContentTypeParser` is encapsulated in the scope where you are declaring it, this means that if you declare it in the root scope it will be available every where, while if you declare it inside a register it will be available only in the scope and its sons.

#### Usage
```js
fastify.addContentTypeParser('application/jsoff', function (req, done) {
  jsoffParser(req, function (err, body) {
    done(err || body)
  })
})
```

You can also use the api `hasContentTypeParser` to find if a specific content-type parser already exist.

##### Catch All
There are some cases where you need to catch all the request regardless their `content-type`, with Fastify you just need to do add the `'*'` content type.
```js
fastify.addContentTypeParser('*', function (req, done) {
  var data = ''
  req.on('data', chunk => { data += chunk })
  req.on('end', () => {
    done(data)
  })
})
```
In this way all the request that haven't a corresponding content type parser will be handled by the above function.  
*Remember that `'application/json'` is always handled by Fastify.*
