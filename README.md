<div align="center">
<img src="https://github.com/fastify/graphics/raw/master/full-logo.png" width="650" height="auto"/>
</div>

<div align="center">

[![Build Status](https://travis-ci.org/fastify/fastify.svg?branch=master)](https://travis-ci.org/fastify/fastify)
[![Build status](https://ci.appveyor.com/api/projects/status/xduljw5nsu1ya72x/branch/master?svg=true)](https://ci.appveyor.com/project/mcollina/fastify/branch/master)
[![Coverage Status](https://coveralls.io/repos/github/fastify/fastify/badge.svg?branch=master)](https://coveralls.io/github/fastify/fastify?branch=master)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)

</div>

<div align="center">

[![NPM version](https://img.shields.io/npm/v/fastify.svg?style=flat)](https://www.npmjs.com/package/fastify)
[![NPM downloads](https://img.shields.io/npm/dm/fastify.svg?style=flat)](https://www.npmjs.com/package/fastify) [![Gitter](https://badges.gitter.im/gitterHQ/gitter.svg)](https://gitter.im/fastify)
[![Security Responsible
Disclosure](https://img.shields.io/badge/Security-Responsible%20Disclosure-yellow.svg)](https://github.com/nodejs/security-wg/blob/master/processes/responsible_disclosure_template.md)

</div>

<br />

An efficient server implies a lower cost of the infrastructure, a better responsiveness under load and happy users.
How can you efficiently handle the resources of your server, knowing that you are serving the highest number of requests as possible, without sacrificing security validations and handy development?

Enter Fastify. Fastify is a web framework highly focused on providing the best developer experience with the least overhead and a powerful plugin architecture. It is inspired by Hapi and Express and as far as we know, it is one of the fastest web frameworks in town.

### Install

```
npm i fastify --save
```

### Example

```js
// Require the framework and instantiate it
const fastify = require('fastify')({
  logger: true
})

// Declare a route
fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
})

// Run the server!
fastify.listen(3000, (err, address) => {
  if (err) throw err
  fastify.log.info(`server listening on ${address}`)
})
```

with async-await:

```js
const fastify = require('fastify')({
  logger: true
})

fastify.get('/', async (request, reply) => {
  reply.type('application/json').code(200)
  return { hello: 'world' }
})

fastify.listen(3000, (err, address) => {
  if (err) throw err
  fastify.log.info(`server listening on ${address}`)
})
```

Do you want to know more? Head to the <a href="https://github.com/fastify/fastify/blob/master/docs/Getting-Started.md"><code><b>Getting Started</b></code></a>.

### Quick start with Fastify CLI

Good tools make API development quicker and easier to maintain than doing everything manually.

The [Fastify CLI](https://github.com/fastify/fastify-cli) is a command line interface tool that can create new projects, manage plugins, and perform a variety of development tasks testing and running the application.

The goal in this guide is to build and run a simple Fastify project, using the [Fastify CLI](https://github.com/fastify/fastify-cli), while adhering to the Style Guide recommendations that benefit every Fastify project.

### Example

Open a terminal window.

```
npm install fastify-cli --global
```

Generate a new project and default app by running the following command:

```
fastify generate
```

For more information, see the [Fastify CLI documentation](https://github.com/fastify/fastify-cli).

#### Note

`.listen` binds to the local host, `localhost`, interface by default (`127.0.0.1` or `::1`, depending on the operating system configuration).
See [the documentation](https://github.com/fastify/fastify/blob/master/docs/Server-Methods.md#listen) for more information.

### Core features

- **Highly performant:** as far as we know, Fastify is one of the fastest web frameworks in town, depending on the code complexity we can serve up to 30 thousand requests per second.
- **Extendible:** Fastify is fully extensible via its hooks, plugins and decorators.
- **Schema based:** even if it is not mandatory we recommend to use [JSON Schema](http://json-schema.org/) to validate your routes and serialize your outputs, internally Fastify compiles the schema in a highly performant function.
- **Logging:** logs are extremely important but are costly; we chose the best logger to almost remove this cost, [Pino](https://github.com/pinojs/pino)!
- **Developer friendly:** the framework is built to be very expressive and help the developer in their daily use, without sacrificing performance and security.

### Benchmarks

__Machine:__ Intel Xeon E5-2686 v4 @ 2.30GHz (4 cores, 8 threads), 16GiB RAM (Amazon EC2 m4.xlarge)

__Method:__: `autocannon -c 100 -d 40 -p 10 localhost:3000` * 2, taking the second average

| Framework          | Version                    | Router?      |  Requests/sec |
| :----------------- | :------------------------- | :----------: | ------------: |
| hapi               | 17.5.1                     | &#10003;     | 22,139        |
| Express            | 4.16.3                     | &#10003;     | 22,265        |
| Restify            | 7.1.0                      | &#10003;     | 23,604        |
| Koa                | 2.5.1                      | &#10007;     | 25,378        |
| **Fastify**        | **1.6.0**                  | **&#10003;** | **37,433**    |
| -                  |                            |              |               |
| `http.Server`      | 8.11.2                      | &#10007;     | 29,855\*     |

Benchmarks taken using https://github.com/fastify/benchmarks. This is a
synthetic, "hello world" benchmark that aims to evaluate the framework
overhead. The overhead that each framework has on your application
depends on your application, you should __always__ benchmark if performance
matters to you.

\* Node.js core is slower than Fastify because of https://github.com/nodejs/node/issues/20798. The problem has already been solved in Node.js 10.

## Documentation
* <a href="https://github.com/fastify/fastify/blob/master/docs/Getting-Started.md"><code><b>Getting Started</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Server.md"><code><b>Server</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Routes.md"><code><b>Routes</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Logging.md"><code><b>Logging</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Middlewares.md"><code><b>Middlewares</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Hooks.md"><code><b>Hooks</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Decorators.md"><code><b>Decorators</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Validation-and-Serialization.md"><code><b>Validation and Serialization</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Lifecycle.md"><code><b>Lifecycle</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Reply.md"><code><b>Reply</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Request.md"><code><b>Request</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/ContentTypeParser.md"><code><b>Content Type Parser</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Plugins.md"><code><b>Plugins</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Testing.md"><code><b>Testing</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Benchmarking.md"><code><b>Benchmarking</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Write-Plugin.md"><code><b>How to write a good plugin</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/Plugins-Guide.md"><code><b>Plugins Guide</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/HTTP2.md"><code><b>HTTP2</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/LTS.md"><code><b>Long Term Support</b></code></a>
* <a href="https://github.com/fastify/fastify/blob/master/docs/TypeScript.md"><code><b>TypeScript and types support</b></code></a>

中文文档[地址](https://github.com/fastify/docs-chinese/blob/master/README.md)

## Ecosystem
- [Core](https://github.com/fastify/fastify/blob/master/docs/Ecosystem.md#core) - Core plugins maintained by the _Fastify_ [team](#team).
- [Community](https://github.com/fastify/fastify/blob/master/docs/Ecosystem.md#community) - Community supported plugins.

## Support
- [Fastify help](https://github.com/fastify/help)
- [Gitter Chat](https://gitter.im/fastify)

## Team

_Fastify_ is the result of the work of a great community.
Team members are listed in alphabetical order.

### Lead Maintainers

* [__Matteo Collina__](https://github.com/mcollina), <https://twitter.com/matteocollina>, <https://www.npmjs.com/~matteo.collina>
* [__Tomas Della Vedova__](https://github.com/delvedor), <https://twitter.com/delvedor>, <https://www.npmjs.com/~delvedor>

### Collaborators

* [__Tommaso Allevi__](https://github.com/allevo), <https://twitter.com/allevitommaso>, <https://www.npmjs.com/~allevo>
* [__Çağatay Çalı__](https://github.com/cagataycali), <https://twitter.com/cagataycali>, <https://www.npmjs.com/~cagataycali>
* [__Dustin Deus__](https://github.com/StarpTech), <https://twitter.com/dustindeus>, <https://www.npmjs.com/~starptech>
* [__Trivikram Kamat__](https://github.com/trivikr), <https://twitter.com/trivikram>, <https://www.npmjs.com/~trivikr>
* [__Luciano Mammino__](https://github.com/lmammino), <https://twitter.com/loige>, <https://www.npmjs.com/~lmammino>
* [__Evan Shortiss__](https://github.com/evanshortiss), <https://twitter.com/evanshortiss>, <https://www.npmjs.com/~evanshortiss>
* [__James Sumners__](https://github.com/jsumners), <https://twitter.com/jsumners79>, <https://www.npmjs.com/~jsumners>
* [__Nathan Woltman__](https://github.com/nwoltman), <https://twitter.com/NathanWoltman>, <https://www.npmjs.com/~nwoltman>

## Acknowledgements

This project is kindly sponsored by:
- [nearForm](http://nearform.com)
- [LetzDoIt](http://www.letzdoitapp.com/)

## License

Licensed under [MIT](./LICENSE).
