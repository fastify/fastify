<p align="center">
<img src="https://github.com/fastify/graphics/raw/master/full-logo.png" width="650" height="auto"/>
</p>

# Fastify&nbsp;&nbsp;[![Build Status](https://travis-ci.org/fastify/fastify.svg?branch=master)](https://travis-ci.org/fastify/fastify)&nbsp;[![Coverage Status](https://coveralls.io/repos/github/mcollina/fastify/badge.svg?branch=master)](https://coveralls.io/github/mcollina/fastify?branch=master) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)

[Extremely fast](#benchmarks) node.js web framework, inspired by
[Express][express], [Hapi][hapi] and [Restify][restify].

Fastify is alpha software in *active development*, feel free to
contribute!

* [Installation](#install)
* [Usage](#usage)
* [Benchmarks](#benchmarks)
* [API](#api)
* [Logging](#logging)
* [Team](#team)
* [Acknowledgements](#acknowledgements)
* [License](#license)

## Install

```
npm install fastify --save
```

## Usage

```js
'use strict'

const fastify = require('fastify')()

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

fastify
  .get('/', schema, function (req, reply) {
    reply.send({ hello: 'world' })
  })
  .get('/no-schema', function (req, reply) {
    reply.send({ hello: 'world' })
  })
  .post('/', schema, function (req, reply) {
    reply.send({ hello: 'world' })
  })

fastify.listen(8000, function (err) {
  if (err) {
    throw err
  }

  console.log(`server listening on ${fastify.server.address().port}`)
})
```

<a name="benchmarks"></a>
## Benchmarks

As far as we know, it is one of the fastest web frameworks in town:

* Hapi: 2200 req/sec
* Restify: 6133 req/sec
* Express: 8534 req/sec
* Koa: 9640 req/sec
* *Fastify: 19860 req/sec*

All benchmarks where average taken over 5 seconds, on the second run of `autocannon -c 100 -d 5 -p 10 localhost:3000`.

<a name="api"></a>
## API

  * <a href="#constructor"><code><b>fastify()</b></code></a>
  * <a href="#server"><code>fastify.<b>server</b></code></a>
  * <a href="#ready"><code>fastify.<b>ready()</b></code></a>
  * <a href="#listen"><code>fastify.<b>listen()</b></code></a>
  * <a href="#route"><code>fastify.<b>route()</b></code></a>
  * <a href="#get"><code>fastify.<b>get()</b></code></a>
  * <a href="#post"><code>fastify.<b>post()</b></code></a>
  * <a href="#put"><code>fastify.<b>put()</b></code></a>
  * <a href="#delete"><code>fastify.<b>delete()</b></code></a>
  * <a href="#head"><code>fastify.<b>head()</b></code></a>
  * <a href="#patch"><code>fastify.<b>patch()</b></code></a>
  * <a href="#options"><code>fastify.<b>options()</b></code></a>
  * <a href="#register"><code>fastify.<b>register()</b></code></a>
  * <a href="#use"><code>fastify.<b>use()</b></code></a>

<a name="constructor"></a>
### fastify(req, res)

Returns a new fastify instance, which is a function with some method
attached. `req` and `res` are the request and response objects from Node
Core.

```js
const fastify = require('fastify')()

fastify.listen(8000, function (err) {
  if (err) {
    throw err
  }

  console.log(`server listening on ${fastify.server.address().port}`)
})
```

If you need an `HTTPS` server, pass an [option](https://nodejs.org/api/https.html) object with the keys to the *fastify* constructor.
```js
const fastify = require('fastify')({
  https: {
    key: fs.readFileSync('test/fixtures/keys/agent2-key.pem'),
    cert: fs.readFileSync('test/fixtures/keys/agent2-cert.pem')
  }
})
```

<a name="server"></a>
### fastify.server

The Node core [server object](https://nodejs.org/api/http.html#http_class_http_server).

<a name="ready"></a>
### fastify.ready(callback)

Function called when all the plugins has been loaded.

Emitted by [boot-in-the-arse](https://github.com/mcollina/boot-in-the-arse).

<a name="listen"></a>
### fastify.listen(port, [callback])

Starts the server on the given port after all the plugins are loaded, internally waits for the `.ready()` event.

The callback is the same as the Node core.

<a name="route"></a>
### fastify.route(options)

Options:

* `method`: currently it supports `'DELETE'`, `'GET'`, `'HEAD'`, `'PATCH'`, `'POST'`, `'PUT'` and `'OPTIONS'`.
* `url`: the path of the url to match this route, it uses
  [wayfarer][wayfarer] as a router.
* `schema`: an object containing the schemas for the request and response. They need to be in
  [JSON Schema](http://json-schema.org/) format:

  * `payload`: validates the body of the request if it is a POST or a
    PUT. It uses [ajv][ajv].
  * `querystring`: validates the querystring. It uses [ajv][ajv]. This can be a complete JSON
  Schema object, with the property `type` of `object` and `properties` object of parameters, or
  simply the values of what would be contained in the `properties` object as shown below.
  * `params`: validates the params. It uses [ajv][ajv].
  * `out`: filter and generate a schema for the response, setting a
    schema allows us to have 10-20% more throughput. It uses
    [fast-json-stringify][fast-json-stringify].
* `handler(request, reply)`: the function that will handle this request.

  `request` is defined in [Request](#request).

  `reply` is defined in [Reply](#reply).

Example:
```js
fastify.route({
  method: 'GET',
  url: '/',
  schema: {
    querystring: {
      name: {
        type: 'string'
      },
      excitement: {
        type: 'integer'
      }
    },
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
```

The handler can also return a Promise, and it supports async/await:

```js
fastify.route({
  method: 'GET',
  url: '/',
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
  handler: async function (request) {
    var res = await new Promise(function (resolve) {
      setTimeout(resolve, 200, { hello: 'world' })
    })
    return res
  }
})
```

<a name="request"></a>
#### Request

An object including the following properties:

* `query` - the parsed querystring
* `body` - the body
* `params` - the params matching the URL
* `req` - the incoming HTTP request from Node core

<a name="reply"></a>
#### Reply

An object that exposes three APIs.
* `.send(payload)` - Sends the payload to the user, could be a plain text, JSON, stream, or an Error object.
* `.code(statusCode)` - Sets the status code (default to 200).
* `.header(name, value)` - Sets the headers.

Example:
```js
fastify.get('/', schema, function (request, reply) {
  reply
    .code(200)
    .header('Content-Type', 'application/json')
    .send({ hello 'world' })
})
```

Reply.send() accepts also Promises:
```js
fastify.get('/', schema, function (request, reply) {
  const promise = new Promise(function (resolve, reject) {
    if (condition) {
      resolve({ hello: 'world' })
    } else {
      reject(new Error('some error'))
    }
  })

  reply
    .code(200)
    .header('Content-Type', 'application/json')
    .send(promise)
})
```

To send a stream, just pass it as a parameter to .send(), the default `Content-Type` for the streams is `application/octet-stream`. [Pump](https://github.com/mafintosh/pump) is used to pipe the streams.
```js
fastify.get('/', schema, function (request, reply) {
  const fs = require('fs')
  const stream = fs.createReadStream('some-file', 'utf8')
  reply.send(stream)
})
```

<a name="get"></a>
### fastify.get(path, [schema], handler)

Calls [route](#route) with the given path, schemas and handler, setting
up the `GET` method.

<a name="post"></a>
### fastify.post(path, [schema], handler)

Calls [route](#route) with the given path, schemas and handler, setting
up the `POST` method.

<a name="put"></a>
### fastify.put(path, [schema], handler)

Calls [route](#route) with the given path, schemas and handler, setting
up the `PUT` method.

<a name="delete"></a>
### fastify.delete(path, [schema], handler)

Calls [route](#route) with the given path, schemas and handler, setting
up the `DELETE` method.

<a name="head"></a>
### fastify.head(path, [schema], handler)

Calls [route](#route) with the given path, schemas and handler, setting
up the `HEAD` method.

<a name="patch"></a>
### fastify.patch(path, [schema], handler)

Calls [route](#route) with the given path, schemas and handler, setting
up the `PATCH` method.

<a name="options"></a>
### fastify.options(path, [schema], handler)

Calls [route](#route) with the given path, schemas and handler, setting
up the `OPTIONS` method.

<a name="register"></a>
### fastify.register(plugin, [options], [callback])
Used to register one or more plugins.

`plugin` can be a single function or an array of functions.

In case of the array of functions, the same options object and callback will be passed to them.

[boot-in-the-arse](https://github.com/mcollina/boot-in-the-arse) is used to load the plugins.

Example:
```js
// server.js
const fastify = require('fastify')()

fastify.register(require('./plugin'), function (err) {
  if (err) throw err
})

const opts = {
  hello: 'world',
  something: true
}
fastify.register([
  require('./another-plugin'),
  require('./yet-another-plugin')
], opts, function (err) {
  if (err) throw err
})

fastify.listen(8000, function (err) {
  if (err) {
    throw err
  }

  console.log(`server listening on ${fastify.server.address().port}`)
})
```
```js
// plugin.js
module.exports = function (fastify, options, next) {
  fastify.get('/', schema, function (req, reply) {
    reply.send({ hello: 'world' })
  })
  next()
}
```

<a name="use"></a>
### fastify.use(middleware(req, res, next))

Use to add one or more middlewares, [express](http://npm.im/express)/[connect](https://www.npmjs.com/package/connect) style.

This does not support the full syntax `middleware(err, req, res, next)`,
because error handling is done inside Fastify.

Example:

```js
const fastify = require('fastify')()
const cors = require('cors')
const helmet = require('cors')

fastify
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

<a name="logging"></a>
## Logging
Since Fastify is really focused on performances, we choose the best logger to achieve the goal. **[Pino](https://github.com/pinojs/pino)**!

By default Fastify uses [pino-http](https://github.com/pinojs/pino-http) as logger, with the log level setted to `'fatal'`.

If you want to pass some options to the logger, just pass the logger option to fastify.
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
```

<a name="team"></a>
## The Team

### Matteo Collina

<https://github.com/mcollina>

<https://www.npmjs.com/~matteo.collina>

<https://twitter.com/matteocollina>


### Tomas Della Vedova

<https://github.com/delvedor>

<https://www.npmjs.com/~delvedor>

<https://twitter.com/delvedor>

<a name="acknowledgements"></a>
## Acknowledgements

This project was kindly sponsored by [nearForm](http://nearform.com).

## License

Licensed under [MIT](./LICENSE).

[express]: http://expressjs.com
[hapi]: http://hapijs.com/
[restify]: http://restify.com/
[wayfarer]: http://npm.im/wayfarer
[fast-json-stringify]: http://npm.im/fast-json-stringify
[ajv]: http://npm.im/ajv
