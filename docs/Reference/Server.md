<h1 align="center">Fastify</h1>

## Factory
<a id="factory"></a>

The Fastify module exports a factory function that is used to create new
<code><b>Fastify server</b></code> instances. This factory function accepts an
options object which is used to customize the resulting instance. This document
describes the properties available in that options object.

- [Factory](#factory)
  - [`http2`](#http2)
  - [`https`](#https)
  - [`connectionTimeout`](#connectiontimeout)
  - [`keepAliveTimeout`](#keepalivetimeout)
  - [`forceCloseConnections](#forcecloseconnections)
  - [`maxRequestsPerSocket`](#maxrequestspersocket)
  - [`requestTimeout`](#requesttimeout)
  - [`ignoreTrailingSlash`](#ignoretrailingslash)
  - [`maxParamLength`](#maxparamlength)
  - [`bodyLimit`](#bodylimit)
  - [`onProtoPoisoning`](#onprotopoisoning)
  - [`onConstructorPoisoning`](#onconstructorpoisoning)
  - [`logger`](#logger)
  - [`disableRequestLogging`](#disablerequestlogging)
  - [`serverFactory`](#serverfactory)
  - [`jsonShorthand`](#jsonshorthand)
  - [`caseSensitive`](#casesensitive)
  - [`requestIdHeader`](#requestidheader)
  - [`requestIdLogLabel`](#requestidloglabel)
  - [`genReqId`](#genreqid)
  - [`trustProxy`](#trustproxy)
  - [`pluginTimeout`](#plugintimeout)
  - [`querystringParser`](#querystringparser)
  - [`exposeHeadRoutes`](#exposeheadroutes)
  - [`constraints`](#constraints)
  - [`return503OnClosing`](#return503onclosing)
  - [`ajv`](#ajv)
  - [`serializerOpts`](#serializeropts)
  - [`http2SessionTimeout`](#http2sessiontimeout)
  - [`frameworkErrors`](#frameworkerrors)
  - [`clientErrorHandler`](#clienterrorhandler)
  - [`rewriteUrl`](#rewriteurl)
- [Instance](#instance)
  - [Server Methods](#server-methods)
    - [server](#server)
    - [after](#after)
    - [ready](#ready)
    - [listen](#listen)
    - [getDefaultRoute](#getdefaultroute)
    - [setDefaultRoute](#setdefaultroute)
    - [routing](#routing)
    - [route](#route)
    - [close](#close)
    - [decorate*](#decorate)
    - [register](#register)
    - [addHook](#addhook)
    - [prefix](#prefix)
    - [pluginName](#pluginname)
    - [log](#log)
    - [version](#version)
    - [inject](#inject)
    - [addSchema](#addschema)
    - [getSchemas](#getschemas)
    - [getSchema](#getschema)
    - [setReplySerializer](#setreplyserializer)
    - [setValidatorCompiler](#setvalidatorcompiler)
    - [setSchemaErrorFormatter](#setschemaerrorformatter)
    - [setSerializerCompiler](#setserializercompiler)
    - [validatorCompiler](#validatorcompiler)
    - [serializerCompiler](#serializercompiler)
    - [schemaErrorFormatter](#schemaerrorformatter)
    - [schemaController](#schemacontroller)
      - [Ajv 8 as default schema validator](#ajv-8-as-default-schema-validator)
    - [setNotFoundHandler](#setnotfoundhandler)
    - [setErrorHandler](#seterrorhandler)
    - [printRoutes](#printroutes)
    - [printPlugins](#printplugins)
    - [addContentTypeParser](#addcontenttypeparser)
    - [getDefaultJsonParser](#getdefaultjsonparser)
    - [defaultTextParser](#defaulttextparser)
    - [errorHandler](#errorhandler)
    - [initialConfig](#initialconfig)

### `http2`
<a id="factory-http2"></a>

If `true` Node.js core's
[HTTP/2](https://nodejs.org/dist/latest-v14.x/docs/api/http2.html) module is
used for binding the socket.

+ Default: `false`

### `https`
<a id="factory-https"></a>

An object used to configure the server's listening socket for TLS. The options
are the same as the Node.js core [`createServer`
method](https://nodejs.org/dist/latest-v14.x/docs/api/https.html#https_https_createserver_options_requestlistener).
When this property is `null`, the socket will not be configured for TLS.

This option also applies when the [`http2`](#factory-http2) option is set.

+ Default: `null`

### `connectionTimeout`
<a id="factory-connection-timeout"></a>

Defines the server timeout in milliseconds. See documentation for
[`server.timeout`
property](https://nodejs.org/api/http.html#http_server_timeout) to understand
the effect of this option. When `serverFactory` option is specified, this option
is ignored.

+ Default: `0` (no timeout)

### `keepAliveTimeout`
<a id="factory-keep-alive-timeout"></a>

Defines the server keep-alive timeout in milliseconds. See documentation for
[`server.keepAliveTimeout`
property](https://nodejs.org/api/http.html#http_server_keepalivetimeout) to
understand the effect of this option. This option only applies when HTTP/1 is in
use. Also, when `serverFactory` option is specified, this option is ignored.

+ Default: `5000` (5 seconds)

### `forceCloseConnections`
<a id="forcecloseconnections"></a>

When set to `true` requests with the header `connection: keep-alive` will be
tracked by the server. Upon [`close`](#close), the server will iterate the
current persistent connections and [destroy their
sockets](https://nodejs.org/dist/latest-v16.x/docs/api/net.html#socketdestroyerror).
This means the server will shutdown immediately instead of waiting for existing
persistent connections to timeout first. Important: connections are not
inspected to determine if requests have been completed.

+ Default: `false`

### `maxRequestsPerSocket`
<a id="factory-max-requests-per-socket"></a>

Defines the maximum number of requests socket can handle before closing keep
alive connection. See documentation for [`server.maxRequestsPerSocket`
property](https://nodejs.org/dist/latest/docs/api/http.html#http_server_maxrequestspersocket)
to understand the effect of this option. This option only applies when HTTP/1.1
is in use. Also, when `serverFactory` option is specified, this option is
ignored.
>  At the time of this writing, only node version greater or equal to 16.10.0
>  support this option. Check the Node.js documentation for availability in the
>  version you are running.

+ Default: `0` (no limit)

### `requestTimeout`
<a id="factory-request-timeout"></a>

Defines the maximum number of milliseconds for receiving the entire request from
the client. [`server.requestTimeout`
property](https://nodejs.org/dist/latest/docs/api/http.html#http_server_requesttimeout)
to understand the effect of this option. Also, when `serverFactory` option is
specified, this option is ignored. It must be set to a non-zero value (e.g. 120
seconds) to protect against potential Denial-of-Service attacks in case the
server is deployed without a reverse proxy in front.
>  At the time of this writing, only node version greater or equal to 14.11.0
>  support this option. Check the Node.js documentation for availability in the
>  version you are running.

+ Default: `0` (no limit)

### `ignoreTrailingSlash`
<a id="factory-ignore-slash"></a>

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
  reply.send('foo')
})

// registers both "/bar" and "/bar/"
fastify.get('/bar', function (req, reply) {
  reply.send('bar')
})
```

### `maxParamLength`
<a id="factory-max-param-length"></a>

You can set a custom length for parameters in parametric (standard, regex, and
multi) routes by using `maxParamLength` option; the default value is 100
characters.

This can be useful especially if you have some regex based route, protecting you
against [DoS
attacks](https://www.owasp.org/index.php/Regular_expression_Denial_of_Service_-_ReDoS).

*If the maximum length limit is reached, the not found route will be invoked.*

### `bodyLimit`
<a id="factory-body-limit"></a>

Defines the maximum payload, in bytes, the server is allowed to accept.

+ Default: `1048576` (1MiB)

### `onProtoPoisoning`
<a id="factory-on-proto-poisoning"></a>

Defines what action the framework must take when parsing a JSON object with
`__proto__`. This functionality is provided by
[secure-json-parse](https://github.com/fastify/secure-json-parse). See
[Prototype Poisoning](../Guides/Prototype-Poisoning.md) for more
details about prototype poisoning attacks.

Possible values are `'error'`, `'remove'` and `'ignore'`.

+ Default: `'error'`

### `onConstructorPoisoning`
<a id="factory-on-constructor-poisoning"></a>

Defines what action the framework must take when parsing a JSON object with
`constructor`. This functionality is provided by
[secure-json-parse](https://github.com/fastify/secure-json-parse). See
[Prototype Poisoning](../Guides/Prototype-Poisoning.md) for more
details about prototype poisoning attacks.

Possible values are `'error'`, `'remove'` and `'ignore'`.

+ Default: `'error'`

### `logger`
<a id="factory-logger"></a>

Fastify includes built-in logging via the [Pino](https://getpino.io/) logger.
This property is used to configure the internal logger instance.

The possible values this property may have are:

+ Default: `false`. The logger is disabled. All logging methods will point to a
  null logger [abstract-logging](https://npm.im/abstract-logging) instance.

+ `pinoInstance`: a previously instantiated instance of Pino. The internal
  logger will point to this instance.

+ `object`: a standard Pino [options
  object](https://github.com/pinojs/pino/blob/c77d8ec5ce/docs/API.md#constructor).
  This will be passed directly to the Pino constructor. If the following
  properties are not present on the object, they will be added accordingly:
    * `level`: the minimum logging level. If not set, it will be set to
      `'info'`.
    * `serializers`: a hash of serialization functions. By default, serializers
      are added for `req` (incoming request objects), `res` (outgoing response
      objects), and `err` (standard `Error` objects). When a log method receives
      an object with any of these properties then the respective serializer will
      be used for that property. For example:
        ```js
        fastify.get('/foo', function (req, res) {
          req.log.info({req}) // log the serialized request object
          res.send('foo')
        })
        ```
      Any user-supplied serializer will override the default serializer of the
      corresponding property.
+ `loggerInstance`: a custom logger instance. The logger must conform to the
  Pino interface by having the following methods: `info`, `error`, `debug`,
  `fatal`, `warn`, `trace`, `child`. For example:
  ```js
  const pino = require('pino')();

  const customLogger = {
    info: function (o, ...n) {},
    warn: function (o, ...n) {},
    error: function (o, ...n) {},
    fatal: function (o, ...n) {},
    trace: function (o, ...n) {},
    debug: function (o, ...n) {},
    child: function() {
      const child = Object.create(this);
      child.pino = pino.child(...arguments);
      return child;
    },
  };

  const fastify = require('fastify')({logger: customLogger});
  ```

### `disableRequestLogging`
<a id="factory-disable-request-logging"></a>

By default, when logging is enabled, Fastify will issue an `info` level log
message when a request is received and when the response for that request has
been sent. By setting this option to `true`, these log messages will be
disabled. This allows for more flexible request start and end logging by
attaching custom `onRequest` and `onResponse` hooks.

+ Default: `false`

```js
// Examples of hooks to replicate the disabled functionality.
fastify.addHook('onRequest', (req, reply, done) => {
  req.log.info({ url: req.raw.url, id: req.id }, 'received request')
  done()
})

fastify.addHook('onResponse', (req, reply, done) => {
  req.log.info({ url: req.raw.originalUrl, statusCode: reply.raw.statusCode }, 'request completed')
  done()
})
```

Please note that this setting will also disable an error log written by the
default `onResponse` hook on reply callback errors.

### `serverFactory`
<a id="custom-http-server"></a>

You can pass a custom HTTP server to Fastify by using the `serverFactory`
option.

`serverFactory` is a function that takes a `handler` parameter, which takes the
`request` and `response` objects as parameters, and an options object, which is
the same you have passed to Fastify.

```js
const serverFactory = (handler, opts) => {
  const server = http.createServer((req, res) => {
    handler(req, res)
  })

  return server
}

const fastify = Fastify({ serverFactory })

fastify.get('/', (req, reply) => {
  reply.send({ hello: 'world' })
})

fastify.listen(3000)
```

Internally Fastify uses the API of Node core HTTP server, so if you are using a
custom server you must be sure to have the same API exposed. If not, you can
enhance the server instance inside the `serverFactory` function before the
`return` statement.


### `jsonShorthand`
<a id="schema-json-shorthand"></a>

+ Default: `true`

Internally, and by default, Fastify will automatically infer the root properties
of JSON Schemas if it does not find valid root properties according to the JSON
Schema spec. If you wish to implement your own schema validation compiler, for
example: to parse schemas as JTD instead of JSON Schema, then you can explicitly
set this option to `false` to make sure the schemas you receive are unmodified
and are not being treated internally as JSON Schema.

```js
const AjvJTD = require('ajv/dist/jtd'/* only valid for AJV v7+ */)
const ajv = new AjvJTD({
  // This would let you throw at start for invalid JTD schema objects
  allErrors: process.env.NODE_ENV === 'development'
})
const fastify = Fastify({ jsonShorthand: false })
fastify.setValidatorCompiler(({ schema }) => {
  return ajv.compile(schema)
})
fastify.post('/', {
  schema: {
    body: {
      properties: {
        foo: { type: 'uint8' }
      }
    }
  },
  handler (req, reply) { reply.send({ ok: 1 }) }
})
```

**Note: Fastify does not currently throw on invalid schemas, so if you turn this
off in an existing project, you need to be careful that none of your existing
schemas become invalid as a result, since they will be treated as a catch-all.**

### `caseSensitive`
<a id="factory-case-sensitive"></a>

By default, value equal to `true`, routes are registered as case sensitive. That
is, `/foo` is not equivalent to `/Foo`. When set to `false`, routes are
registered in a fashion such that `/foo` is equivalent to `/Foo` which is
equivalent to `/FOO`.

By setting `caseSensitive` to `false`, all paths will be matched as lowercase,
but the route parameters or wildcards will maintain their original letter
casing.

```js
fastify.get('/user/:username', (request, reply) => {
  // Given the URL: /USER/NodeJS
  console.log(request.params.username) // -> 'NodeJS'
})
```

Please note that setting this option to `false` goes against
[RFC3986](https://tools.ietf.org/html/rfc3986#section-6.2.2.1).

Also note, this setting will not affect query strings. If you want to change the
way query strings are handled take a look at
[`querystringParser`](#querystringparser).

### `requestIdHeader`
<a id="factory-request-id-header"></a>

The header name used to know the request-id. See [the
request-id](./Logging.md#logging-request-id) section.

+ Default: `'request-id'`

### `requestIdLogLabel`
<a id="factory-request-id-log-label"></a>

Defines the label used for the request identifier when logging the request.

+ Default: `'reqId'`

### `genReqId`
<a id="factory-gen-request-id"></a>

Function for generating the request-id. It will receive the incoming request as
a parameter.

+ Default: `value of 'request-id' header if provided or monotonically increasing
  integers`

Especially in distributed systems, you may want to override the default ID
generation behavior as shown below. For generating `UUID`s you may want to check
out [hyperid](https://github.com/mcollina/hyperid)

```js
let i = 0
const fastify = require('fastify')({
  genReqId: function (req) { return i++ }
})
```

**Note: genReqId will _not_ be called if the header set in
<code>[requestIdHeader](#requestidheader)</code> is available (defaults to
'request-id').**

### `trustProxy`
<a id="factory-trust-proxy"></a>

By enabling the `trustProxy` option, Fastify will know that it is sitting behind
a proxy and that the `X-Forwarded-*` header fields may be trusted, which
otherwise may be easily spoofed.

```js
const fastify = Fastify({ trustProxy: true })
```

+ Default: `false`
+ `true/false`: Trust all proxies (`true`) or do not trust any proxies
  (`false`).
+ `string`: Trust only given IP/CIDR (e.g. `'127.0.0.1'`). May be a list of
  comma separated values (e.g. `'127.0.0.1,192.168.1.1/24'`).
+ `Array<string>`: Trust only given IP/CIDR list (e.g. `['127.0.0.1']`).
+ `number`: Trust the nth hop from the front-facing proxy server as the client.
+ `Function`: Custom trust function that takes `address` as first arg
    ```js
    function myTrustFn(address, hop) {
      return address === '1.2.3.4' || hop === 1
    }
    ```

For more examples, refer to the
[`proxy-addr`](https://www.npmjs.com/package/proxy-addr) package.

You may access the `ip`, `ips`, `hostname` and `protocol` values on the
[`request`](./Request.md) object.

```js
fastify.get('/', (request, reply) => {
  console.log(request.ip)
  console.log(request.ips)
  console.log(request.hostname)
  console.log(request.protocol)
})
```

**Note: if a request contains multiple <code>x-forwarded-host</code> or
<code>x-forwarded-proto</code> headers, it is only the last one that is used to
derive <code>request.hostname</code> and <code>request.protocol</code>**

### `pluginTimeout`
<a id="plugin-timeout"></a>

The maximum amount of time in *milliseconds* in which a plugin can load. If not,
[`ready`](#ready) will complete with an `Error` with code
`'ERR_AVVIO_PLUGIN_TIMEOUT'`.

+ Default: `10000`

### `querystringParser`
<a id="factory-querystring-parser"></a>

The default query string parser that Fastify uses is the Node.js's core
`querystring` module.

You can change this default setting by passing the option `querystringParser`
and use a custom one, such as [`qs`](https://www.npmjs.com/package/qs).

```js
const qs = require('qs')
const fastify = require('fastify')({
  querystringParser: str => qs.parse(str)
})
```

You can also use Fastify's default parser but change some handling behaviour,
like the example below for case insensitive keys and values:

```js
const querystring = require('querystring')
const fastify = require('fastify')({
  querystringParser: str => querystring.parse(str.toLowerCase())
})
```

Note, if you only want the keys (and not the values) to be case insensitive we
recommend using a custom parser to convert only the keys to lowercase.

### `exposeHeadRoutes`
<a id="exposeHeadRoutes"></a>

Automatically creates a sibling `HEAD` route for each `GET` route defined. If
you want a custom `HEAD` handler without disabling this option, make sure to
define it before the `GET` route.

+ Default: `false`

### `constraints`
<a id="constraints"></a>

Fastify's built in route constraints are provided by `find-my-way`, which allow
constraining routes by `version` or `host`. You are able to add new constraint
strategies, or override the built in strategies by providing a `constraints`
object with strategies for `find-my-way`. You can find more information on
constraint strategies in the
[find-my-way](https://github.com/delvedor/find-my-way) documentation.

```js
const customVersionStrategy = {
  storage: function () {
    let versions = {}
    return {
      get: (version) => { return versions[version] || null },
      set: (version, store) => { versions[version] = store },
      del: (version) => { delete versions[version] },
      empty: () => { versions = {} }
    }
  },
  deriveVersion: (req, ctx) => {
    return req.headers['accept']
  }
}

const fastify = require('fastify')({
  constraints: {
    version: customVersionStrategy
  }
})
```

### `return503OnClosing`
<a id="factory-return-503-on-closing"></a>

Returns 503 after calling `close` server method. If `false`, the server routes
the incoming request as usual.

+ Default: `true`

### `ajv`
<a id="factory-ajv"></a>

Configure the Ajv v6 instance used by Fastify without providing a custom one.

+ Default:

```js
{
  customOptions: {
    removeAdditional: true,
    useDefaults: true,
    coerceTypes: true,
    allErrors: false,
    nullable: true
  },
  plugins: []
}
```

```js
const fastify = require('fastify')({
  ajv: {
    customOptions: {
      nullable: false // Refer to [ajv options](https://github.com/ajv-validator/ajv/tree/v6#options)
    },
    plugins: [
      require('ajv-merge-patch'),
      [require('ajv-keywords'), 'instanceof']
      // Usage: [plugin, pluginOptions] - Plugin with options
      // Usage: plugin - Plugin without options
    ]
  }
})
```

### `serializerOpts`
<a id="serializer-opts"></a>

Customize the options of the default
[`fast-json-stringify`](https://github.com/fastify/fast-json-stringify#options)
instance that serialize the response's payload:

```js
const fastify = require('fastify')({
  serializerOpts: {
    rounding: 'ceil'
  }
})
```

### `http2SessionTimeout`
<a id="http2-session-timeout"></a>

Set a default
[timeout](https://nodejs.org/api/http2.html#http2_http2session_settimeout_msecs_callback)
to every incoming HTTP/2 session. The session will be closed on the timeout.
Default: `5000` ms.

Note that this is needed to offer the graceful "close" experience when using
HTTP/2. The low default has been chosen to mitigate denial of service attacks.
When the server is behind a load balancer or can scale automatically this value
can be increased to fit the use case. Node core defaults this to `0`. `

### `frameworkErrors`
<a id="framework-errors"></a>

+ Default: `null`

Fastify provides default error handlers for the most common use cases. It is
possible to override one or more of those handlers with custom code using this
option.

*Note: Only `FST_ERR_BAD_URL` is implemented at the moment.*

```js
const fastify = require('fastify')({
  frameworkErrors: function (error, req, res) {
    if (error instanceof FST_ERR_BAD_URL) {
      res.code(400)
      return res.send("Provided url is not valid")
    } else {
      res.send(err)
    }
  }
})
```

### `clientErrorHandler`
<a id="client-error-handler"></a>

Set a
[clientErrorHandler](https://nodejs.org/api/http.html#http_event_clienterror)
that listens to `error` events emitted by client connections and responds with a
`400`.

It is possible to override the default `clientErrorHandler` using this option.

+ Default:
```js
function defaultClientErrorHandler (err, socket) {
  if (err.code === 'ECONNRESET') {
    return
  }

  const body = JSON.stringify({
    error: http.STATUS_CODES['400'],
    message: 'Client Error',
    statusCode: 400
  })
  this.log.trace({ err }, 'client error')

  if (socket.writable) {
    socket.end(`HTTP/1.1 400 Bad Request\r\nContent-Length: ${body.length}\r\nContent-Type: application/json\r\n\r\n${body}`)
  }
}
```

*Note: `clientErrorHandler` operates with raw socket. The handler is expected to
return a properly formed HTTP response that includes a status line, HTTP headers
and a message body. Before attempting to write the socket, the handler should
check if the socket is still writable as it may have already been destroyed.*

```js
const fastify = require('fastify')({
  clientErrorHandler: function (err, socket) {
    const body = JSON.stringify({
      error: {
        message: 'Client error',
        code: '400'
      }
    })

    // `this` is bound to fastify instance
    this.log.trace({ err }, 'client error')

    // the handler is responsible for generating a valid HTTP response
    socket.end(`HTTP/1.1 400 Bad Request\r\nContent-Length: ${body.length}\r\nContent-Type: application/json\r\n\r\n${body}`)
  }
})
```

### `rewriteUrl`
<a id="rewrite-url"></a>

Set a sync callback function that must return a string that allows rewriting
URLs.

> Rewriting a URL will modify the `url` property of the `req` object

```js
function rewriteUrl (req) { // req is the Node.js HTTP request
  return req.url === '/hi' ? '/hello' : req.url;
}
```

Note that `rewriteUrl` is called _before_ routing, it is not encapsulated and it
is an instance-wide configuration.

## Instance

### Server Methods

#### server
<a id="server"></a>

`fastify.server`: The Node core
[server](https://nodejs.org/api/http.html#http_class_http_server) object as
returned by the [**`Fastify factory function`**](#factory).

#### after
<a id="after"></a>

Invoked when the current plugin and all the plugins that have been registered
within it have finished loading. It is always executed before the method
`fastify.ready`.

```js
fastify
  .register((instance, opts, done) => {
    console.log('Current plugin')
    done()
  })
  .after(err => {
    console.log('After current plugin')
  })
  .register((instance, opts, done) => {
    console.log('Next plugin')
    done()
  })
  .ready(err => {
    console.log('Everything has been loaded')
  })
```

In case `after()` is called without a function, it returns a `Promise`:

```js
fastify.register(async (instance, opts) => {
  console.log('Current plugin')
})

await fastify.after()
console.log('After current plugin')

fastify.register(async (instance, opts) => {
  console.log('Next plugin')
})

await fastify.ready()

console.log('Everything has been loaded')
```

#### ready
<a id="ready"></a>

Function called when all the plugins have been loaded. It takes an error
parameter if something went wrong.
```js
fastify.ready(err => {
  if (err) throw err
})
```
If it is called without any arguments, it will return a `Promise`:

```js
fastify.ready().then(() => {
  console.log('successfully booted!')
}, (err) => {
  console.log('an error happened', err)
})
```

#### listen
<a id="listen"></a>

Starts the server on the given port after all the plugins are loaded, internally
waits for the `.ready()` event. The callback is the same as the Node core. By
default, the server will listen on the address resolved by `localhost` when no
specific address is provided (`127.0.0.1` or `::1` depending on the operating
system). If listening on any available interface is desired, then specifying
`0.0.0.0` for the address will listen on all IPv4 addresses. Using `::` for the
address will listen on all IPv6 addresses and, depending on OS, may also listen
on all IPv4 addresses. Be careful when deciding to listen on all interfaces; it
comes with inherent [security
risks](https://web.archive.org/web/20170831174611/https://snyk.io/blog/mongodb-hack-and-secure-defaults/).

```js
fastify.listen(3000, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
```

Specifying an address is also supported:

```js
fastify.listen(3000, '127.0.0.1', (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
```

Specifying a backlog queue size is also supported:

```js
fastify.listen(3000, '127.0.0.1', 511, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
```

Specifying options is also supported; the object is same as
[options](https://nodejs.org/api/net.html#net_server_listen_options_callback) in
the Node.js server listen:

```js
fastify.listen({ port: 3000, host: '127.0.0.1', backlog: 511 }, (err) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
```

If no callback is provided a Promise is returned:

```js
fastify.listen(3000)
  .then((address) => console.log(`server listening on ${address}`))
  .catch(err => {
    console.log('Error starting server:', err)
    process.exit(1)
  })
```

Specifying an address without a callback is also supported:

```js
fastify.listen(3000, '127.0.0.1')
  .then((address) => console.log(`server listening on ${address}`))
  .catch(err => {
    console.log('Error starting server:', err)
    process.exit(1)
  })
```

Specifying options without a callback is also supported:

```js
fastify.listen({ port: 3000, host: '127.0.0.1', backlog: 511 })
  .then((address) => console.log(`server listening on ${address}`))
  .catch(err => {
    console.log('Error starting server:', err)
    process.exit(1)
  })
```

When deploying to a Docker, and potentially other, containers, it is advisable
to listen on `0.0.0.0` because they do not default to exposing mapped ports to
`localhost`:

```js
fastify.listen(3000, '0.0.0.0', (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
```

If the `port` is omitted (or is set to zero), a random available port is
automatically chosen (later available via `fastify.server.address().port`).

The default options of listen are:

```js
fastify.listen({
  port: 0,
  host: 'localhost',
  exclusive: false,
  readableAll: false,
  writableAll: false,
  ipv6Only: false
}, (err) => {})
```

#### getDefaultRoute
<a id="getDefaultRoute"></a>

Method to get the `defaultRoute` for the server:

```js
const defaultRoute = fastify.getDefaultRoute()
```

#### setDefaultRoute
<a id="setDefaultRoute"></a>

Method to set the `defaultRoute` for the server:

```js
const defaultRoute = function (req, res) {
  res.end('hello world')
}

fastify.setDefaultRoute(defaultRoute)
```

#### routing
<a id="routing"></a>

Method to access the `lookup` method of the internal router and match the
request to the appropriate handler:

```js
fastify.routing(req, res)
```

#### route
<a id="route"></a>

Method to add routes to the server, it also has shorthand functions, check
[here](./Routes.md).

#### close
<a id="close"></a>

`fastify.close(callback)`: call this function to close the server instance and
run the [`'onClose'`](./Hooks.md#on-close) hook.

Calling `close` will also cause the server to respond to every new incoming
request with a `503` error and destroy that request. See [`return503OnClosing`
flags](#factory-return-503-on-closing) for changing this behavior.

If it is called without any arguments, it will return a Promise:

```js
fastify.close().then(() => {
  console.log('successfully closed!')
}, (err) => {
  console.log('an error happened', err)
})
```

#### decorate*
<a id="decorate"></a>

Function useful if you need to decorate the fastify instance, Reply or Request,
check [here](./Decorators.md).

#### register
<a id="register"></a>

Fastify allows the user to extend its functionality with plugins. A plugin can
be a set of routes, a server decorator, or whatever, check [here](./Plugins.md).

#### addHook
<a id="addHook"></a>

Function to add a specific hook in the lifecycle of Fastify, check
[here](./Hooks.md).

#### prefix
<a id="prefix"></a>

The full path that will be prefixed to a route.

Example:

```js
fastify.register(function (instance, opts, done) {
  instance.get('/foo', function (request, reply) {
    // Will log "prefix: /v1"
    request.log.info('prefix: %s', instance.prefix)
    reply.send({ prefix: instance.prefix })
  })

  instance.register(function (instance, opts, done) {
    instance.get('/bar', function (request, reply) {
      // Will log "prefix: /v1/v2"
      request.log.info('prefix: %s', instance.prefix)
      reply.send({ prefix: instance.prefix })
    })

    done()
  }, { prefix: '/v2' })

  done()
}, { prefix: '/v1' })
```

#### pluginName
<a id="pluginName"></a>

Name of the current plugin. There are three ways to define a name (in order).

1. If you use [fastify-plugin](https://github.com/fastify/fastify-plugin) the
   metadata `name` is used.
2. If you `module.exports` a plugin the filename is used.
3. If you use a regular [function
   declaration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions#Defining_functions)
   the function name is used.

*Fallback*: The first two lines of your plugin will represent the plugin name.
Newlines are replaced by ` -- `. This will help to identify the root cause when
you deal with many plugins.

Important: If you have to deal with nested plugins, the name differs with the
usage of the [fastify-plugin](https://github.com/fastify/fastify-plugin) because
no new scope is created and therefore we have no place to attach contextual
data. In that case, the plugin name will represent the boot order of all
involved plugins in the format of `plugin-A -> plugin-B`.

#### log
<a id="log"></a>

The logger instance, check [here](./Logging.md).

#### version
<a id="version"></a>

Fastify version of the instance. Used for plugin support. See
[Plugins](./Plugins.md#handle-the-scope) for information on how the version is
used by plugins.

#### inject
<a id="inject"></a>

Fake HTTP injection (for testing purposes) [here](../Guides/Testing.md#benefits-of-using-fastifyinject).

#### addSchema
<a id="add-schema"></a>

`fastify.addSchema(schemaObj)`, adds a JSON schema to the Fastify instance. This
allows you to reuse it everywhere in your application just by using the standard
`$ref` keyword.

To learn more, read the [Validation and
Serialization](./Validation-and-Serialization.md) documentation.

#### getSchemas
<a id="get-schemas"></a>

`fastify.getSchemas()`, returns a hash of all schemas added via `.addSchema`.
The keys of the hash are the `$id`s of the JSON Schema provided.

#### getSchema
<a id="get-schema"></a>

`fastify.getSchema(id)`, return the JSON schema added with `.addSchema` and the
matching `id`. It returns `undefined` if it is not found.

#### setReplySerializer
<a id="set-reply-serializer"></a>

Set the reply serializer for all the routes. This will be used as default if a
[Reply.serializer(func)](./Reply.md#serializerfunc) has not been set. The
handler is fully encapsulated, so different plugins can set different error
handlers. Note: the function parameter is called only for status `2xx`. Check
out the [`setErrorHandler`](#seterrorhandler) for errors.

```js
fastify.setReplySerializer(function (payload, statusCode){
  // serialize the payload with a sync function
  return `my serialized ${statusCode} content: ${payload}`
})
```

#### setValidatorCompiler
<a id="set-validator-compiler"></a>

Set the schema validator compiler for all routes. See
[#schema-validator](./Validation-and-Serialization.md#schema-validator).

#### setSchemaErrorFormatter
<a id="set-schema-error-formatter"></a>

Set the schema error formatter for all routes. See
[#error-handling](./Validation-and-Serialization.md#schemaerrorformatter).

#### setSerializerCompiler
<a id="set-serializer-resolver"></a>

Set the schema serializer compiler for all routes. See
[#schema-serializer](./Validation-and-Serialization.md#schema-serializer).
**Note:** [`setReplySerializer`](#set-reply-serializer) has priority if set!

#### validatorCompiler
<a id="validator-compiler"></a>

This property can be used to get the schema validator. If not set, it will be
`null` until the server starts, then it will be a function with the signature
`function ({ schema, method, url, httpPart })` that returns the input `schema`
compiled to a function for validating data. The input `schema` can access all
the shared schemas added with [`.addSchema`](#add-schema) function.

#### serializerCompiler
<a id="serializer-compiler"></a>

This property can be used to get the schema serializer. If not set, it will be
`null` until the server starts, then it will be a function with the signature
`function ({ schema, method, url, httpPart })` that returns the input `schema`
compiled to a function for validating data. The input `schema` can access all
the shared schemas added with [`.addSchema`](#add-schema) function.

#### schemaErrorFormatter
<a id="schema-error-formatter"></a>

This property can be used to set a function to format errors that happen while
the `validationCompiler` fails to validate the schema. See
[#error-handling](./Validation-and-Serialization.md#schemaerrorformatter).

#### schemaController
<a id="schema-controller"></a>

This property can be used to fully manage:
- `bucket`: where the schemas of your application will be stored
- `compilersFactory`: what module must compile the JSON schemas

It can be useful when your schemas are stored in another data structure that is
unknown to Fastify. See [issue
#2446](https://github.com/fastify/fastify/issues/2446) for an example of what
this property helps to resolve.

Another use case is to tweak all the schemas processing. Doing so it is possible
to use Ajv v8, instead of the default v6! We will see an example of this later.

```js
const fastify = Fastify({
  schemaController: {
    /**
     * This factory is called whenever `fastify.register()` is called.
     * It may receive as input the schemas of the parent context if some schemas have been added.
     * @param {object} parentSchemas these schemas will be returned by the `getSchemas()` method function of the returned `bucket`.
     */
    bucket: function factory (parentSchemas) {
      return {
        addSchema (inputSchema) {
          // This function must store the schema added by the user.
          // This function is invoked when `fastify.addSchema()` is called.
        },
        getSchema (schema$id) {
          // This function must return the raw schema requested by the `schema$id`.
          // This function is invoked when `fastify.getSchema(id)` is called.
          return aSchema
        },
        getSchemas () {
          // This function must return all the schemas referenced by the routes schemas' $ref
          // It must return a JSON where the property is the schema `$id` and the value is the raw JSON Schema.
          const allTheSchemaStored = {
            'schema$id1': schema1,
            'schema$id2': schema2
          }
          return allTheSchemaStored
        }
      }
    },

    /**
     * The compilers factory let you fully control the validator and serializer
     * in the Fastify's lifecycle, providing the encapsulation to your compilers.
     */
    compilersFactory: {
      /**
       * This factory is called whenever a new validator instance is needed.
       * It may be called whenever `fastify.register()` is called only if new schemas have been added to the
       * encapsulation context.
       * It may receive as input the schemas of the parent context if some schemas have been added.
       * @param {object} externalSchemas these schemas will be returned by the `bucket.getSchemas()`. Needed to resolve the external references $ref.
       * @param {object} ajvServerOption the server `ajv` options to build your compilers accordingly
       */
      buildValidator: function factory (externalSchemas, ajvServerOption) {
        // This factory function must return a schema validator compiler.
        // See [#schema-validator](./Validation-and-Serialization.md#schema-validator) for details.
        const yourAjvInstance = new Ajv(ajvServerOption.customOptions)
        return function validatorCompiler ({ schema, method, url, httpPart }) {
          return yourAjvInstance.compile(schema)
        }
      },

      /**
       * This factory is called whenever a new serializer instance is needed.
       * It may be called whenever `fastify.register()` is called only if new schemas have been added to the
       * encapsulation context.
       * It may receive as input the schemas of the parent context if some schemas have been added.
       * @param {object} externalSchemas these schemas will be returned by the `bucket.getSchemas()`. Needed to resolve the external references $ref.
       * @param {object} serializerOptsServerOption the server `serializerOpts` options to build your compilers accordingly
       */
      buildSerializer: function factory (externalSchemas, serializerOptsServerOption) {
        // This factory function must return a schema serializer compiler.
        // See [#schema-serializer](./Validation-and-Serialization.md#schema-serializer) for details.
        return function serializerCompiler ({ schema, method, url, httpStatus }) {
          return data => JSON.stringify(data)
        }
      }
    }
  }
});
```

##### Ajv 8 as default schema validator

Ajv 8 is the evolution of Ajv 6, and it has a lot of improvements and new
features. To use the new Ajv 8 features such as JTD or the Standalone mode,
refer to the [`@fastify/ajv-compiler`
documentation](https://github.com/fastify/ajv-compiler#usage).

To use Ajv 8 as default schema validator, you can use the following code:

```js
const AjvCompiler = require('@fastify/ajv-compiler') // It must be the v2.x.x version

// Note that the `format` schema's keyword is no longer supported on Ajv 8 by default.
// So you need to add it manually.
const ajvFormats = require('ajv-formats')

const app = fastify({
  ajv: {
    customOptions: {
      validateFormats: true
    },
    plugins: [ajvFormats]
  },
  schemaController: {
    compilersFactory: {
      buildValidator: AjvCompiler()
    }
  }
})

// Done! You can now use Ajv 8 options and keywords in your schemas!
```

#### setNotFoundHandler
<a id="set-not-found-handler"></a>

`fastify.setNotFoundHandler(handler(request, reply))`: set the 404 handler. This
call is encapsulated by prefix, so different plugins can set different not found
handlers if a different [`prefix` option](./Plugins.md#route-prefixing-option)
is passed to `fastify.register()`. The handler is treated as a regular route
handler so requests will go through the full [Fastify
lifecycle](./Lifecycle.md#lifecycle).

You can also register
[`preValidation`](./Hooks.md#route-hooks) and
[`preHandler`](./Hooks.md#route-hooks) hooks for
the 404 handler.

_Note: The `preValidation` hook registered using this method will run for a
route that Fastify does not recognize and **not** when a route handler manually
calls [`reply.callNotFound`](./Reply.md#call-not-found)_. In which case, only
preHandler will be run.

```js
fastify.setNotFoundHandler({
  preValidation: (req, reply, done) => {
    // your code
    done()
  },
  preHandler: (req, reply, done) => {
    // your code
    done()
  }
}, function (request, reply) {
    // Default not found handler with preValidation and preHandler hooks
})

fastify.register(function (instance, options, done) {
  instance.setNotFoundHandler(function (request, reply) {
    // Handle not found request without preValidation and preHandler hooks
    // to URLs that begin with '/v1'
  })
  done()
}, { prefix: '/v1' })
```

Fastify calls setNotFoundHandler to add a default 404 handler at startup before
plugins are registered. If you would like to augment the behavior of the default
404 handler, for example with plugins, you can call setNotFoundHandler with no
arguments `fastify.setNotFoundHandler()` within the context of these registered
plugins.

#### setErrorHandler
<a id="set-error-handler"></a>

`fastify.setErrorHandler(handler(error, request, reply))`: Set a function that
will be called whenever an error happens. The handler is bound to the Fastify
instance and is fully encapsulated, so different plugins can set different error
handlers. *async-await* is supported as well.

*Note: If the error `statusCode` is less than 400, Fastify will automatically
set it at 500 before calling the error handler.*

```js
fastify.setErrorHandler(function (error, request, reply) {
  // Log error
  this.log.error(error)
  // Send error response
  reply.status(409).send({ ok: false })
})
```

Fastify is provided with a default function that is called if no error handler
is set. It can be accessed using `fastify.errorHandler` and it logs the error
with respect to its `statusCode`.

```js
var statusCode = error.statusCode
if (statusCode >= 500) {
  log.error(error)
} else if (statusCode >= 400) {
  log.info(error)
} else {
  log.error(error)
}
```

#### printRoutes
<a id="print-routes"></a>

`fastify.printRoutes()`: Prints the representation of the internal radix tree
used by the router, useful for debugging. Alternatively, `fastify.printRoutes({
commonPrefix: false })` can be used to print the flattened routes tree.

*Remember to call it inside or after a `ready` call.*

```js
fastify.get('/test', () => {})
fastify.get('/test/hello', () => {})
fastify.get('/hello/world', () => {})
fastify.get('/helicopter', () => {})

fastify.ready(() => {
  console.log(fastify.printRoutes())
  // └── /
  //     ├── test (GET)
  //     │   └── /hello (GET)
  //     └── hel
  //         ├── lo/world (GET)
  //         └── licopter (GET)

  console.log(fastify.printRoutes({ commonPrefix: false }))
  // └── / (-)
  //     ├── test (GET)
  //     │   └── /hello (GET)
  //     ├── hello/world (GET)
  //     └── helicopter (GET)

})
```

`fastify.printRoutes({ includeMeta: (true | []) })` will display properties from
the `route.store` object for each displayed route. This can be an `array` of
keys (e.g. `['onRequest', Symbol('key')]`), or `true` to display all properties.
A shorthand option, `fastify.printRoutes({ includeHooks: true })` will include
all [hooks](./Hooks.md).

```js
  console.log(fastify.printRoutes({ includeHooks: true, includeMeta: ['metaProperty'] }))
  // └── /
  //     ├── test (GET)
  //     │   • (onRequest) ["anonymous()","namedFunction()"]
  //     │   • (metaProperty) "value"
  //     │   └── /hello (GET)
  //     └── hel
  //         ├── lo/world (GET)
  //         │   • (onTimeout) ["anonymous()"]
  //         └── licopter (GET)

  console.log(fastify.printRoutes({ includeHooks: true }))
  // └── /
  //     ├── test (GET)
  //     │   • (onRequest) ["anonymous()","namedFunction()"]
  //     │   └── /hello (GET)
  //     └── hel
  //         ├── lo/world (GET)
  //         │   • (onTimeout) ["anonymous()"]
  //         └── licopter (GET)
```

#### printPlugins
<a id="print-plugins"></a>

`fastify.printPlugins()`: Prints the representation of the internal plugin tree
used by the avvio, useful for debugging require order issues.

*Remember to call it inside or after a `ready` call.*

```js
fastify.register(async function foo (instance) {
  instance.register(async function bar () {})
})
fastify.register(async function baz () {})

fastify.ready(() => {
  console.error(fastify.printPlugins())
  // will output the following to stderr:
  // └── root
  //     ├── foo
  //     │   └── bar
  //     └── baz
})
```

#### addContentTypeParser
<a id="addContentTypeParser"></a>

`fastify.addContentTypeParser(content-type, options, parser)` is used to pass
custom parser for a given content type. Useful for adding parsers for custom
content types, e.g. `text/json, application/vnd.oasis.opendocument.text`.
`content-type` can be a string, string array or RegExp.

```js
// The two arguments passed to getDefaultJsonParser are for ProtoType poisoning and Constructor Poisoning configuration respectively. The possible values are 'ignore', 'remove', 'error'. ignore  skips all validations and it is similar to calling JSON.parse() directly. See the [`secure-json-parse` documentation](https://github.com/fastify/secure-json-parse#api) for more information.

fastify.addContentTypeParser('text/json', { asString: true }, fastify.getDefaultJsonParser('ignore', 'ignore'))
```

#### getDefaultJsonParser
<a id="getDefaultJsonParser"></a>

`fastify.getDefaultJsonParser(onProtoPoisoning, onConstructorPoisoning)` takes
two arguments. First argument is ProtoType poisoning configuration and second
argument is constructor poisoning configuration. See the [`secure-json-parse`
documentation](https://github.com/fastify/secure-json-parse#api) for more
information.


#### defaultTextParser
<a id="defaultTextParser"></a>

`fastify.defaultTextParser()` can be used to parse content as plain text.

```js
fastify.addContentTypeParser('text/json', { asString: true }, fastify.defaultTextParser())
```

#### errorHandler
<a id="errorHandler"></a>

`fastify.errorHandler` can be used to handle errors using fastify's default
error handler.

```js
fastify.get('/', {
  errorHandler: (error, request, reply) => {
    if (error.code === 'SOMETHING_SPECIFIC') {
      reply.send({ custom: 'response' })
      return
    }

    fastify.errorHandler(error, request, response)
  }
}, handler)
```

#### initialConfig
<a id="initial-config"></a>

`fastify.initialConfig`: Exposes a frozen read-only object registering the
initial options passed down by the user to the Fastify instance.

Currently the properties that can be exposed are:
- connectionTimeout
- keepAliveTimeout
- bodyLimit
- caseSensitive
- http2
- https (it will return `false`/`true` or `{ allowHTTP1: true/false }` if
  explicitly passed)
- ignoreTrailingSlash
- disableRequestLogging
- maxParamLength
- onProtoPoisoning
- onConstructorPoisoning
- pluginTimeout
- requestIdHeader
- requestIdLogLabel
- http2SessionTimeout

```js
const { readFileSync } = require('fs')
const Fastify = require('fastify')

const fastify = Fastify({
  https: {
    allowHTTP1: true,
    key: readFileSync('./fastify.key'),
    cert: readFileSync('./fastify.cert')
  },
  logger: { level: 'trace'},
  ignoreTrailingSlash: true,
  maxParamLength: 200,
  caseSensitive: true,
  trustProxy: '127.0.0.1,192.168.1.1/24',
})

console.log(fastify.initialConfig)
/*
will log :
{
  caseSensitive: true,
  https: { allowHTTP1: true },
  ignoreTrailingSlash: true,
  maxParamLength: 200
}
*/

fastify.register(async (instance, opts) => {
  instance.get('/', async (request, reply) => {
    return instance.initialConfig
    /*
    will return :
    {
      caseSensitive: true,
      https: { allowHTTP1: true },
      ignoreTrailingSlash: true,
      maxParamLength: 200
    }
    */
  })

  instance.get('/error', async (request, reply) => {
    // will throw an error because initialConfig is read-only
    // and can not be modified
    instance.initialConfig.https.allowHTTP1 = false

    return instance.initialConfig
  })
})

// Start listening.
fastify.listen(3000, (err) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
```
