<h1 align="center">Fastify</h1>

## Logging

### Enable logging
Logging is disabled by default, and you can enable it by passing
`{ logger: true }` or `{ logger: { level: 'info' } }` when you create
a fastify instance. Note that if the logger is disabled, it is impossible to
enable it at runtime. We use
[abstract-logging](https://www.npmjs.com/package/abstract-logging) for
this purpose.

As Fastify is focused on performance, it uses [pino](https://github.com/pinojs/pino) as its logger, with the default log level, when enabled, set to `'info'`.

Enabling the production JSON logger:

```js
const fastify = require('fastify')({
  logger: true
})
```

Enabling the logger with appropriate configuration for both local development and production environment requires bit more configuration:
```js
const fastify = require('fastify')({
  logger: {
      prettyPrint:
        environment === 'development'
          ? {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname'
            }
          : false
    }
})
```
⚠️ `pino-pretty` needs to be installed as a dev dependency, it is not included by default for performance reasons.

### Usage
You can use the logger like this in your route handlers:

```js
fastify.get('/', options, function (request, reply) {
  request.log.info('Some info about the current request')
  reply.send({ hello: 'world' })
})
```

You can trigger new logs outside route handlers by using the Pino instance from the Fastify instance:
```js
fastify.log.info('Something important happened!');
```

If you want to pass some options to the logger, just pass them to Fastify.
You can find all available options in the [Pino documentation](https://github.com/pinojs/pino/blob/master/docs/api.md#pinooptions-stream). If you want to specify a file destination, use:

```js
const fastify = require('fastify')({
  logger: {
    level: 'info',
    file: '/path/to/file' // Will use pino.destination()
  }
})

fastify.get('/', options, function (request, reply) {
  request.log.info('Some info about the current request')
  reply.send({ hello: 'world' })
})
```

If you want to pass a custom stream to the Pino instance, just add a stream field to the logger object.

```js
const split = require('split2')
const stream = split(JSON.parse)

const fastify = require('fastify')({
  logger: {
    level: 'info',
    stream: stream
  }
})
```

<a name="logging-request-id"></a>

By default, Fastify adds an ID to every request for easier tracking. If the "request-id" header is present its value is used, otherwise a new incremental ID is generated. See Fastify Factory [`requestIdHeader`](Server.md#factory-request-id-header) and Fastify Factory [`genReqId`](Server.md#genreqid) for customization options.

The default logger is configured with a set of standard serializers that serialize objects with `req`, `res`, and `err` properties. The object received by `req` is the Fastify [`Request`](Request.md) object, while the object received by `res` is the Fastify [`Reply`](Reply.md) object.
This behaviour can be customized by specifying custom serializers.
```js
const fastify = require('fastify')({
  logger: {
    serializers: {
      req (request) {
        return { url: request.url }
      }
    }
  }
})
```
For example, the response payload and headers could be logged using the approach below (even if it is *not recommended*):

```js
const fastify = require('fastify')({
  logger: {
    prettyPrint: true,
    serializers: {
      res (reply) {
        // The default
        return {
          statusCode: reply.statusCode
        }
      },
      req (request) {
        return {
          method: request.method,
          url: request.url,
          path: request.path,
          parameters: request.parameters,
          // Including the headers in the log could be in violation
          // of privacy laws, e.g. GDPR. You should use the "redact" option to
          // remove sensitive fields. It could also leak authentication data in
          // the logs.
          headers: request.headers
        };
      }
    }
  }
});
```
**Note**: The body cannot be serialized inside a `req` method because the request is serialized when we create the child logger. At that time, the body is not yet parsed.

See an approach to log `req.body`

```js
app.addHook('preHandler', function (req, reply, done) {
  if (req.body) {
    req.log.info({ body: req.body }, 'parsed body')
  }
  done()
})
```


*Any logger other than Pino will ignore this option.*

You can also supply your own logger instance. Instead of passing configuration options, pass the instance.
The logger you supply must conform to the Pino interface; that is, it must have the following methods:
`info`, `error`, `debug`, `fatal`, `warn`, `trace`, `child`.

Example:

```js
const log = require('pino')({ level: 'info' })
const fastify = require('fastify')({ logger: log })

log.info('does not have request information')

fastify.get('/', function (request, reply) {
  request.log.info('includes request information, but is the same logger instance as `log`')
  reply.send({ hello: 'world' })
})
```

*The logger instance for the current request is available in every part of the [lifecycle](Lifecycle.md).*

## Log Redaction

[Pino](https://getpino.io) supports low-overhead log redaction for
obscuring values of specific properties in recorded logs.
As an example, we might want to log all the HTTP headers minus the
`Authorization` header for security concerns:

```js
const fastify = Fastify({
  logger: {
    stream: stream,
    redact: ['req.headers.authorization'],
    level: 'info',
    serializers: {
      req (request) {
        return {
          method: request.method,
          url: request.url,
          headers: request.headers,
          hostname: request.hostname,
          remoteAddress: request.ip,
          remotePort: request.socket.remotePort
        }
      }
    }
  }
})
```

See https://getpino.io/#/docs/redaction for more details.
