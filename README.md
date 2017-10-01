<div align="center">
<img src="https://github.com/fastify/graphics/raw/master/full-logo.png" width="650" height="auto"/>
</div>

<div align="center">

[![Build Status](https://travis-ci.org/fastify/fastify.svg?branch=master)](https://travis-ci.org/fastify/fastify)
[![Coverage Status](https://coveralls.io/repos/github/fastify/fastify/badge.svg?branch=master)](https://coveralls.io/github/fastify/fastify?branch=master)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
[![NPM version](https://img.shields.io/npm/v/fastify.svg?style=flat)](https://www.npmjs.com/package/fastify)
[![NPM downloads](https://img.shields.io/npm/dm/fastify.svg?style=flat)](https://www.npmjs.com/package/fastify) [![Gitter](https://badges.gitter.im/gitterHQ/gitter.svg)](https://gitter.im/fastify)
[![Build status](https://ci.appveyor.com/api/projects/status/xduljw5nsu1ya72x/branch/master?svg=true)](https://ci.appveyor.com/project/mcollina/fastify/branch/master)
</div>
<br />

An efficient server implies a lower cost of the infrastructure, a better responsiveness under load and happy users.
How can you efficiently handle the resources of your server, knowing that you are serving the highest number of requests as possible, without sacrificing security validations and handy development?

Enter Fastify. Fastify is a web framework highly focused on speed and low overhead. It is inspired from Hapi and Express and as far as we know, it is one of the fastest web frameworks in town.
Use Fastify can increase your throughput up to 100%.

### Install

```
npm i fastify --save
```

### Example

```js
// Require the framework and instantiate it
const fastify = require('fastify')()

// Declare a route
fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
})

// Run the server!
fastify.listen(3000, function (err) {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```

Do you want to know more? Head to the <a href="https://github.com/fastify/fastify/blob/master/docs/Getting-Started.md"><code><b>Getting Started</b></code></a>.

### Core features

- **100% asynchronous:** all the core is implemented with asynchronous code, in this way not even a millisecond is wasted.
- **Highly performant:** as far as we know, Fastify is one of the fastest web frameworks in town, depending on the code complexity we can serve up to 20000 request per second.
- **Extendible:** Fastify is fully extensible via its hooks, plugins and decorators.
- **Schema based:** even if it is not mandatory we recommend to use [JSON Schema](http://json-schema.org/) to validate your routes and serialize your outputs, internally Fastify compiles the schema in a highly performant function.
- **Logging:** logs are extremely important but are costly; we chose the best logger to almost remove this cost, [Pino](https://github.com/pinojs/pino)!
- **Developer friendly:** the framework is built to be very expressive and help the developer in his daily use, without sacrificing performance and security.

### Benchmarks

__Machine:__ Intel Xeon E5-2686 v4 @ 2.30GHz (4 cores, 8 threads), 16GiB RAM (Amazon EC2 m4.xlarge)

__Method:__: `autocannon -c 100 -d 5 -p 10 localhost:3000` * 2, taking the second average

| Framework          | Version                    | Router?      |  Requests/sec |
| :----------------- | :------------------------- | :----------: | ------------: |
| hapi               | 16.5.2                     | &#10003;     | 4,226         |
| Restify            | 5.2.0                      | &#10003;     | 16,395        |
| Express            | 4.15.4                     | &#10003;     | 18,740        |
| Koa (`koa-router`) | 2.3.0 (`koa-router@7.2.1`) | &#10003;     | 21,361        |
| take-five          | 1.3.4                      | &#10003;     | 25,838        |
| Koa                | 2.3.0                      | &#10007;     | 26,228        |
| **Fastify**        | **0.27.0**                 | **&#10003;** | **29,340**    |
| -                  |                            |              |               |
| `http.Server`      | 8.4.0                      | &#10007;     | 37,846        |

Benchmarks taken using https://github.com/fastify/benchmarks.

## Documentation
* <a href="https://github.com/fastify/fastify/blob/master/docs/Getting-Started.md"><code><b>Getting Started</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Server-Methods.md"><code><b>Server Methods</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Routes.md"><code><b>Routes</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Logging.md"><code><b>Logging</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Middlewares.md"><code><b>Middlewares</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Hooks.md"><code><b>Hooks</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Decorators.md"><code><b>Decorators</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Validation-And-Serialize.md"><code><b>Validation and Serialize</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md"><code><b>Lifecycle</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Reply.md"><code><b>Reply</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Request.md"><code><b>Request</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/ContentTypeParser.md"><code><b>Content Type Parser</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Plugins.md"><code><b>Plugins</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Testing.md"><code><b>Testing</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Plugins-Guide.md"><code><b>Plugins Guide</b></code></a>

## Ecosystem
- [`fastify-accepts`](https://github.com/fastify/fastify-accepts) to have [accepts](https://www.npmjs.com/package/accepts) in your request object.
- [`fastify-accepts-serializer`](https://github.com/fastify/fastify-accepts-serializer) to serialize to output according to `Accept` header
- [`fastify-apollo`](https://github.com/coopnd/fastify-apollo) Run an [Apollo Server](https://github.com/apollographql/apollo-server) with Fastify. (GraphQL)
- [`fastify-auth`](https://github.com/fastify/fastify-auth) Run multiple auth functions in Fastify
- [`fastify-bearer-auth`](https://github.com/fastify/fastify-bearer-auth)
Bearer auth plugin for Fastify
- [`fastify-cookie`](https://github.com/fastify/fastify-cookie) Parse and set cookie headers
- [`fastify-env`](https://github.com/fastify/fastify-env) Load and check configuration
- [`fastify-formbody`](https://github.com/fastify/fastify-formbody) Plugin to parse x-www-form-urlencoded bodies
- [`fastify-graceful-shutdown`](https://github.com/hemerajs/fastify-graceful-shutdown) Shutdown Fastify graceful asynchronously
- [`fastify-helmet`](https://github.com/fastify/fastify-helmet) Important security headers for Fastify
- [`fastify-hemera`](https://github.com/hemerajs/fastify-hemera) Fastify Hemera plugin, for writing reliable & fault-tolerant microservices with [nats.io](https://nats.io/)
- [`fastify-jwt`](https://github.com/fastify/fastify-jwt) JWT utils for Fastify, internally uses [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- [`fastify-leveldb`](https://github.com/fastify/fastify-leveldb) Plugin to share a common LevelDB connection across Fastify.
- [`fastify-mongodb`](https://github.com/fastify/fastify-mongodb)
Fastify MongoDB connection plugin, with this you can share the same MongoDb connection pool in every part of your server.
- [`fastify-multipart`](https://github.com/fastify/fastify-multipart)
Multipart support for Fastify
- [`fastify-nats`](https://github.com/mahmed8003/fastify-nats)
Plugin to share [NATS](http://nats.io) client across Fastify.
- [`fastify-orientdb`](https://github.com/mahmed8003/fastify-orientdb)
Fastify OrientDB connection plugin, with this you can share the orientdb connection in every part of your server.
- [`fastify-pigeon`](https://github.com/fastify/fastify-pigeon) [Bankai](https://github.com/yoshuawuyts/bankai) assets compiler for Fastify
- [`fastify-react`](https://github.com/fastify/fastify-react) React server side rendering support for Fastify with [Next](https://github.com/zeit/next.js/)
- [`fastify-redis`](https://github.com/fastify/fastify-redis)
Fastify Redis connection plugin, with this you can share the same Redis connection in every part of your server.
- [`fastify-register-timeout`](https://github.com/fastify/fastify-register-timeout) Register plugin with a timeout
- [`fastify-sse`](https://github.com/lolo32/fastify-sse) to provide Server-Sent Events with `reply.sse( … )` to Fastify
- [`fastify-swagger`](https://github.com/fastify/fastify-swagger)
Swagger documentation generator for Fastify
- [`fastify-websocket`](https://github.com/fastify/fastify-websocket) WebSocket support for Fastify. Built upon [websocket-stream](https://github.com/maxogden/websocket-stream)
- [`point-of-view`](https://github.com/fastify/point-of-view)
Templates rendering (*ejs, pug, handlebars, marko*) plugin support for Fastify.
- *More coming soon*

## Team

_Fastify_ is the result of the work of a great community.
Team members are listed in alphabetical order.

### Lead Maintainers

* [__Matteo Collina__](https://github.com/mcollina), <https://twitter.com/matteocollina>, <https://www.npmjs.com/~matteo.collina>
* [__Tomas Della Vedova__](https://github.com/delvedor), <https://twitter.com/delvedor>, <https://www.npmjs.com/~delvedor>

### Collaborators

* [__Dustin Deus__](https://github.com/StarpTech), <https://twitter.com/dustindeus>, <https://www.npmjs.com/~starptech>
* [__Evan Shortiss__](https://github.com/evanshortiss), <https://twitter.com/evanshortiss>, <https://www.npmjs.com/~evanshortiss>
* [__James Sumners__](https://github.com/jsumners), <https://twitter.com/jsumners79>, <https://www.npmjs.com/~jsumners>
* [__Luciano Mammino__](https://github.com/lmammino), <https://twitter.com/loige>, <https://www.npmjs.com/~lmammino>
* [__Tommaso Allevi__](https://github.com/allevo), <https://twitter.com/allevitommaso>, <https://www.npmjs.com/~allevo>

## Acknowledgements

This project is kindly sponsored by:
- [nearForm](http://nearform.com)
- [LetzDoIt](http://www.letzdoitapp.com/)

## License

Licensed under [MIT](./LICENSE).
