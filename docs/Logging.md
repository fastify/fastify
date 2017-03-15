<h1 align="center">Fastify</h1>

## Logging
Since Fastify is really focused on performances, we choose the best logger to achieve the goal. **[Pino](https://github.com/pinojs/pino)**!

By default Fastify uses [pino-http](https://github.com/pinojs/pino-http) as logger, with the log level setted to `'fatal'`.

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

fastify.get('/', schema, function (req, reply) {
  req.log.info('Some info about the current request')
  reply.send({ hello: 'world' })
})
```
*The logger instance for the current request is available in every part of the [lifecycle](https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md).*
