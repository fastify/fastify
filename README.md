<div align="center"> <a href="https://fastify.dev/">
    <img
      src="https://raw.githubusercontent.com/fastify/graphics/HEAD/fastify-landscape-outlined.svg"
      width="650"
      height="auto"
    />
  </a>
</div>

<div align="center">

[![CI](https://github.com/fastify/fastify/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fastify/fastify/actions/workflows/ci.yml)
[![Package Manager
CI](https://github.com/fastify/fastify/actions/workflows/package-manager-ci.yml/badge.svg?branch=main)](https://github.com/fastify/fastify/actions/workflows/package-manager-ci.yml)
[![Web
site](https://github.com/fastify/fastify/actions/workflows/website.yml/badge.svg?branch=main)](https://github.com/fastify/fastify/actions/workflows/website.yml)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-brightgreen?style=flat)](https://github.com/neostandard/neostandard)
[![CII Best Practices](https://www.bestpractices.dev/projects/7585/badge)](https://www.bestpractices.dev/en/projects/7585/passing)

</div>

<div align="center">

[![NPM
version](https://img.shields.io/npm/v/fastify.svg?style=flat)](https://www.npmjs.com/package/fastify)
[![NPM
downloads](https://img.shields.io/npm/dm/fastify.svg?style=flat)](https://www.npmjs.com/package/fastify)
[![Security Responsible
Disclosure](https://img.shields.io/badge/Security-Responsible%20Disclosure-yellow.svg)](https://github.com/fastify/fastify/blob/main/SECURITY.md)
[![Discord](https://img.shields.io/discord/725613461949906985)](https://discord.com/invite/fastify)
[![Contribute with Gitpod](https://img.shields.io/badge/Contribute%20with-Gitpod-908a85?logo=gitpod&color=blue)](https://gitpod.io/#https://github.com/fastify/fastify)
[![Open Collective backers and sponsors](https://img.shields.io/opencollective/all/fastify)](https://github.com/sponsors/fastify#sponsors)

</div>

<br />

An efficient server implies a lower cost of the infrastructure, better
responsiveness under load, and happy users. How can you efficiently handle the
resources of your server, knowing that you are serving the highest number of
requests possible, without sacrificing security validations and handy
development?

Enter Fastify. Fastify is a web framework highly focused on providing the best
developer experience with the least overhead and a powerful plugin architecture.
It is inspired by Hapi and Express and as far as we know, it is one of the
fastest web frameworks in town.

The `main` branch refers to the Fastify `v6` release.
Check out the [`5.x` branch](https://github.com/fastify/fastify/tree/5.x) for `v5`.

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

Generate a Fastify project with `npm init`:

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

```sh
npm i fastify
```

### Example

```js
// Require the framework and instantiate it

// ESM
import Fastify from 'fastify'

const fastify = Fastify({
  logger: true
})
// CommonJS
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

With async-await:

```js
// ESM
import Fastify from 'fastify'

const fastify = Fastify({
  logger: true
})
// CommonJS
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
If you learn best by reading code, explore the official [demo](https://github.com/fastify/demo).

> ## Note
> `.listen` binds to the local host, `localhost`, interface by default
> (`127.0.0.1` or `::1`, depending on the operating system configuration). If
> you are running Fastify in a container (Docker,
> [GCP](https://cloud.google.com/), etc.), you may need to bind to `0.0.0.0`. Be
> careful when listening on all interfaces; it comes with inherent
> [security
> risks](https://web.archive.org/web/20170711105010/https://snyk.io/blog/mongodb-hack-and-secure-defaults/).
> See [the documentation](./docs/Reference/Server.md#listen) for more
> information.

### Core features

- **Highly performant:** as far as we know, Fastify is one of the fastest web
  frameworks in town, depending on the code complexity we can serve more than 76
  thousand requests per second.
- **Extensible:** Fastify is fully extensible via its hooks, plugins, and
  decorators.
- **Schema-based:** even if it is not mandatory we recommend using [JSON
  Schema](https://json-schema.org/) to validate your routes and serialize your
  outputs. Internally Fastify compiles the schema in a highly performant
  function.
- **Logging:** logs are extremely important, but are costly; we chose the best
  logger to almost remove this cost, [Pino](https://github.com/pinojs/pino)!
- **Developer friendly:** the framework is built to be very expressive and help
  developers in their daily use without sacrificing performance and
  security.

### Benchmarks

__Machine:__ EX41S-SSD, Intel Core i7, 4Ghz, 64GB RAM, 4C/8T, SSD.

__Method__: `autocannon -c 100 -d 40 -p 10 localhost:3000` * 2, taking the
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

These benchmarks were taken using https://github.com/fastify/benchmarks. This is
a synthetic "hello world" benchmark that aims to evaluate the framework overhead.
The overhead that each framework has on your application depends on your
application. You should __always__ benchmark if performance matters to you.

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

## Ecosystem

- [Core](./docs/Guides/Ecosystem.md#core) - Core plugins maintained by the
  _Fastify_ [team](#team).
- [Community](./docs/Guides/Ecosystem.md#community) - Community-supported
  plugins.
- [Live Examples](https://github.com/fastify/example) - Multirepo with a broad
  set of real working examples.
- [Discord](https://discord.com/invite/D3FZYPy) - Join our discord server and
  chat with the maintainers.

## Support
Please visit [Fastify help](https://github.com/fastify/help) to view prior
support issues and to ask new support questions.

Version 3 of Fastify and lower are EOL and will not receive any security or bug
fixes.

Fastify's partner, HeroDevs, provides commercial security fixes for all
unsupported versions at [https://herodevs.com/support/fastify-nes][hd-link].
Fastify's supported version matrix is available in the
[Long Term Support][lts-link] documentation.

## Contributing

Whether reporting bugs, discussing improvements and new ideas, or writing code,
we welcome contributions from anyone and everyone. Please read the [CONTRIBUTING](./CONTRIBUTING.md)
guidelines before submitting pull requests.

## Team

_Fastify_ is the result of the work of a great community. Team members are
listed in alphabetical order.

**Lead Maintainers:**
* [__Matteo Collina__](https://github.com/mcollina),
  <https://x.com/matteocollina>, <https://www.npmjs.com/~matteo.collina>
* [__Tomas Della Vedova__](https://github.com/delvedor),
  <https://x.com/delvedor>, <https://www.npmjs.com/~delvedor>
* [__KaKa Ng__](https://github.com/climba03003),
  <https://www.npmjs.com/~climba03003>
* [__Manuel Spigolon__](https://github.com/eomm),
  <https://x.com/manueomm>, <https://www.npmjs.com/~eomm>
* [__James Sumners__](https://github.com/jsumners),
  <https://x.com/jsumners79>, <https://www.npmjs.com/~jsumners>

### Fastify Core team
* [__Aras Abbasi__](https://github.com/uzlopak),
  <https://www.npmjs.com/~uzlopak>
* [__Harry Brundage__](https://github.com/airhorns/),
  <https://x.com/harrybrundage>, <https://www.npmjs.com/~airhorns>
* [__Matteo Collina__](https://github.com/mcollina),
  <https://x.com/matteocollina>, <https://www.npmjs.com/~matteo.collina>
* [__Gürgün Dayıoğlu__](https://github.com/gurgunday),
  <https://www.npmjs.com/~gurgunday>
* [__Tomas Della Vedova__](https://github.com/delvedor),
  <https://x.com/delvedor>, <https://www.npmjs.com/~delvedor>
* [__Carlos Fuentes__](https://github.com/metcoder95),
  <https://x.com/metcoder95>, <https://www.npmjs.com/~metcoder95>
* [__Vincent Le Goff__](https://github.com/zekth)
* [__Luciano Mammino__](https://github.com/lmammino),
  <https://x.com/loige>, <https://www.npmjs.com/~lmammino>
* [__Jean Michelet__](https://github.com/jean-michelet),
  <https://www.npmjs.com/~jean-michelet>
* [__KaKa Ng__](https://github.com/climba03003),
  <https://www.npmjs.com/~climba03003>
* [__Luis Orbaiceta__](https://github.com/luisorbaiceta),
  <https://www.npmjs.com/~luisorbaiceta>
* [__Maksim Sinik__](https://github.com/fox1t),
  <https://x.com/maksimsinik>, <https://www.npmjs.com/~fox1t>
* [__Manuel Spigolon__](https://github.com/eomm),
  <https://x.com/manueomm>, <https://www.npmjs.com/~eomm>
* [__James Sumners__](https://github.com/jsumners),
  <https://x.com/jsumners79>, <https://www.npmjs.com/~jsumners>

### Fastify Plugins team
* [__Harry Brundage__](https://github.com/airhorns/),
  <https://x.com/harrybrundage>, <https://www.npmjs.com/~airhorns>
* [__Simone Busoli__](https://github.com/simoneb),
  <https://x.com/simonebu>, <https://www.npmjs.com/~simoneb>
* [__Dan Castillo__](https://github.com/dancastillo),
  <https://www.npmjs.com/~dancastillo>
* [__Matteo Collina__](https://github.com/mcollina),
  <https://x.com/matteocollina>, <https://www.npmjs.com/~matteo.collina>
* [__Gürgün Dayıoğlu__](https://github.com/gurgunday),
  <https://www.npmjs.com/~gurgunday>
* [__Tomas Della Vedova__](https://github.com/delvedor),
  <https://x.com/delvedor>, <https://www.npmjs.com/~delvedor>
* [__Carlos Fuentes__](https://github.com/metcoder95),
  <https://x.com/metcoder95>, <https://www.npmjs.com/~metcoder95>
* [__Vincent Le Goff__](https://github.com/zekth)
* [__Jean Michelet__](https://github.com/jean-michelet),
  <https://www.npmjs.com/~jean-michelet>
* [__KaKa Ng__](https://github.com/climba03003),
  <https://www.npmjs.com/~climba03003>
* [__Maksim Sinik__](https://github.com/fox1t),
  <https://x.com/maksimsinik>, <https://www.npmjs.com/~fox1t>
* [__Frazer Smith__](https://github.com/Fdawgs), <https://www.npmjs.com/~fdawgs>
* [__Manuel Spigolon__](https://github.com/eomm),
  <https://x.com/manueomm>, <https://www.npmjs.com/~eomm>
* [__Antonio Tripodi__](https://github.com/Tony133), <https://www.npmjs.com/~tony133>

### Emeritus Contributors
Great contributors to a specific area of the Fastify ecosystem will be invited
to join this group by Lead Maintainers when they decide to step down from the
active contributor's group.

* [__Tommaso Allevi__](https://github.com/allevo),
  <https://x.com/allevitommaso>, <https://www.npmjs.com/~allevo>
* [__Ethan Arrowood__](https://github.com/Ethan-Arrowood/),
  <https://x.com/arrowoodtech>, <https://www.npmjs.com/~ethan_arrowood>
* [__Çağatay Çalı__](https://github.com/cagataycali),
  <https://x.com/cagataycali>, <https://www.npmjs.com/~cagataycali>
* [__David Mark Clements__](https://github.com/davidmarkclements),
  <https://x.com/davidmarkclem>,
  <https://www.npmjs.com/~davidmarkclements>
* [__dalisoft__](https://github.com/dalisoft), <https://x.com/dalisoft>,
  <https://www.npmjs.com/~dalisoft>
* [__Dustin Deus__](https://github.com/StarpTech),
  <https://x.com/dustindeus>, <https://www.npmjs.com/~starptech>
* [__Denis Fäcke__](https://github.com/SerayaEryn),
  <https://x.com/serayaeryn>, <https://www.npmjs.com/~serayaeryn>
* [__Rafael Gonzaga__](https://github.com/rafaelgss),
  <https://x.com/_rafaelgss>, <https://www.npmjs.com/~rafaelgss>
* [__Trivikram Kamat__](https://github.com/trivikr),
  <https://x.com/trivikram>, <https://www.npmjs.com/~trivikr>
* [__Ayoub El Khattabi__](https://github.com/AyoubElk),
  <https://x.com/ayoubelkh>, <https://www.npmjs.com/~ayoubelk>
* [__Cemre Mengu__](https://github.com/cemremengu),
  <https://x.com/cemremengu>, <https://www.npmjs.com/~cemremengu>
* [__Salman Mitha__](https://github.com/salmanm),
  <https://www.npmjs.com/~salmanm>
* [__Nathan Woltman__](https://github.com/nwoltman),
  <https://x.com/NathanWoltman>, <https://www.npmjs.com/~nwoltman>

## Hosted by

[<img
src="https://raw.githubusercontent.com/openjs-foundation/artwork/main/openjs_foundation/openjs_foundation-logo-horizontal-color.png"
width="250px;"/>](https://openjsf.org/projects)

We are an [At-Large
Project](https://github.com/openjs-foundation/cross-project-council/blob/HEAD/PROJECT_PROGRESSION.md#at-large-projects)
in the [OpenJS Foundation](https://openjsf.org/).

## Sponsors

Support this project by becoming a [SPONSOR](./SPONSORS.md)!
Fastify has an [Open Collective](https://opencollective.com/fastify)
page where we accept and manage financial contributions.

## Acknowledgments

This project is kindly sponsored by:
- [NearForm](https://nearform.com)
- [Platformatic](https://platformatic.dev)

This list includes all companies that support one or more team members
in maintaining this project.

## License

Licensed under [MIT](./LICENSE).

For your convenience, here is a list of all the licenses of our production
dependencies:
- MIT
- ISC
- BSD-3-Clause
- BSD-2-Clause

[hd-link]: https://www.herodevs.com/support/fastify-nes?utm_source=fastify&utm_medium=link&utm_campaign=github_readme
[lts-link]: https://fastify.dev/docs/latest/Reference/LTS/


## 🌐 Web Resources & Interactive Index
- [CATEGORY 2D1 060](https://quizverses.pages.dev/category-2d1-060.html)
- [FLY AND SHOOT 1 ITALIAN BOSSES](https://studyquests.pages.dev/fly-and-shoot-1-italian-bosses.html)
- [FOOTBALL FUN](https://skillplay.github.io/football-fun.html)
- [GIFT MERGE SANTA WORLD TOUR](https://learnquester.github.io/gift-merge-santa-world-tour.html)
- [FAMILY TREE EMOJI](https://studyquesthub.web.app/family-tree-emoji.html)
- [HALLOWEEN CHALLENGE](https://studyquests.pages.dev/halloween-challenge.html)
- [FOOTBALL LEGENDS 2026](https://iskillquest.pages.dev/football-legends-2026.html)
- [STICKMAN ARCHERO FIGHT STICK SHADOW FIGHT WAR](https://studyplayings.pages.dev/stickman-archero-fight-stick-shadow-fight-war.html)
- [CATEGORY CONTROLLER59](https://studyplayings.web.app/category-controller59.html)
- [CATEGORY 2D1 060](https://iskillquest.pages.dev/category-2d1-060.html)
- [CATEGORY CASUAL 4](https://iskillquest.pages.dev/category-casual-4.html)
- [CATEGORY SHOOTER](https://themindzone.pages.dev/category-shooter.html)
- [SUGAR HEROES](https://studyquests.pages.dev/sugar-heroes.html)
- [MERMAIDCORE AESTHETICS](https://studyquests.pages.dev/mermaidcore-aesthetics.html)
- [PIPE CONNECT](https://iskillquest.pages.dev/pipe-connect.html)
- [CATEGORY AGILITY 2](https://studyplayings.web.app/category-agility-2.html)
- [2 3 4 PLAYER GAMES](https://themindzone.pages.dev/2-3-4-player-games.html)
- [MEMORY WARS](https://themindzone.pages.dev/memory-wars.html)
- [IDLE BARBER SHOP](https://studyquesthub.web.app/idle-barber-shop.html)
- [COOKING WORLD REBORN](https://studyplayings.web.app/cooking-world-reborn.html)
- [VEGA MIX SEA ADVENTURES](https://theskillquest.pages.dev/vega-mix-sea-adventures.html)
- [LOL FUNNY DANCE](https://studyplaying.github.io/lol-funny-dance.html)
- [HEADLEG DASH PARKOUR](https://studyquests.pages.dev/headleg-dash-parkour.html)
- [KNIFEIO](https://studyquests.pages.dev/knifeio.html)
- [CATEGORY BIKE](https://iskillquest.pages.dev/category-bike.html)
- [CODE MAZE](https://thequizzone.pages.dev/code-maze.html)
- [LABUBU AND ME](https://studyquests.pages.dev/labubu-and-me.html)
- [TOILET PIN](https://studyplayings.web.app/toilet-pin.html)
- [IDLE FOOTBALL MANAGER](https://themindzone.pages.dev/idle-football-manager.html)
- [PIXEL BLAST](https://studyplayings.web.app/pixel-blast.html)
- [FLIP IT 3D](https://studyplaying.github.io/flip-it-3d.html)
- [STEALTH MASTER SNEAK CAT](https://studyquesthub.web.app/stealth-master-sneak-cat.html)
- [TRAIN DRIFT](https://thequizzone.pages.dev/train-drift.html)
- [ROBBOTTO](https://thequizzone.pages.dev/robbotto.html)
- [NIGHT CLUB SECURITY](https://iskillquest.pages.dev/night-club-security.html)
- [DOLPHIN COUPLE UNDERWATER DRESS UP](https://theskillquest.pages.dev/dolphin-couple-underwater-dress-up.html)
- [DALGONA MASTER](https://studyquests.pages.dev/dalgona-master.html)
- [KINGDOM WARS TD](https://thelearnquesters.pages.dev/kingdom-wars-td.html)
- [CONQUERIO](https://thequizzone.pages.dev/conquerio.html)
- [MAZE CUBE 2048](https://thequizzone.pages.dev/maze-cube-2048.html)
- [CAR PAINT](https://theskillquest.pages.dev/car-paint.html)
- [TAP BEAD](https://studyplayings.web.app/tap-bead.html)
- [US ARMY CAR GAMES TRUCK DRIVING](https://thelearnquesters.pages.dev/us-army-car-games-truck-driving.html)
- [NITRO SPEED 2 UNDERGROUND](https://thequizzone.pages.dev/nitro-speed-2-underground.html)
- [MAGIC TRI PEAKS SOLITAIRE](https://thequizzone.pages.dev/magic-tri-peaks-solitaire.html)
- [SUPERHERO DROP AND SAVE](https://thelearnquesters.pages.dev/superhero-drop-and-save.html)
- [VEX 9](https://studyplayings.web.app/vex-9.html)
- [NEKOS ADVENTURE](https://studyplayings.web.app/nekos-adventure.html)
- [CATEGORY QUIZ](https://thequizzone.pages.dev/category-quiz.html)
- [TANGLE MASTER 3D](https://thequizzone.pages.dev/tangle-master-3d.html)
- [ANNOYING BOSS PUNCH GAME](https://studyquesthub.web.app/annoying-boss-punch-game.html)
- [CATEGORY BATTLESHIP19](https://studyquests.pages.dev/category-battleship19.html)
- [STICK NINJA SURVIVAL](https://studyplaying.github.io/stick-ninja-survival.html)
- [COLOR BLOCK BLAST 3](https://theskillquest.pages.dev/color-block-blast-3.html)
- [BLOX FRUITS](https://thelearnquesters.pages.dev/blox-fruits.html)
- [CATEGORY TRAIN YOUR BRAIN24](https://studyplayings.pages.dev/category-train-your-brain24.html)
- [STAR ATTACK 3D](https://studyquesthub.web.app/star-attack-3d.html)
- [CATEGORY RESTAURANT64](https://studyplayings.pages.dev/category-restaurant64.html)
- [DREAMY HOME](https://studyplaying.github.io/dreamy-home.html)
- [BOMBER FRIENDS](https://thelearnquesters.pages.dev/bomber-friends.html)
- [SLITHERCRAFT IO](https://studyplayings.pages.dev/slithercraft-io.html)
- [FOOTBALL FUN](https://studyquests.pages.dev/football-fun.html)
- [DESTRUCTION SIMULATOR](https://studyquests.pages.dev/destruction-simulator.html)
- [CATEGORY HORROR](https://studyplayings.web.app/category-horror.html)
- [HIGHSCHOOL MEAN GIRLS 3](https://thequizzone.pages.dev/highschool-mean-girls-3.html)
- [SHADOWMAN RUNNER](https://studyplaying.github.io/shadowman-runner.html)
- [GYM SIMULATOR TYCOON](https://thequizzone.pages.dev/gym-simulator-tycoon.html)
- [SNAKE PUZZLE ESCAPE](https://thequizzone.pages.dev/snake-puzzle-escape.html)
- [CATEGORY COOKING](https://iskillquest.pages.dev/category-cooking.html)
- [CATEGORY BUILDING182](https://iskillquest.pages.dev/category-building182.html)
- [GOTHIC KNIFE](https://studyquests.pages.dev/gothic-knife.html)
- [CUNNING GINGER](https://theskillquest.pages.dev/cunning-ginger.html)
- [CATEGORY SHOOTER](https://thequizzone.pages.dev/category-shooter.html)
- [CATEGORY TURN BASED30](https://theskillquest.pages.dev/category-turn-based30.html)
- [CATEGORY CLASSIC98](https://studyplayings.web.app/category-classic98.html)
- [CATEGORY TOWER DEFENSE 2](https://thequizzone.pages.dev/category-tower-defense-2.html)
- [DREAM RESTAURANT 3D](https://theskillquest.pages.dev/dream-restaurant-3d.html)
- [MERGE HOME MANIA](https://theskillquest.pages.dev/merge-home-mania.html)
- [CATEGORY TOWER DEFENSE GAME](https://themindzone.pages.dev/category-tower-defense-game.html)
- [CATEGORY IDLE445](https://iskillquest.pages.dev/category-idle445.html)
- [CATEGORY SIMULATION 5](https://theskillquest.pages.dev/category-simulation-5.html)
- [CATEGORY DRESS UP](https://iskillquest.pages.dev/category-dress-up.html)
- [TIMEWARRIORS](https://studyquesthub.web.app/timewarriors.html)
- [CATEGORY CASUAL 7](https://studyquests.pages.dev/category-casual-7.html)
- [ZIP ZAP](https://studyquesthub.web.app/zip-zap.html)
- [DRAW TO SMASH ZOMBIE](https://studyplaying.github.io/draw-to-smash-zombie.html)
- [CATEGORY PROXY](https://thequizzone.pages.dev/category-proxy.html)
- [CATEGORY RACING DRIVING 2](https://thequizzone.pages.dev/category-racing-driving-2.html)
- [FILL THE BOTTLE](https://studyplayings.pages.dev/fill-the-bottle.html)
- [CATEGORY GROW GAMES](https://studyplayings.web.app/category-grow-games.html)
- [CATEGORY SURVIVAL366](https://theskillquest.pages.dev/category-survival366.html)
- [TOWER CRUSH](https://thequizzone.pages.dev/tower-crush.html)
- [CATEGORY THINKY](https://themindzone.pages.dev/category-thinky.html)
- [OMEGA LAYERS](https://thelearnquesters.pages.dev/omega-layers.html)
- [MAHJONG SLIDE PUZZLE](https://themindzone.pages.dev/mahjong-slide-puzzle.html)
- [BOXING FIGHTER](https://thequizzone.pages.dev/boxing-fighter.html)
- [FIREBOY WATERGIRL 7 AND FRIENDS](https://thequizzone.pages.dev/fireboy-watergirl-7-and-friends.html)
- [PEG SOLITAIRE](https://studyplaying.github.io/peg-solitaire.html)
- [ZOMBIES AND GUNS](https://studyplaying.github.io/zombies-and-guns.html)
- [ELITE CHESS](https://thelearnquesters.pages.dev/elite-chess.html)
- [MAGIC FOREST MERGE THE SECRETS](https://studyquesthub.web.app/magic-forest-merge-the-secrets.html)
- [LINE ON HOLE](https://thequizzone.pages.dev/line-on-hole.html)
- [CATEGORY CASUAL969](https://studyquests.pages.dev/category-casual969.html)
- [BUBBLE SHOOTER WONDERS OF EGYPT](https://studyplayings.pages.dev/bubble-shooter-wonders-of-egypt.html)
- [CATEGORY MOUSE1 697](https://studyplayings.web.app/category-mouse1-697.html)
- [IDLE BATHROOM EMPIRE TYCOON](https://studyquests.pages.dev/idle-bathroom-empire-tycoon.html)
- [TOW N GO](https://studyquesthub.web.app/tow-n-go.html)
- [PUZZLE ABOUT ORANGE](https://themindzone.pages.dev/puzzle-about-orange.html)
- [CATEGORY DIFFICULT81](https://thelearnquesters.pages.dev/category-difficult81.html)
- [LOGIC BLAST EXPLORER](https://themindzone.pages.dev/logic-blast-explorer.html)
- [SLIDE BLOCK PUZZLE](https://studyquesthub.web.app/slide-block-puzzle.html)
- [CATEGORY THINKY 2](https://theskillquest.pages.dev/category-thinky-2.html)
- [DINO DIGG](https://studyquesthub.web.app/dino-digg.html)
- [MAGIC KINGDOM HEX MATCH](https://themindzone.pages.dev/magic-kingdom-hex-match.html)
- [TANGLE MASTER 3D](https://studyplayings.web.app/tangle-master-3d.html)
- [FOOTBALL HEADS 2026](https://thequizzone.pages.dev/football-heads-2026.html)
- [POXEL IO](https://thelearnquesters.pages.dev/poxel-io.html)
- [1945 AIR FORCE AIRPLANE](https://thequizzone.pages.dev/1945-air-force-airplane.html)
- [COZY KITCHEN MERGE](https://thelearnquesters.pages.dev/cozy-kitchen-merge.html)
- [FROGTASTIC MARBLE ADVENTURE](https://thequizzone.pages.dev/frogtastic-marble-adventure.html)
- [FREE HOOPS](https://thequizzone.pages.dev/free-hoops.html)
- [CATEGORY ROGUELIKE38](https://studyplayings.pages.dev/category-roguelike38.html)
- [HAPPY GLASS GAME](https://studyquesthub.web.app/happy-glass-game.html)
- [INDEX27](https://studyplaying.github.io/index27.html)
- [MAD DASH](https://themindzone.pages.dev/mad-dash.html)
- [CATEGORY GROW99](https://studyplayings.web.app/category-grow99.html)
- [CATEGORY CASUAL 7](https://iskillquest.pages.dev/category-casual-7.html)
- [TRADING GAMES PLAYTIME](https://studyquesthub.web.app/trading-games-playtime.html)
- [CATEGORY DIFFICULT81](https://studyplayings.pages.dev/category-difficult81.html)
- [SPRUNKI BEATS](https://studyquests.pages.dev/sprunki-beats.html)
