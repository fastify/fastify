<h1 align="center">Fastify</h1>

## Usage

```js
const fastify = require('fastify')(/* custom options */)

// JSON schema definition for the output
const schema = {
  out: {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    }
  }
}

// Route declaration with the shorthand method
fastify.get('/path', schema, function (request, reply) {
  // You code
  reply
    // default code, if not setted is added by fastify
    .code(200)
    // is a content type is not setted, we are assuming that you are working with JSON
    .header('Content-Type', 'application/json')
    .send({ hello: 'world' })
})

fastify.get('/promises', schema, function (request, reply) {
  const promise = new Promise(...)

  reply
    .code(200)
    .header('Content-Type', 'application/json')
    .send(promise)
})

fastify.get('/streams', function (request, reply) {
  const fs = require('fs')
  const stream = fs.createReadStream('some-file', 'utf8')

  reply
    // fastify can natively handle streams,
    // it recognizes automatically that you are sending a stream
    // and it adds the 'application/octet-stream' content type by default.
    .send(stream)
})

// If you prefer you can also use the full route definition
fastify.route({
  method: 'GET',
  url: '/route-definition',
  schema: {
    out: {
      type: 'object',
      properties: {
        hello: {
          type: 'string'
        }
      }
    }
  },
  handler: function (request, reply) {
    reply.send({ hello: 'world' })
  }
})

// Are you using Async/Await? We support it out of the box.
fastify.get('/async-await', schema, async function (request, reply) {
  var res = await new Promise(function (resolve) {
    setTimeout(resolve, 200, { hello: 'world' })
  })
  return res
})

// Runs the server
fastify.listen(3000, function (err) {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```
### Register
As you can see use Fastify is very easy and handy.
Obviously register all the routes in the same file is not a good idea, Fastify offers an utility to solve this problem, `register`.

```js
/* server.js */

const fastify = require('fastify')()

fastify.register(require('./route'), function (err) {
  if (err) throw err
})

const opts = {
  hello: 'world',
  something: true
}
fastify.register([
  require('./another-route'),
  require('./yet-another-route')
], opts, function (err) {
  if (err) throw err
})

fastify.listen(8000, function (err) {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```
```js
/* route.js */

module.exports = function (fastify, options, next) {
  fastify.get('/', schema, function (req, reply) {
    reply.send({ hello: 'world' })
  })
  next()
}
```
### Middlewares
Fastify supports out of the box all the *Express/Restify* compatible middlewares.  
This does not support the full syntax `middleware(err, req, res, next)`, because error handling is done inside Fastify.
```js
const fastify = require('fastify')()
const cors = require('cors')
const helmet = require('helmet')

fastify
  // we recommend to use the individual packages
  // to get better performances
  .use(cors())
  .use(helmet())
  .get('/', function (req, reply) {
    reply.header('Content-Type', 'application/json').code(200)
    reply.send({ hello: 'world' })
  })

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```
### Hooks
You can register one or more hooks inside the fastify lifecycle.
Currently supported hooks (in order of execution):
- *onRequest*
- *preRouting*
- *preHandler*

```js
fastify.addHook('onRequest', function (req, res, next) {
  // perform some operation
  next()
})
```
*preHandler* gets as parameters the same object of the route handler, the fastify `request` and `reply` objects.
`addHook` returns an instance of fastify, so you can chain more addHooks calls.
### Logging
Since Fastify is really focused on performances, we choose the best logger to achieve the goal. Pino!

By default Fastify uses [pino-http](https://github.com/pinojs/pino-http) as logger, with the log level setted to 'fatal'.

If you want to pass some options to the logger, just pass the logger option to fastify. You can find all the options in the [Pino documentation](https://github.com/pinojs/pino/blob/master/docs/API.md#pinooptions-stream). If you want to pass a custom stream to the Pino instance, just add the stream field to the logger object.

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
  // You can access the logger instance via 'req.log'
  req.log.info('Some info')
  reply.send({ hello: 'world' })
})
```
