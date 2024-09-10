<div align="center"> <a href="https://fastify.dev/">
    <img
      src="https://github.com/fastify/graphics/raw/HEAD/fastify-landscape-outlined.svg"
      width="650"
      height="auto"
    />
  </a>
</div>

<div align="center">

[![CI](https://github.com/fastify/fastify/actions/workflows/ci.yml/badge.svg)](https://github.com/fastify/fastify/actions/workflows/ci.yml)
[![Package Manager
CI](https://github.com/fastify/fastify/workflows/package-manager-ci/badge.svg?branch=main)](https://github.com/fastify/fastify/actions/workflows/package-manager-ci.yml)
[![Web
SIte](https://github.com/fastify/fastify/workflows/website/badge.svg?branch=main)](https://github.com/fastify/fastify/actions/workflows/website.yml)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-brightgreen?style=flat)](https://github.com/neostandard/neostandard)
[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/7585/badge)](https://bestpractices.coreinfrastructure.org/projects/7585)

</div>

<div align="center">

[![NPM
version](https://img.shields.io/npm/v/fastify.svg?style=flat)](https://www.npmjs.com/package/fastify)
[![NPM
downloads](https://img.shields.io/npm/dm/fastify.svg?style=flat)](https://www.npmjs.com/package/fastify)
[![Security Responsible
Disclosure](https://img.shields.io/badge/Security-Responsible%20Disclosure-yellow.svg)](https://github.com/fastify/fastify/blob/main/SECURITY.md)
[![Discord](https://img.shields.io/discord/725613461949906985)](https://discord.gg/fastify)
[![Contribute with Gitpod](https://img.shields.io/badge/Contribute%20with-Gitpod-908a85?logo=gitpod&color=blue)](https://gitpod.io/#https://github.com/fastify/fastify)
![Open Collective backers and sponsors](https://img.shields.io/opencollective/all/fastify)

</div>

<br />

An efficient server implies a lower cost of the infrastructure, a better
responsiveness under load and happy users. How can you efficiently handle the
resources of your server, knowing that you are serving the highest number of
requests as possible, without sacrificing security validations and handy
development?

Enter Fastify. Fastify is a web framework highly focused on providing the best
developer experience with the least overhead and a powerful plugin architecture.
It is inspired by Hapi and Express and as far as we know, it is one of the
fastest web frameworks in town.

The `main` branch refers to the Fastify `v5` release, which is not released/LTS yet.
Check out the [`4.x` branch](https://github.com/fastify/fastify/tree/4.x) for `v4`.

### Table of Contents

 - [Quick start](#quick-start)
 - [Install](#install)
 - [Example](#example)
 - [Core features](#core-features)
 - [Benchmarks](#benchmarks)
 - [Documentation](#documentation)
 - [Ecosystem](#ecosystem)
 - [Support](#support)
 - [Team](#team)
 - [Hosted by](#hosted-by)
 - [License](#license)


### Quick start

Create a folder and make it your current working directory:

```sh
mkdir my-app
cd my-app
```

Generate a fastify project with `npm init`:

```sh
npm init fastify
```

Install dependencies:

```sh
npm i
```

To start the app in dev mode:

```sh
npm run dev
```

For production mode:

```sh
npm start
```

Under the hood `npm init` downloads and runs [Fastify
Create](https://github.com/fastify/create-fastify), which in turn uses the
generate functionality of [Fastify CLI](https://github.com/fastify/fastify-cli).


### Install

To install Fastify in an existing project as a dependency:

Install with npm:
```sh
npm i fastify
```
Install with yarn:
```sh
yarn add fastify
```

### Example

```js
// Require the framework and instantiate it

// ESM
import Fastify from 'fastify'

const fastify = Fastify({
  logger: true
})
// CommonJs
const fastify = require('fastify')({
  logger: true
})

// Declare a route
fastify.get('/', (request, reply) => {
  reply.send({ hello: 'world' })
})

// Run the server!
fastify.listen({ port: 3000 }, (err, address) => {
  if (err) throw err
  // Server is now listening on ${address}
})
```

with async-await:

```js
// ESM
import Fastify from 'fastify'

const fastify = Fastify({
  logger: true
})
// CommonJs
const fastify = require('fastify')({
  logger: true
})

fastify.get('/', async (request, reply) => {
  reply.type('application/json').code(200)
  return { hello: 'world' }
})

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) throw err
  // Server is now listening on ${address}
})
```

Do you want to know more? Head to the <a
href="./docs/Guides/Getting-Started.md"><code><b>Getting Started</b></code></a>.

> ## Note
> `.listen` binds to the local host, `localhost`, interface by default
> (`127.0.0.1` or `::1`, depending on the operating system configuration). If
> you are running Fastify in a container (Docker,
> [GCP](https://cloud.google.com/), etc.), you may need to bind to `0.0.0.0`. Be
> careful when deciding to listen on all interfaces; it comes with inherent
> [security
> risks](https://web.archive.org/web/20170711105010/https://snyk.io/blog/mongodb-hack-and-secure-defaults/).
> See [the documentation](./docs/Reference/Server.md#listen) for more
> information.

### Core features

- **Highly performant:** as far as we know, Fastify is one of the fastest web
  frameworks in town, depending on the code complexity we can serve up to 76+
  thousand requests per second.
- **Extensible:** Fastify is fully extensible via its hooks, plugins and
  decorators.
- **Schema based:** even if it is not mandatory we recommend to use [JSON
  Schema](https://json-schema.org/) to validate your routes and serialize your
  outputs, internally Fastify compiles the schema in a highly performant
  function.
- **Logging:** logs are extremely important but are costly; we chose the best
  logger to almost remove this cost, [Pino](https://github.com/pinojs/pino)!
- **Developer friendly:** the framework is built to be very expressive and help
  the developer in their daily use, without sacrificing performance and
  security.

### Benchmarks

__Machine:__ EX41S-SSD, Intel Core i7, 4Ghz, 64GB RAM, 4C/8T, SSD.

__Method:__: `autocannon -c 100 -d 40 -p 10 localhost:3000` * 2, taking the
second average

| Framework          | Version                    | Router?      |  Requests/sec |
| :----------------- | :------------------------- | :----------: | ------------: |
| Express            | 4.17.3                     | &#10003;     | 14,200        |
| hapi               | 20.2.1                     | &#10003;     | 42,284        |
| Restify            | 8.6.1                      | &#10003;     | 50,363        |
| Koa                | 2.13.0                     | &#10007;     | 54,272        |
| **Fastify**        | **4.0.0**                  | **&#10003;** | **77,193**    |
| -                  |                            |              |               |
| `http.Server`      | 16.14.2	                  | &#10007;     | 74,513        |

Benchmarks taken using https://github.com/fastify/benchmarks. This is a
synthetic, "hello world" benchmark that aims to evaluate the framework overhead.
The overhead that each framework has on your application depends on your
application, you should __always__ benchmark if performance matters to you.

## Documentation
* [__`Getting Started`__](./docs/Guides/Getting-Started.md)
* [__`Guides`__](./docs/Guides/Index.md)
* [__`Server`__](./docs/Reference/Server.md)
* [__`Routes`__](./docs/Reference/Routes.md)
* [__`Encapsulation`__](./docs/Reference/Encapsulation.md)
* [__`Logging`__](./docs/Reference/Logging.md)
* [__`Middleware`__](./docs/Reference/Middleware.md)
* [__`Hooks`__](./docs/Reference/Hooks.md)
* [__`Decorators`__](./docs/Reference/Decorators.md)
* [__`Validation and Serialization`__](./docs/Reference/Validation-and-Serialization.md)
* [__`Fluent Schema`__](./docs/Guides/Fluent-Schema.md)
* [__`Lifecycle`__](./docs/Reference/Lifecycle.md)
* [__`Reply`__](./docs/Reference/Reply.md)
* [__`Request`__](./docs/Reference/Request.md)
* [__`Errors`__](./docs/Reference/Errors.md)
* [__`Content Type Parser`__](./docs/Reference/ContentTypeParser.md)
* [__`Plugins`__](./docs/Reference/Plugins.md)
* [__`Testing`__](./docs/Guides/Testing.md)
* [__`Benchmarking`__](./docs/Guides/Benchmarking.md)
* [__`How to write a good plugin`__](./docs/Guides/Write-Plugin.md)
* [__`Plugins Guide`__](./docs/Guides/Plugins-Guide.md)
* [__`HTTP2`__](./docs/Reference/HTTP2.md)
* [__`Long Term Support`__](./docs/Reference/LTS.md)
* [__`TypeScript and types support`__](./docs/Reference/TypeScript.md)
* [__`Serverless`__](./docs/Guides/Serverless.md)
* [__`Recommendations`__](./docs/Guides/Recommendations.md)

中文文档[地址](https://github.com/fastify/docs-chinese/blob/HEAD/README.md)

## Ecosystem

- [Core](./docs/Guides/Ecosystem.md#core) - Core plugins maintained by the
  _Fastify_ [team](#team).
- [Community](./docs/Guides/Ecosystem.md#community) - Community supported
  plugins.
- [Live Examples](https://github.com/fastify/example) - Multirepo with a broad
  set of real working examples.
- [Discord](https://discord.gg/D3FZYPy) - Join our discord server and chat with
  the maintainers.

## Support
Please visit [Fastify help](https://github.com/fastify/help) to view prior
support issues and to ask new support questions.

## Contributing

Whether reporting bugs, discussing improvements and new ideas or writing code,
we welcome contributions from anyone and everyone. Please read the [CONTRIBUTING](./CONTRIBUTING.md)
guidelines before submitting pull requests.

## Team

_Fastify_ is the result of the work of a great community. Team members are
listed in alphabetical order.

**Lead Maintainers:**
* [__Matteo Collina__](https://github.com/mcollina),
  <https://twitter.com/matteocollina>, <https://www.npmjs.com/~matteo.collina>
* [__Tomas Della Vedova__](https://github.com/delvedor),
  <https://twitter.com/delvedor>, <https://www.npmjs.com/~delvedor>
* [__Manuel Spigolon__](https://github.com/eomm),
  <https://twitter.com/manueomm>, <https://www.npmjs.com/~eomm>
* [__James Sumners__](https://github.com/jsumners),
  <https://twitter.com/jsumners79>, <https://www.npmjs.com/~jsumners>

### Fastify Core team
* [__Tommaso Allevi__](https://github.com/allevo),
  <https://twitter.com/allevitommaso>, <https://www.npmjs.com/~allevo>
* [__Harry Brundage__](https://github.com/airhorns/),
  <https://twitter.com/harrybrundage>, <https://www.npmjs.com/~airhorns>
* [__David Mark Clements__](https://github.com/davidmarkclements),
  <https://twitter.com/davidmarkclem>,
  <https://www.npmjs.com/~davidmarkclements>
* [__Matteo Collina__](https://github.com/mcollina),
  <https://twitter.com/matteocollina>, <https://www.npmjs.com/~matteo.collina>
* [__Tomas Della Vedova__](https://github.com/delvedor),
  <https://twitter.com/delvedor>, <https://www.npmjs.com/~delvedor>
* [__Dustin Deus__](https://github.com/StarpTech),
  <https://twitter.com/dustindeus>, <https://www.npmjs.com/~starptech>
* [__Ayoub El Khattabi__](https://github.com/AyoubElk),
  <https://twitter.com/ayoubelkh>, <https://www.npmjs.com/~ayoubelk>
* [__Denis Fäcke__](https://github.com/SerayaEryn),
  <https://twitter.com/serayaeryn>, <https://www.npmjs.com/~serayaeryn>
* [__Carlos Fuentes__](https://github.com/metcoder95),
  <https://twitter.com/metcoder95>, <https://www.npmjs.com/~metcoder95>
* [__Vincent Le Goff__](https://github.com/zekth)
* [__Luciano Mammino__](https://github.com/lmammino),
  <https://twitter.com/loige>, <https://www.npmjs.com/~lmammino>
* [__Luis Orbaiceta__](https://github.com/luisorbaiceta),
  <https://twitter.com/luisorbai>, <https://www.npmjs.com/~luisorbaiceta>
* [__Maksim Sinik__](https://github.com/fox1t),
  <https://twitter.com/maksimsinik>, <https://www.npmjs.com/~fox1t>
* [__Manuel Spigolon__](https://github.com/eomm),
  <https://twitter.com/manueomm>, <https://www.npmjs.com/~eomm>
* [__James Sumners__](https://github.com/jsumners),
  <https://twitter.com/jsumners79>, <https://www.npmjs.com/~jsumners>
* [__Aras Abbasi__](https://github.com/uzlopak),
  <https://www.npmjs.com/~uzlopak>
* [__Gürgün Dayıoğlu__](https://github.com/gurgunday),
  <https://www.npmjs.com/~gurgunday>

### Fastify Plugins team
* [__Matteo Collina__](https://github.com/mcollina),
  <https://twitter.com/matteocollina>, <https://www.npmjs.com/~matteo.collina>
* [__Harry Brundage__](https://github.com/airhorns/),
  <https://twitter.com/harrybrundage>, <https://www.npmjs.com/~airhorns>
* [__Tomas Della Vedova__](https://github.com/delvedor),
  <https://twitter.com/delvedor>, <https://www.npmjs.com/~delvedor>
* [__Ayoub El Khattabi__](https://github.com/AyoubElk),
  <https://twitter.com/ayoubelkh>, <https://www.npmjs.com/~ayoubelk>
* [__Carlos Fuentes__](https://github.com/metcoder95),
  <https://twitter.com/metcoder95>, <https://www.npmjs.com/~metcoder95>
* [__Vincent Le Goff__](https://github.com/zekth)
* [__Salman Mitha__](https://github.com/salmanm),
  <https://www.npmjs.com/~salmanm>
* [__Maksim Sinik__](https://github.com/fox1t),
  <https://twitter.com/maksimsinik>, <https://www.npmjs.com/~fox1t>
* [__Frazer Smith__](https://github.com/Fdawgs), <https://www.npmjs.com/~fdawgs>
* [__Manuel Spigolon__](https://github.com/eomm),
  <https://twitter.com/manueomm>, <https://www.npmjs.com/~eomm>
* [__Simone Busoli__](https://github.com/simoneb),
  <https://twitter.com/simonebu>, <https://www.npmjs.com/~simoneb>
* [__Gürgün Dayıoğlu__](https://github.com/gurgunday),
  <https://www.npmjs.com/~gurgunday>
* [__Dan Castillo__](https://github.com/dancastillo),
  <https://www.npmjs.com/~dancastillo>
* [__Jean Michelet__](https://github.com/jean-michelet),
  <https://www.npmjs.com/~jean-michelet>

### Great Contributors
Great contributors on a specific area in the Fastify ecosystem will be invited
to join this group by Lead Maintainers.

* [__dalisoft__](https://github.com/dalisoft), <https://twitter.com/dalisoft>,
  <https://www.npmjs.com/~dalisoft>
* [__Luciano Mammino__](https://github.com/lmammino),
  <https://twitter.com/loige>, <https://www.npmjs.com/~lmammino>
* [__Evan Shortiss__](https://github.com/evanshortiss),
  <https://twitter.com/evanshortiss>, <https://www.npmjs.com/~evanshortiss>

**Past Collaborators**
* [__Çağatay Çalı__](https://github.com/cagataycali),
  <https://twitter.com/cagataycali>, <https://www.npmjs.com/~cagataycali>
* [__Trivikram Kamat__](https://github.com/trivikr),
  <https://twitter.com/trivikram>, <https://www.npmjs.com/~trivikr>
* [__Cemre Mengu__](https://github.com/cemremengu),
  <https://twitter.com/cemremengu>, <https://www.npmjs.com/~cemremengu>
* [__Nathan Woltman__](https://github.com/nwoltman),
  <https://twitter.com/NathanWoltman>, <https://www.npmjs.com/~nwoltman>
* [__Ethan Arrowood__](https://github.com/Ethan-Arrowood/),
  <https://twitter.com/arrowoodtech>, <https://www.npmjs.com/~ethan_arrowood>
* [__Rafael Gonzaga__](https://github.com/rafaelgss),
  <https://twitter.com/_rafaelgss>, <https://www.npmjs.com/~rafaelgss>

## Hosted by

[<img
src="https://github.com/openjs-foundation/artwork/blob/main/openjs_foundation/openjs_foundation-logo-horizontal-color.png?raw=true"
width="250px;"/>](https://openjsf.org/projects)

We are a [At-Large
Project](https://github.com/openjs-foundation/cross-project-council/blob/HEAD/PROJECT_PROGRESSION.md#at-large-projects)
in the [OpenJS Foundation](https://openjsf.org/).

## Sponsors

Support this project by becoming a [SPONSOR](./SPONSORS.md)!
Fastify has an [Open Collective](https://opencollective.com/fastify)
page where we accept and manage financial contributions.

## Acknowledgements

This project is kindly sponsored by:
- [NearForm](https://nearform.com)
- [Platformatic](https://platformatic.dev)

Past Sponsors:
- [LetzDoIt](https://www.letzdoitapp.com/)

This list includes all companies that support one or more of the team members
in the maintenance of this project.

## License

Licensed under [MIT](./LICENSE).

For your convenience, here is a list of all the licenses of our production
dependencies:
- MIT
- ISC
- BSD-3-Clause
- BSD-2-Clause
