# Fastify&nbsp;&nbsp;[![Build Status](https://travis-ci.org/mcollina/fastify.svg)](https://travis-ci.org/mcollina/fastify)&nbsp;[![Coverage Status](https://coveralls.io/repos/github/mcollina/fastify/badge.svg?branch=master)](https://coveralls.io/github/mcollina/fastify?branch=master)

[Extremely fast](#benchmarks) node.js web framework, inspired by
[Express][express], [Hapi][hapi] and [Restify][restify].

Fastify is alpha software in *active development*, feel free to
contribute!

* [Installation](#install)
* [Usage](#usage)
* [Benchmarks](#benchmarks)
* [API](#api)
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
const http = require('http')
const server = http.createServer(fastify)

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
    reply(null, { hello: 'world' })
  })
  .get('/no-schema', function (req, reply) {
    reply(null, { hello: 'world' })
  })
  .post('/', schema, function (req, reply) {
    reply(null, { hello: 'world' })
  })

server.listen(8000, function (err) {
  if (err) {
    throw err
  }

  console.log(`server listening on ${server.address().port}`)
})
```

<a name="benchmarks"></a>
## Benchmarks

As far as we know, it is one of the fastest web frameworks in town:

* Hapi: 2200 req/sec
* Restify: 6133 req/sec
* Express: 8534 req/sec
* Koa: 9640 req/sec
* *Fastify: 17140 req/sec*

All benchmarks where average taken over 5 seconds, on the second run of `autocannon -c 100 -d 5 -p 10 localhost:3000`.

<a name="api"></a>
## API

  * <a href="#constructor"><code><b>fastify()</b></code></a>
  * <a href="#route"><code>fastify.<b>route()</b></code></a>
  * <a href="#get"><code>fastify.<b>get()</b></code></a>
  * <a href="#post"><code>fastify.<b>post()</b></code></a>
  * <a href="#put"><code>fastify.<b>put()</b></code></a>
  * <a href="#delete"><code>fastify.<b>delete()</b></code></a>
  * <a href="#head"><code>fastify.<b>head()</b></code></a>
  * <a href="#patch"><code>fastify.<b>patch()</b></code></a>
  * <a href="#options"><code>fastify.<b>options()</b></code></a>
  * <a href="#register"><code>fastify.<b>register()</b></code></a>

<a name="constructor"></a>
### fastify(req, res)

Returns a new fastify instance, which is a function with some method
attached. `req` and `res` are the request and response objects from Node
Core.

```js
const fastify = require('fastify')()
const http = require('http')
const server = http.createServer(fastify)

server.listen(8000, function (err) {
  if (err) {
    throw err
  }

  console.log(`server listening on ${server.address().port}`)
})
```

<a name="route"></a>
### fastify.route(options)

Options:

* `method`: currently it supports only GET, POST and PUT.
* `url`: the path of the url to match this route, it uses
  [wayfarer][wayfarer] as a router.
* `schema`: an object containing the schemas for the request and response. They need to be in
  [JSON Schema](http://json-schema.org/) format:

  * `payload`: validates the body of the request if it is a POST or a
    PUT. It uses [ajv][ajv].
  * `querystring`: validates the querystring. It uses [ajv][ajv].
  * `params`: validates the params. It uses [ajv][ajv].
  * `out`: filter and generate a schema for the response, setting a
    schema allows us to have 10-20% more throughput. It uses
    [fast-json-stringify][fast-json-stringify].
* `handler(request, reply(err, statusCode, object)`: the function that will handle this request.  
`request` is defined in [Request](#request).  
`reply` is the function that handle the response object, defined in [Reply](#reply).

For POST and PUT, the incoming request body will be parsed.

<a name="request"></a>
#### Request

An object including the following properties:

* `query` - the parsed querystring
* `body` - the body
* `params` - the params matching the URL
* `req` - the incoming HTTP request from Node core

<a name="reply"></a>
#### Reply

A function that accepts the following parameters:

* `error` - error object *(mandatory)*
* `statusCode` - the http status code *(optional, default to 200)*
* `object` - JavaScript object that will be JSONified *(mandatory)*

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
const http = require('http')
const server = http.createServer(fastify)

fastify.register(require('./plugin'), function (err) {
  if (err) throw err
})

const opts = {
  hello: 'world',
  something: true
}
fastify.register([
  require('./another-plugin')
  require('./yet-another-plugin')
], opts, function (err) {
  if (err) throw err
})

server.listen(8000, function (err) {
  if (err) {
    throw err
  }

  console.log(`server listening on ${server.address().port}`)
})
```
```js
// plugin.js
module.exports = function (fastify, options, next) {
  fastify.get('/', schema, function (req, reply) {
    reply(null, { hello: 'world' })
  })
  next()
}
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
