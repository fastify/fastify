# Documentation en français (FR)

<div align="center">
  <a href="https://fastify.io/">
    <img src="https://github.com/fastify/graphics/raw/HEAD/fastify-landscape-outlined.svg" width="650" height="auto"/>
  </a>
</div>

<div align="center">

[![CI](https://github.com/fastify/fastify/workflows/ci/badge.svg)](https://github.com/fastify/fastify/actions/workflows/ci.yml)
[![Package Manager CI](https://github.com/fastify/fastify/workflows/package-manager-ci/badge.svg)](https://github.com/fastify/fastify/actions/workflows/package-manager-ci.yml)
[![Web SIte](https://github.com/fastify/fastify/workflows/website/badge.svg)](https://github.com/fastify/fastify/actions/workflows/website.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/fastify/fastify/badge.svg)](https://snyk.io/test/github/fastify/fastify)
[![Coverage Status](https://coveralls.io/repos/github/fastify/fastify/badge.svg?branch=main)](https://coveralls.io/github/fastify/fastify?branch=main)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://standardjs.com/)

</div>

<div align="center">

[![NPM version](https://img.shields.io/npm/v/fastify.svg?style=flat)](https://www.npmjs.com/package/fastify)
[![NPM downloads](https://img.shields.io/npm/dm/fastify.svg?style=flat)](https://www.npmjs.com/package/fastify)
[![Security Responsible
Disclosure](https://img.shields.io/badge/Security-Responsible%20Disclosure-yellow.svg)](https://github.com/nodejs/security-wg/blob/HEAD/processes/responsible_disclosure_template.md)
[![Discord](https://img.shields.io/discord/725613461949906985)](https://discord.gg/fastify)

</div>

<br />

Un serveur performant implique un moindre coût d'infrastructure, une meilleure réactivité et des utilisateurs satisfaits. Comment gérer efficacement les ressources de votre serveur, sachant que vous traitez un plus grand nombre de requêtes, sans sacrifier les verfications de sécurité et le développement pratique ?

- [Quick start](./README.md#quick-start)
- [Install](./README.md#install)
- [Example](./README.md#example)
- [Fastify v1.x and v2.x](./README.md#fastify-v1x-and-v2x)
- [Core features](./README.md#core-features)
- [Benchmarks](./README.md#benchmarks)
- [Documentation](./README.md#documentation)
- [Ecosystem](./README.md#ecosystem)
- [Support](./README.md#support)
- [Team](./README.md#team)
- [Hosted by](./README.md#hosted-by)
- [License](./README.md#license)

Adoptez Fastify. Fastify est un framework Web hautement axé sur la fourniture de la meilleure expérience de développement avec le moins de frais généraux et une architecture de plug-in puissante. Il s'inspire de Hapi et d'Express et, à notre connaissance, il s'agit de l'un des frameworks Web les plus rapides.

### Démarrage rapide

Créez un dossier et faites-en votre répertoire de travail actuel :

```sh
mkdir my-app
cd my-app
```

Générer un projet fastify avec `npm init`:

```sh
npm init fastify
```

Installez les dépendances :

```sh
npm install
```

Pour démarrer l'application en mode développeur :

```sh
npm run dev
```

Pour le mode production :

```sh
npm start
```

Sous le capot `npm init` télécharge et exécute [Fastify Create](https://github.com/fastify/create-fastify),
qui à son tour utilise la fonctionnalité de génération de [Fastify CLI](https://github.com/fastify/fastify-cli).

### Installation

En cas d'installation dans un projet existant, Fastify peut être installé en tant que dépendance :

Installer with npm:

```sh
npm i fastify --save
```

Installer with yarn:

```sh
yarn add fastify
```

### Exemple

```js
// Require the framework and instantiate it

// ESM
import Fastify from 'fastify';
const fastify = Fastify({
  logger: true,
});
// CommonJs
const fastify = require('fastify')({
  logger: true,
});

// Declare a route
fastify.get('/', (request, reply) => {
  reply.send({ hello: 'world' });
});

// Run the server!
fastify.listen(3000, (err, address) => {
  if (err) throw err;
  // Server is now listening on ${address}
});
```

Avec async-await:

```js
// ESM
import Fastify from 'fastify';
const fastify = Fastify({
  logger: true,
});
// CommonJs
const fastify = require('fastify')({
  logger: true,
});

fastify.get('/', async (request, reply) => {
  reply.type('application/json').code(200);
  return { hello: 'world' };
});

fastify.listen(3000, (err, address) => {
  if (err) throw err;
  // Server is now listening on ${address}
});
```

Vous voulez en savoir plus ? visitez <a href="./docs/Guides/Getting-Started.md"><code><b>Getting Started</b></code></a>.

### Fastify v1.x and v2.x

Le code de Fastify **v1.x** est dans [**`branch 1.x`**](https://github.com/fastify/fastify/tree/1.x), donc toutes les modifications liées à Fastify 1.x doivent être basées sur **`branch 1.x`**.
De la même manière, toutes les modifications liées à Fastify v2.x doivent être basées sur [**`branch 2.x`**](https://github.com/fastify/fastify/tree/2.x).

> ## Note
>
> `.listen` se lie a l'hôte local, `localhost`, interface par défaut(`127.0.0.1` or `::1`, selon la configuration du système d'exploitation). Si vous exécutez Fastify dans un conteneur (Docker, [GCP](https://cloud.google.com/), etc.), vous devrez peut-être vous lier à `0.0.0.0`. Soyez prudent lorsque vous décidez d'écouter sur toutes les interfaces ; Cela peut engendrer des [riques de sécutité](https://web.archive.org/web/20170711105010/https://snyk.io/blog/mongodb-hack-and-secure-defaults/).
> Voir [the documentation](./docs/Reference/Server.md#listen) pour plus d'informations.

### Caracteristiques de base

- **Haute performance:** à notre connaissance, Fastify est l'un des frameworks Web les plus rapides. En fonction de la complexité du code, nous pouvons traiter jusqu'à 76 000 requêtes par seconde.
- **Extensible:** Fastify est entièrement extensible via ses hooks, plugins et décorateurs.
- **Basé sur schéma:** même si ce n'est pas obligatoire, nous vous recommandons d'utiliser [JSON Schema](https://json-schema.org/) pour valider vos routes et sérialiser vos sorties, Fastify compile en interne le schéma dans une fonction hautement performante.
- **Logging:** les logs sont extrêmement importants mais coûteux ; nous avons choisi le meilleur logger pour quasiment supprimer ce coût, [Pino](https://github.com/pinojs/pino)!
- **Developer friendly:** le framework est conçu pour être très expressif et aider le développeur dans son utilisation quotidienne, sans sacrifier les performances et la sécurité.

### Benchmarks

**Machine:** EX41S-SSD, Intel Core i7, 4Ghz, 64GB RAM, 4C/8T, SSD.

**Methode:**: `autocannon -c 100 -d 40 -p 10 localhost:3000` \* 2, en prenant la deuxième moyenne

| Framework     | Version   |   Router?    | Requests/sec |
| :------------ | :-------- | :----------: | -----------: |
| Express       | 4.17.1    |   &#10003;   |       15,978 |
| hapi          | 19.1.0    |   &#10003;   |       45,815 |
| Restify       | 8.5.1     |   &#10003;   |       49,279 |
| Koa           | 2.13.0    |   &#10007;   |       54,848 |
| **Fastify**   | **3.0.0** | **&#10003;** |   **78,956** |
| -             |           |              |              |
| `http.Server` | 12.18.2   |   &#10007;   |       70,380 |

Benchmarks pris à l'aide de https://github.com/fastify/benchmarks. Ceci est un benchmark synthétique "hello world" qui vise à évaluer la surcharge du framework. La surcharge que chaque framework a sur votre application dépend de votre application, vous devez toujours évaluer si les performances sont importantes pour vous.

## Documentation

- <a href="./docs/Guides/Getting-Started.md"><code><b>Getting Started</b></code></a>
- <a href="./docs/Guides/Index.md"><code><b>Guides</b></code></a>
- <a href="./docs/Reference/Server.md"><code><b>Server</b></code></a>
- <a href="./docs/Reference/Routes.md"><code><b>Routes</b></code></a>
- <a href="./docs/Reference/Encapsulation.md"><code><b>Encapsulation</b></code></a>
- <a href="./docs/Reference/Logging.md"><code><b>Logging</b></code></a>
- <a href="./docs/Reference/Middleware.md"><code><b>Middleware</b></code></a>
- <a href="./docs/Reference/Hooks.md"><code><b>Hooks</b></code></a>
- <a href="./docs/Reference/Decorators.md"><code><b>Decorators</b></code></a>
- <a href="./docs/Reference/Validation-and-Serialization.md"><code><b>Validation and Serialization</b></code></a>
- <a href="./docs/Guides/Fluent-Schema.md"><code><b>Fluent Schema</b></code></a>
- <a href="./docs/Reference/Lifecycle.md"><code><b>Lifecycle</b></code></a>
- <a href="./docs/Reference/Reply.md"><code><b>Reply</b></code></a>
- <a href="./docs/Reference/Request.md"><code><b>Request</b></code></a>
- <a href="./docs/Reference/Errors.md"><code><b>Errors</b></code></a>
- <a href="./docs/Reference/ContentTypeParser.md"><code><b>Content Type Parser</b></code></a>
- <a href="./docs/Reference/Plugins.md"><code><b>Plugins</b></code></a>
- <a href="./docs/Guides/Testing.md"><code><b>Testing</b></code></a>
- <a href="./docs/Guides/Benchmarking.md"><code><b>Benchmarking</b></code></a>
- <a href="./docs/Guides/Write-Plugin.md"><code><b>How to write a good plugin</b></code></a>
- <a href="./docs/Guides/Plugins-Guide.md"><code><b>Plugins Guide</b></code></a>
- <a href="./docs/Reference/HTTP2.md"><code><b>HTTP2</b></code></a>
- <a href="./docs/Reference/LTS.md"><code><b>Long Term Support</b></code></a>
- <a href="./docs/Reference/TypeScript.md"><code><b>TypeScript and types support</b></code></a>
- <a href="./docs/Guides/Serverless.md"><code><b>Serverless</b></code></a>
- <a href="./docs/Guides/Recommendations.md"><code><b>Recommendations</b></code></a>

中文文档[地址](https://github.com/fastify/docs-chinese/blob/HEAD/README.md)

## Ecosystem

- [Core](./docs/Guides/Ecosystem.md#core) - Core plugins maintenus par l'[équipe](#team) _Fastify_ .
- [Community](./docs/Guides/Ecosystem.md#community) - Plugins pris en charge par la communauté.
- [Live Examples](https://github.com/fastify/example) - Multirepo avec un large éventail d'exemples de travail réels.
- [Discord](https://discord.gg/D3FZYPy) - Rejoignez notre serveur Discord et discutez avec les mainteneurs.

## Soutien

Veuillez consulter [l'aide de Fastify](https://github.com/fastify/help) pour afficher les problèmes d'assistance antérieurs et poser de nouvelles questions d'assistance.

## Équipe

_Fastify_ est le résultat du travail d'une grande communauté. Les membres de l'équipe sont classés par ordre alphabétique.

**Responsables de la maintenance :**

- [**Matteo Collina**](https://github.com/mcollina), <https://twitter.com/matteocollina>, <https://www.npmjs.com/~matteo.collina>
- [**Tomas Della Vedova**](https://github.com/delvedor), <https://twitter.com/delvedor>, <https://www.npmjs.com/~delvedor>

### Équipe Fastify Core

- [**Tommaso Allevi**](https://github.com/allevo), <https://twitter.com/allevitommaso>, <https://www.npmjs.com/~allevo>
- [**Ethan Arrowood**](https://github.com/Ethan-Arrowood/), <https://twitter.com/arrowoodtech>, <https://www.npmjs.com/~ethan_arrowood>
- [**Harry Brundage**](https://github.com/airhorns/), <https://twitter.com/harrybrundage>, <https://www.npmjs.com/~airhorns>
- [**David Mark Clements**](https://github.com/davidmarkclements), <https://twitter.com/davidmarkclem>, <https://www.npmjs.com/~davidmarkclements>
- [**Matteo Collina**](https://github.com/mcollina), <https://twitter.com/matteocollina>, <https://www.npmjs.com/~matteo.collina>
- [**Tomas Della Vedova**](https://github.com/delvedor), <https://twitter.com/delvedor>, <https://www.npmjs.com/~delvedor>
- [**Dustin Deus**](https://github.com/StarpTech), <https://twitter.com/dustindeus>, <https://www.npmjs.com/~starptech>
- [**Ayoub El Khattabi**](https://github.com/AyoubElk), <https://twitter.com/ayoubelkh>, <https://www.npmjs.com/~ayoubelk>
- [**Denis Fäcke**](https://github.com/SerayaEryn), <https://twitter.com/serayaeryn>, <https://www.npmjs.com/~serayaeryn>
- [**Rafael Gonzaga**](https://github.com/rafaelgss), <https://twitter.com/_rafaelgss>, <https://www.npmjs.com/~rafaelgss>
- [**Vincent Le Goff**](https://github.com/zekth)
- [**Luciano Mammino**](https://github.com/lmammino), <https://twitter.com/loige>, <https://www.npmjs.com/~lmammino>
- [**Luis Orbaiceta**](https://github.com/luisorbaiceta), <https://twitter.com/luisorbai>, <https://www.npmjs.com/~luisorbaiceta>
- [**Maksim Sinik**](https://github.com/fox1t), <https://twitter.com/maksimsinik>, <https://www.npmjs.com/~fox1t>
- [**Manuel Spigolon**](https://github.com/eomm), <https://twitter.com/manueomm>, <https://www.npmjs.com/~eomm>
- [**James Sumners**](https://github.com/jsumners), <https://twitter.com/jsumners79>, <https://www.npmjs.com/~jsumners>

### Équipe Fastify Plugins

- [**Matteo Collina**](https://github.com/mcollina), <https://twitter.com/matteocollina>, <https://www.npmjs.com/~matteo.collina>
- [**Harry Brundage**](https://github.com/airhorns/), <https://twitter.com/harrybrundage>, <https://www.npmjs.com/~airhorns>
- [**Tomas Della Vedova**](https://github.com/delvedor), <https://twitter.com/delvedor>, <https://www.npmjs.com/~delvedor>
- [**Ayoub El Khattabi**](https://github.com/AyoubElk), <https://twitter.com/ayoubelkh>, <https://www.npmjs.com/~ayoubelk>
- [**Vincent Le Goff**](https://github.com/zekth)
- [**Salman Mitha**](https://github.com/salmanm), <https://www.npmjs.com/~salmanm>
- [**Maksim Sinik**](https://github.com/fox1t), <https://twitter.com/maksimsinik>, <https://www.npmjs.com/~fox1t>
- [**Frazer Smith**](https://github.com/Fdawgs), <https://www.npmjs.com/~fdawgs>
- [**Manuel Spigolon**](https://github.com/eomm), <https://twitter.com/manueomm>, <https://www.npmjs.com/~eomm>

### Grands contributeurs

Les grands contributeurs sur un domaine spécifique de l'écosystème Fastify seront invités à rejoindre ce groupe par les responsables de la maintenance.

- [**dalisoft**](https://github.com/dalisoft), <https://twitter.com/dalisoft>, <https://www.npmjs.com/~dalisoft>
- [**Luciano Mammino**](https://github.com/lmammino), <https://twitter.com/loige>, <https://www.npmjs.com/~lmammino>
- [**Evan Shortiss**](https://github.com/evanshortiss), <https://twitter.com/evanshortiss>, <https://www.npmjs.com/~evanshortiss>

**Anciens collaborateurs**

- [**Çağatay Çalı**](https://github.com/cagataycali), <https://twitter.com/cagataycali>, <https://www.npmjs.com/~cagataycali>
- [**Trivikram Kamat**](https://github.com/trivikr), <https://twitter.com/trivikram>, <https://www.npmjs.com/~trivikr>
- [**Cemre Mengu**](https://github.com/cemremengu), <https://twitter.com/cemremengu>, <https://www.npmjs.com/~cemremengu>
- [**Nathan Woltman**](https://github.com/nwoltman), <https://twitter.com/NathanWoltman>, <https://www.npmjs.com/~nwoltman>

## Hébergé par

[<img src="https://github.com/openjs-foundation/cross-project-council/blob/HEAD/logos/openjsf-color.png?raw=true" width="250px;"/>](https://openjsf.org/projects/#growth)

Nous sommes un [projet de croissance](https://github.com/openjs-foundation/cross-project-council/blob/HEAD/PROJECT_PROGRESSION.md#growth-stage) dans la [OpenJS Foundation](https://openjsf.org/).

## Remerciements

Ce projet est aimablement sponsorisé par :

- [nearForm](https://nearform.com)

Anciens sponsors :

- [LetzDoIt](http://www.letzdoitapp.com/)

## Licence

Licence sous [MIT](./LICENSE).

Pour votre commodité, voici une liste de toutes les licences de nos dépendances de production :

- MIT
- ISC
- BSD-3-Clause
- BSD-2-Clause
