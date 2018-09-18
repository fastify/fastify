<h1 align="center">Fastify</h1>

## Logging

Logging is disabled by default, and you can enable it by passing
`{ logger: true }` or `{ logger: { level: 'info' } }` when you create
the fastify instance. Note that if the logger is disabled, it is impossible to
enable it at runtime. We use
[abstract-logging](https://www.npmjs.com/package/abstract-logging) for
this purpose.

Since Fastify is really focused on performances, it uses [pino](https://github.com/pinojs/pino) as its logger, with the default log level, when enabled, set to `'info'`.

Enabling the logger is extremely easy:

```js
const fastify = require('fastify')({
  logger: true
})

fastify.get('/', options, function (request, reply) {
  request.log.info('Some info about the current request')
  reply.send({ hello: 'world' })
})
```

If you want to pass some options to the logger, just pass the logger option to Fastify.
You can find all the options in the [Pino documentation](https://github.com/pinojs/pino/blob/master/docs/API.md#pinooptions-stream). If you want to pass a custom stream to the Pino instance, just add the stream field to the logger object.

```js
const split = require('split2')
const stream = split(JSON.parse)

const fastify = require('fastify')({
  logger: {
    level: 'info',
    stream: stream
  }
})

fastify.get('/', options, function (request, reply) {
  request.log.info('Some info about the current request')
  reply.send({ hello: 'world' })
})
```

<a name="logging-request-id" />

By default fastify adds an id to every request for easier tracking. If the "request-id" header is present its value is used, otherwise a new incremental id is generated. See Fastify Factory [`requestIdHeader`](https://github.com/fastify/fastify/blob/master/docs/Server.md#factory-request-id-header) options for customizing that header name.
Additionally, `genReqId` option can be used for generating the request id by yourself. It will received the incoming request as a parameter.

```js
let i = 0
const fastify = require('fastify')({
  logger: {
    genReqId: function (req) { return i++ }
  }
})
```

The default logger is configured with a set of standard serializers that serialize objects with `req`, `res`, and `err` properties. This behavior can be customized by specifying custom serializers.
```js
const fastify = require('fastify')({
  logger: {
    serializers: {
      req: function (req) {
        return { url: req.url }
      }
    }
  }
})
```

*This option will be ignored by any logger other than Pino.*

You can also supply your own logger instance. Instead of passing configuration options, simply pass the instance.
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

*The logger instance for the current request is available in every part of the [lifecycle](https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md).*
