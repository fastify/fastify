<h1 align="center">Fastify</h1>

<a name="factory"></a>
## Factory

The Fastify module exports a factory function that is used to create new
<a href="https://github.com/fastify/fastify/blob/master/docs/Server-Methods.md"><code><b>Fastify server</b></code></a>
instances. This factory function accepts an options object which is used to
customize the resulting instance. This document describes the properties
available in that options object.

<a name="factory-http2"></a>
### `http2` (Status: experimental)

If `true` Node.js core's [HTTP/2](https://nodejs.org/dist/latest-v8.x/docs/api/http2.html)
HTTP/2 module is used for binding the socket.

+ Default: `false`

<a name="factory-https"></a>
### `https`

An object used to configure the server's listening socket for TLS. The options
are the same as the Node.js core
[`createServer` method](https://nodejs.org/dist/latest-v8.x/docs/api/https.html#https_https_createserver_options_requestlistener).
When this property is `null`, the socket will not be configured for TLS.

This option also applies when the
<a href="https://github.com/fastify/fastify/blob/master/docs/Factory.md#factory-http2">
<code><b>http2</b></code>
</a> option is set.

+ Default: `null`

<a name="factory-ignore-slash"></a>
### `ignoreTrailingSlash`

Fastify uses [find-my-way](https://github.com/delvedor/find-my-way) to handle
routing. This option may be set to `true` to ignore trailing slashes in routes.
This option applies to *all* route registrations for the resulting server
instance.

+ Default: `false`

```js
const fastify = require('fastify')({
  ignoreTrailingSlash: true
})

// registers both "/foo" and "/foo/"
fastify.get('/foo/', function (req, reply) {
  res.send('foo')
})

// registers both "/bar" and "/bar/"
fastify.get('/bar', function (req, reply) {
  res.send('bar')
})
```

<a name="factory-max-param-length"></a>
### `maxParamLength`
You can set a custom length for parameters in parametric (standard, regex and multi) routes by using `maxParamLength` option, the default value is 100 characters.<br>
This can be useful especially if you have some regex based route, protecting you against [DoS attacks](https://www.owasp.org/index.php/Regular_expression_Denial_of_Service_-_ReDoS).<br>
*If the maximum length limit is reached, the not found route will be invoked.*

<a name="factory-body-limit"></a>
### `bodyLimit`

Defines the maximum payload, in bytes, the server is allowed to accept.

+ Default: `1048576` (1MiB)

<a name="factory-logger"></a>
### `logger`

Fastify includes built-in logging via the [Pino](https://getpino.io/) logger.
This property is used to configure the internal logger instance.

The possible values this property may have are:

+ Default: `false`. The logger is disabled. All logging methods will point to a
null logger [abstract-logging](https://npm.im/abstract-logging) instance.

+ `pinoInstance`: a previously instantiated instance of Pino. The internal
logger will point to this instance.

+ `object`: a standard Pino [options object](https://github.com/pinojs/pino/blob/c77d8ec5ce/docs/API.md#constructor).
This will be passed directly to the Pino constructor. If the following properties
are not present on the object, they will be added accordingly:
    * `genReqId`: a synchronous function that will be used to generate identifiers
    for incoming requests. The default function generates sequential identifiers.
    * `level`: the minimum logging level. If not set, it will be set to `'info'`.
    * `serializers`: a hash of serialization functions. By default, serializers
      are added for `req` (incoming request objects), `res` (outgoing repsonse
      objets), and `err` (standard `Error` objects). When a log method receives
      and object with any of these properties then the respective serializer will
      be used for that property. For example:
        ```js
        fastify.get('/foo', function (req, res) {
          req.log.info({req}) // log the serialized request object
          res.send('foo')
        })
        ```
      Any user supplied serializer will override the default serializer of the
      corresponding property.
