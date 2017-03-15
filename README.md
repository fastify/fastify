<div align="center">
<img src="https://github.com/fastify/graphics/raw/master/full-logo.png" width="650" height="auto"/>
</div>

<div align="center">

[![Build Status](https://travis-ci.org/fastify/fastify.svg?branch=master)](https://travis-ci.org/fastify/fastify)
[![Coverage Status](https://coveralls.io/repos/github/mcollina/fastify/badge.svg?branch=master)](https://coveralls.io/github/mcollina/fastify?branch=master)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
[![NPM version](https://img.shields.io/npm/v/fastify.svg?style=flat)](https://www.npmjs.com/package/fastify)
[![NPM downloads](https://img.shields.io/npm/dm/fastify.svg?style=flat)](https://www.npmjs.com/package/fastify)
</div>
<br />

An efficient server implies a lower cost of the infrastructure, a better responsiveness under load and happy users.
How can you efficiently handle the resources of your server, knowing that you are serving the highest number of requests as possible, without sacrificing security validations and handy development?

Enter Fastify. Fastify is a web framework highly focused on speed and low overhead. It is inspired from Hapi and Express and as far as we know, it is one of the fastest web frameworks in town.  
Use Fastify can increase your throughput up to 100%.

### Core features
- **100% asynchronous:** all the core is implemented with asynchronous code, in this way not even a millisecond is wasted.
- **Highly performant:** as far as we know, Fastify is one of the fastest web frameworks in town, depending on the code complexity we can serve up to 20000 request per second.
- **Extendible:** *coming soon...*
- **Schema based:** even if it is not mandatory we recommend to use [JSON Schema](http://json-schema.org/) to validate you routes and serialize your outputs, internally Fastify compiles the schema in an highly performant function.
- **Logging:** logs are extremely important but are costly; we choose the best logger to almost remove this cost, [Pino](https://github.com/pinojs/pino)!
- **Developer friendly:** the framework is built to be very expressive and help the developer in his daily use, without sacrificing performances and security.

### Benchmarks
- Hapi: 2200 req/sec
- Restify: 6133 req/sec
- Express: 8534 req/sec
- Koa: 9640 req/sec
- **Fastify: 20256 req/sec**

## Documentation
* <a href="https://github.com/fastify/fastify/blob/master/docs/Getting-Started.md"><code><b>Getting Started</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Routes.md"><code><b>Routes</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Logging.md"><code><b>Logging</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Middlewares.md"><code><b>Middlewares</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Hooks.md"><code><b>Hooks</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Validation-And-Serialize.md"><code><b>Validation and Serialize</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md"><code><b>Lifecycle</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Reply.md"><code><b>Reply</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Request.md"><code><b>Request</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Testing.md"><code><b>Testing</b></code></a>


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
