<div align="center">
<img src="https://github.com/fastify/graphics/raw/master/full-logo.png" width="650" height="auto"/>
</div>

<div align="center">

[![Build Status](https://travis-ci.org/fastify/fastify.svg?branch=master)](https://travis-ci.org/fastify/fastify)
[![Coverage Status](https://coveralls.io/repos/github/fastify/fastify/badge.svg?branch=master)](https://coveralls.io/github/fastify/fastify?branch=master)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
[![NPM version](https://img.shields.io/npm/v/fastify.svg?style=flat)](https://www.npmjs.com/package/fastify)
[![NPM downloads](https://img.shields.io/npm/dm/fastify.svg?style=flat)](https://www.npmjs.com/package/fastify) [![Gitter](https://badges.gitter.im/gitterHQ/gitter.svg)](https://gitter.im/fastify)
</div>
<br />

An efficient server implies a lower cost of the infrastructure, a better responsiveness under load and happy users.
How can you efficiently handle the resources of your server, knowing that you are serving the highest number of requests as possible, without sacrificing security validations and handy development?

Enter Fastify. Fastify is a web framework highly focused on speed and low overhead. It is inspired from Hapi and Express and as far as we know, it is one of the fastest web frameworks in town.
Use Fastify can increase your throughput up to 100%.

### Core features

- **100% asynchronous:** all the core is implemented with asynchronous code, in this way not even a millisecond is wasted.
- **Highly performant:** as far as we know, Fastify is one of the fastest web frameworks in town, depending on the code complexity we can serve up to 20000 request per second.
- **Extendible:** Fastify is fully extensible via its hooks, plugins and decorators.
- **Schema based:** even if it is not mandatory we recommend to use [JSON Schema](http://json-schema.org/) to validate your routes and serialize your outputs, internally Fastify compiles the schema in an highly performant function.
- **Logging:** logs are extremely important but are costly; we chose the best logger to almost remove this cost, [Pino](https://github.com/pinojs/pino)!
- **Developer friendly:** the framework is built to be very expressive and help the developer in his daily use, without sacrificing performance and security.

### Benchmarks
- Hapi: 2200 req/sec
- Restify: 6133 req/sec
- Express: 8534 req/sec
- Koa: 9640 req/sec
- **Fastify: 21287 req/sec**

## Documentation
* [__`Getting Started`__](docs/Getting-Started.md)
- [__`Server Methods`__](/docs/Server-Methods.md)
- [__`Routes`__](/docs/Routes.md)
- [__`Logging`__](/docs/Logging.md)
- [__`Middlewares`__](/docs/Middlewares.md)
- [__`Hooks`__](/docs/Hooks.md)
- [__`Decorators`__](/docs/Decorators.md)
- [__`Validation and Serialize`__](/docs/Validation-And-Serialize.md)
- [__`Lifecycle`__](/docs/Lifecycle.md)
- [__`Reply`__](/docs/Reply.md)
- [__`Request`__](/docs/Request.md)
- [__`ContentTypeParser`__](/docs/ContentTypeParser.md)
- [__`Plugins`__](/docs/Plugins.md)
- [__`Testing`__](/docs/Testing.md)

## Ecosystem
- [`point-of-view`](https://github.com/fastify/point-of-view)
Templates rendering (*ejs, pug, handlebars, marko*) plugin support for Fastify.
- [`fastify-mongodb`](https://github.com/fastify/fastify-mongodb)
Fastify MongoDB connection plugin, with this you can share the same MongoDb connection pool in every part of your server.
- [`fastify-redis`](https://github.com/fastify/fastify-redis)
Fastify Redis connection plugin, with this you can share the same Redis connection in every part of your server.
- [`fastify-swagger`](https://github.com/fastify/fastify-swagger)
Swagger documentation generator for Fastify
- [`fastify-multipart`](https://github.com/fastify/fastify-multipart)
Multipart support for Fastify
- [`fastify-bearer-auth`](https://github.com/jsumners/fastify-bearer-auth)
Bearer auth plugin for Fastify
- [`fastify-pigeon`](https://github.com/fastify/fastify-pigeon) [Bankai](https://github.com/yoshuawuyts/bankai) assets compiler for Fastify
- [`fastify-react`](https://github.com/fastify/fastify-react) React server side rendering support for Fastify with [Next](https://github.com/zeit/next.js/)
- [`fastify-jwt`](https://github.com/fastify/fastify-jwt) JWT utils for Fastify, internally uses [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- [`fastify-websocket`](https://github.com/fastify/fastify-websocket) WebSocket support for Fastify. Built upon [websocket-stream](https://github.com/maxogden/websocket-stream)
- [`fastify-helmet`](https://github.com/fastify/fastify-helmet) Important security headers for Fastify
- [`fastify-auth`](https://github.com/fastify/fastify-auth) Run multiple auth functions in Fastify
- [`fastify-leveldb`](https://github.com/fastify/fastify-leveldb) Plugin to share a common LevelDB connection across Fastify.
- [`fastify-apollo`](https://github.com/coopnd/fastify-apollo) Run an [Apollo Server](https://github.com/apollographql/apollo-server) with Fastify. 
- [`fastify-accepts`](https://github.com/fastify/fastify-accepts) to have [accepts](https://www.npmjs.com/package/accepts) in your request object. 
- *More coming soon*

## Team

### Matteo Collina

<https://github.com/mcollina>

<https://www.npmjs.com/~matteo.collina>

<https://twitter.com/matteocollina>


### Tomas Della Vedova

<https://github.com/delvedor>

<https://www.npmjs.com/~delvedor>

<https://twitter.com/delvedor>

## Acknowledgements

This project is kindly sponsored by:
- [nearForm](http://nearform.com)
- [LetzDoIt](http://www.letzdoitapp.com/)

## License

Licensed under [MIT](./LICENSE).
