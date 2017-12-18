<h1 align="center">Fastify</h1>

## Reply
The second parameter of the handler function is `Reply`.
Reply is a core Fastify object that exposes the following functions:

- `.code(statusCode)` - Sets the status code.
- `.header(name, value)` - Sets the headers.
- `.type(value)` - Sets the header `Content-Type`.
- `.redirect([code,] url)` - Redirect to the specified url, the status code is optional (default to `302`).
- `.serialize(payload)` - Serializes the specified payload using the default json serializer and returns the serialized payload.
- `.serializer(function)` - Sets a custom serializer for the payload.
- `.send(payload)` - Sends the payload to the user, could be a plain text, JSON, stream, or an Error object.
- `.sent` - A boolean value that you can use if you need to know it `send` has already been called.

```js
fastify.get('/', options, function (request, reply) {
  // You code
  reply
    .code(200)
    .header('Content-Type', 'application/json')
    .send({ hello: 'world' })
})
```
<a name="code"></a>
### Code
If not set via `reply.code`, the resulting `statusCode` will be `200`.

<a name="header"></a>
### Header
Sets a custom header to the response.
If you not set a `'Content-Type'` header, Fastify assumes that you are using `'application/json'`, unless you are send a stream, in that cases Fastify recognize it and sets the `'Content-Type'` at `'application/octet-stream'`.

*Note that if you are using a custom serializer that does not serialize to JSON, you must set a custom `'Content-Type'` header.*

<a name="redirect"></a>
### Redirect
Redirects a request to the specified url, the status code is optional, default to `302`.
```js
reply.redirect('/home')
```

<a name="type"></a>
### Type
Sets the content type for the response.
This is a shortcut for `reply.header('Content-Type', 'the/type')`.

```js
reply.type('text/html')
```

<a name="serializer"></a>
### Serializer
Fastify was born as a full JSON compatible server, so out of the box will serialize your payload that you put in the `.send()` function using the internal serializers: [fast-json-stringify](https://www.npmjs.com/package/fast-json-stringify) if you set an output schema, otherwise `JSON.stringify()`.

If you need to use a custom serializer, such as [msgpack5](https://github.com/mcollina/msgpack5) or [protobuf](https://github.com/dcodeIO/ProtoBuf.js/), you can use the `.serializer()` utility. As noted above, if you are using a custom serializer that does not serialize to JSON, you must set a custom `'Content-Type'` header.

```js
reply
  .header('Content-Type', 'application/x-protobuf')
  .serializer(protoBuf.serialize)
```
*Take a look [here](https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md#serialization) to understand how serialization is done.*

<a name="send"></a>
### Send
 As the name suggests, `.send()` is the function that sends the payload to the end user.

<a name="send-object"></a>
#### Objects
As noted above, if you are sending JSON objects, `send` will serialize the object with [fast-json-stringify](https://www.npmjs.com/package/fast-json-stringify) if you set an output schema, otherwise `JSON.stringify()` will be used.
```js
fastify.get('/json', options, function (request, reply) {
  reply.send({ hello: 'world' })
})
```

<a name="async-await-promise"></a>
#### Async-Await and Promises
Fastify natively handles promies and supports async-await.  
*Note that in the following examples we are not using reply.send.*
```js
fastify.get('/promises', options, function (request, reply) {
  const promise = new Promise(function (resolve) {
    setTimeout(resolve, 200, { hello: 'world' })
  })
  return promise
})

fastify.get('/async-await', options, async function (request, reply) {
  var res = await new Promise(function (resolve) {
    setTimeout(resolve, 200, { hello: 'world' })
  })
  return res
})
```

Rejected promises default to a `500` HTTP status code. Reject the promise, or `throw` in an `async function`, with an object that has `statusCode` (or `status`) and `message` properties to modify the reply.

```js
fastify.get('/teapot', async function (request, reply) => {
  const err = new Error()
  err.statusCode = 418
  err.message = 'short and stout'
  throw err
})
```

If you want to know more please review [Routes#async-await](https://github.com/fastify/fastify/blob/master/docs/Routes.md#async-await)!

<a name="send-streams"></a>
#### Streams
*send* can also handle streams out of the box, internally uses [pump](https://www.npmjs.com/package/pump) to avoid leaks of file descriptors. If you are sending a stream and you have not setted a `'Content-Type'` header, *send* will set it at `'application/octet-stream'`.
```js
fastify.get('/streams', function (request, reply) {
  const fs = require('fs')
  const stream = fs.createReadStream('some-file', 'utf8')
  reply.send(stream)
})
```

<a name="errors"></a>
#### Errors
If you pass to *send* an object that is an instance of *Error*, Fastify will automatically create an error structured as the following:
```js
{
  error: String        // the http error message
  message: String      // the user error message
  statusCode: Number   // the http status code
}
```
If you want it extend this error, check out [`extendServerError`](https://github.com/fastify/fastify/blob/master/docs/Decorators.md#extend-server-error).

*If you are passing an error to send and the statusCode is less than 400, Fastify will automatically set it at 500.*

<a name="payload-type"></a>
#### Type of the final payload
It is crucial that the sent payload is a `string` or a `Buffer`, otherwise *send* will throw at runtime.
