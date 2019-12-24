<h1 align="center">Fastify</h1>

## HTTP2

_Fastify_ offers **experimental support** for HTTP2 starting from 
Node 8 LTS, which includes HTTP2 without a flag; HTTP2 is supported 
both over HTTPS or over plaintext.

Currently none of the HTTP2-specific APIs are available through
_Fastify_, but Node's `req` and `res` can be access through our
`Request` and `Reply` interface. PRs are welcome.

### Secure (HTTPS)

HTTP2 is supported in all modern browsers __only over a secure
connection__:

```js
'use strict'

const fs = require('fs')
const path = require('path')
const fastify = require('fastify')({
  http2: true,
  https: {
    key: fs.readFileSync(path.join(__dirname, '..', 'https', 'fastify.key')),
    cert: fs.readFileSync(path.join(__dirname, '..', 'https', 'fastify.cert'))
  }
})

fastify.get('/', function (request, reply) {
  reply.code(200).send({ hello: 'world' })
})

fastify.listen(3000)
```

ALPN negotiation allows support for both HTTPS and HTTP/2 over the same socket.
Node core `req` and `res` objects can be either [HTTP/1](https://nodejs.org/api/http.html)
or [HTTP/2](https://nodejs.org/api/http2.html).
_Fastify_ supports this out of the box:

```js
'use strict'

const fs = require('fs')
const path = require('path')
const fastify = require('fastify')({
  http2: true,
  https: {
    allowHTTP1: true, // fallback support for HTTP1
    key: fs.readFileSync(path.join(__dirname, '..', 'https', 'fastify.key')),
    cert: fs.readFileSync(path.join(__dirname, '..', 'https', 'fastify.cert'))
  }
})

// this route can be accessed through both protocols
fastify.get('/', function (request, reply) {
  reply.code(200).send({ hello: 'world' })
})

fastify.listen(3000)
```

You can test your new server with:

```
$ npx h2url https://localhost:3000
```

### Plain or insecure

If you are building microservices, you can connect to HTTP2 in plain
text, however this is not supported by browsers.

```js
'use strict'

const fastify = require('fastify')({
  http2: true
})

fastify.get('/', function (request, reply) {
  reply.code(200).send({ hello: 'world' })
})

fastify.listen(3000)
```

You can test your new server with:

```
$ npx h2url http://localhost:3000
```

