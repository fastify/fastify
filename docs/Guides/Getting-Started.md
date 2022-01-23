<h1 align="center">Fastify</h1>

## Commencer

Salut! Merci d'avoir choisit Fastify !

Ce document se veut une introduction en douceur au framework et à ses fonctionnalités. Il s'agit d'une préface élémentaire avec des exemples et des liens vers d'autres parties de la documentation.

Commençons !

### Installer

<a id="install"></a>

Installer avec npm :

```
npm i fastify --save
```

Installer avec yarn :

```
yarn add fastify
```

### Votre premier serveur

<a id="first-server"></a>

Écrivons notre premier serveur :

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
fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' });
});

// Run the server!
fastify.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  // Server is now listening on ${address}
});
```

Vous préférez utiliser `async/await` ? Fastify le prend en charge en natif.

_(Nous suggérons également d'utiliser
[make-promises-safe](https://github.com/mcollina/make-promises-safe) pour éviter les fuites de fichier et de mémoire.)_

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
  return { hello: 'world' };
});

const start = async () => {
  try {
    await fastify.listen(3000);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
```

Génial, c'était facile.

Malheureusement, l'écriture d'une application complexe nécessite beaucoup plus de code que cet exemple. Un problème classique lorsque vous construisez une nouvelle application est de savoir comment gérer plusieurs fichiers, le démarrage asynchrone et l'architecture de votre code.

Fastify offre une plate-forme simple qui aide à résoudre tous les problèmes décrits ci-dessus, et plus encore !

> ## Note
>
> Les exemples ci-dessus, et les exemples suivants de ce document, écoutent par défaut
> _uniquement_ sur localhost `127.0.0.1`.
> Pour écouter sur toutes les interfaces IPv4 disponibles, l'exemple doit être modifié pour écouter
> `0.0.0.0` comme suit :
>
> ```js
> fastify.listen(3000, '0.0.0.0', function (err, address) {
>   if (err) {
>     fastify.log.error(err);
>     process.exit(1);
>   }
>   fastify.log.info(`server listening on ${address}`);
> });
> ```
>
> De même, spécifiez `::1` pour n'accepter que les connexions locales via IPv6. Ou spécifiez
> `::` d'accepter les connexions sur toutes les adresses IPv6 et, si le système d'exploitation le prend en charge,
> également sur toutes les adresses IPv4.
> Lors du déploiement sur un conteneur Docker (ou un autre type de) conteneur, l'utilisation de `0.0.0.0` ou
> `::` serait la méthode la plus simple pour exposer l'application.

### Votre premier plugin

<a id="first-plugin"></a>

Comme avec JavaScript, où tout est un objet, avec Fastify tout est un plugin.

Avant de creuser dedans, voyons comment ça marche !

Déclarons notre serveur de base, mais au lieu de déclarer la route à l'intérieur du point d'entrée, nous la déclarerons dans un fichier externe (consultez la documentation sur la [déclaration des routes](../Reference/Routes.md)).

```js
// ESM
import Fastify from 'fastify';
import firstRoute from './our-first-route';
const fastify = Fastify({
  logger: true,
});

fastify.register(firstRoute);

fastify.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  // Server is now listening on ${address}
});
```

```js
// CommonJs
const fastify = require('fastify')({
  logger: true,
});

fastify.register(require('./our-first-route'));

fastify.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  // Server is now listening on ${address}
});
```

```js
// our-first-route.js

async function routes(fastify, options) {
  fastify.get('/', async (request, reply) => {
    return { hello: 'world' };
  });
}

module.exports = routes;
```

Dans cet exemple, nous avons utilisé l'API `register` API, qui est au cœur du framework Fastify. C'est le seul moyen d'ajouter des routes, des plugins, etc.

Au début de ce guide, nous avons noté que Fastify fournit une base qui aide au démarrage asynchrone de votre application. Pourquoi est-ce important?

Considérez le scénario dans lequel une connexion à la base de données est nécessaire pour gérer le stockage des données. La connexion à la base de données doit être disponible avant que le serveur n'accepte les connexions. Comment résoudre ce problème ?

Une solution typique consiste à utiliser un rappel complexe, ou des promesses - un système qui mélangera l'API du framework avec d'autres bibliothèques et le code de l'application.

Fastify gère cela en interne, avec un minimum d'effort !

Réécrivons l'exemple ci-dessus avec une connexion à la base de données.

Tout d'abord, installez `fastify-plugin` et `fastify-mongodb`:

```
npm i --save fastify-plugin fastify-mongodb
```

**server.js**

```js
// ESM
import Fastify from 'fastify';
import dbConnector from './our-db-connector';
import firstRoute from './our-first-route';

const fastify = Fastify({
  logger: true,
});
fastify.register(dbConnector);
fastify.register(firstRoute);

fastify.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  // Server is now listening on ${address}
});
```

```js
// CommonJs
const fastify = require('fastify')({
  logger: true,
});

fastify.register(require('./our-db-connector'));
fastify.register(require('./our-first-route'));

fastify.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  // Server is now listening on ${address}
});
```

**our-db-connector.js**

```js
// ESM
import fastifyPlugin from 'fastify-plugin';
import fastifyMongo from 'fastify-mongodb';

async function dbConnector(fastify, options) {
  fastify.register(fastifyMongo, {
    url: 'mongodb://localhost:27017/test_database',
  });
}

// Wrapping a plugin function with fastify-plugin exposes the decorators
// and hooks, declared inside the plugin to the parent scope.
module.exports = fastifyPlugin(dbConnector);
```

```js
// CommonJs
const fastifyPlugin = require('fastify-plugin');

async function dbConnector(fastify, options) {
  fastify.register(require('fastify-mongodb'), {
    url: 'mongodb://localhost:27017/test_database',
  });
}

// Wrapping a plugin function with fastify-plugin exposes the decorators
// and hooks, declared inside the plugin to the parent scope.
module.exports = fastifyPlugin(dbConnector);
```

**our-first-route.js**

```js
async function routes(fastify, options) {
  const collection = fastify.mongo.db.collection('test_collection');

  fastify.get('/', async (request, reply) => {
    return { hello: 'world' };
  });

  fastify.get('/animals', async (request, reply) => {
    const result = await collection.find().toArray();
    if (result.length === 0) {
      throw new Error('No documents found');
    }
    return result;
  });

  fastify.get('/animals/:animal', async (request, reply) => {
    const result = await collection.findOne({ animal: request.params.animal });
    if (!result) {
      throw new Error('Invalid value');
    }
    return result;
  });

  const animalBodyJsonSchema = {
    type: 'object',
    required: ['animal'],
    properties: {
      animal: { type: 'string' },
    },
  };

  const schema = {
    body: animalBodyJsonSchema,
  };

  fastify.post('/animals', { schema }, async (request, reply) => {
    // we can use the `request.body` object to get the data sent by the client
    const result = await collection.insertOne({ animal: request.body.animal });
    return result;
  });
}

module.exports = routes;
```

Waouh, c'était rapide !

Récapitulons ce que nous avons fait ici depuis que nous avons introduit de nouveaux concepts.

Comme vous pouvez le voir, nous avons utilisé `register` à la fois le connecteur de la base de données et l'enregistrement des itinéraires.

C'est l'une des meilleures fonctionnalités de Fastify, il chargera vos plugins dans le même ordre que vous les déclarez, et il ne chargera le plugin suivant qu'une fois que l'actuel aura été chargé. De cette façon, nous pouvons enregistrer le connecteur de base de données dans le premier plugin et l'utiliser dans le second _(lire
[ici](../Reference/Plugins.md#handle-the-scope) pour comprendre comment gérer la portée d'un plugin)_.

Le chargement du plugin commence lorsque vous appelez `fastify.listen()`, `fastify.inject()` ou
`fastify.ready()`

Le plugin MongoDB utilise l'API `decorate` pour ajouter des objets personnalisés à l'instance Fastify, les rendant disponibles pour une utilisation partout. L'utilisation de cette API est encouragée pour faciliter la réutilisation du code et pour réduire la duplication de code ou de logique.

Pour approfondir le fonctionnement des plugins Fastify, comment développer de nouveaux plugins et pour plus de détails sur la façon d'utiliser l'ensemble de l'API Fastify pour faire face à la complexité du démarrage asynchrone d'une application, lisez [ le guide de l'auto-stoppeur sur les plugins](./Plugins-Guide.md).

### Ordre de chargement de vos plugins

<a id="plugin-loading-order"></a>

Pour garantir un comportement cohérent et prévisible de votre application, nous vous recommandons vivement de toujours charger votre code comme indiqué ci-dessous :

```
└── plugins (from the Fastify ecosystem)
└── your plugins (your custom plugins)
└── decorators
└── hooks
└── your services
```

De cette façon, vous aurez toujours accès à toutes les propriétés déclarées dans la portée courante.

Comme indiqué précédemment, Fastify propose un modèle d'encapsulation solide, pour vous aider à créer votre application en tant que services uniques et indépendants. Si vous souhaitez enregistrer un plugin uniquement pour un sous-ensemble de routes, il vous suffit de répliquer la structure ci-dessus.

```
└── plugins (from the Fastify ecosystem)
└── your plugins (your custom plugins)
└── decorators
└── hooks
└── your services
    │
    └──  service A
    │     └── plugins (from the Fastify ecosystem)
    │     └── your plugins (your custom plugins)
    │     └── decorators
    │     └── hooks
    │     └── your services
    │
    └──  service B
          └── plugins (from the Fastify ecosystem)
          └── your plugins (your custom plugins)
          └── decorators
          └── hooks
          └── your services
```

### Validez vos données

<a id="validate-data"></a>

La validation des données est extrêmement importante et constitue un concept central du cadre.

Pour valider les requêtes entrantes, Fastify utilise [JSON
Schema](https://json-schema.org/).

(Les schémas JTD sont faiblement pris en charge, mais `jsonShorthand` doivent d'abord être désactivés)

Let's look at an example demonstrating validation for routes:

```js
const opts = {
  schema: {
    body: {
      type: 'object',
      properties: {
        someKey: { type: 'string' },
        someOtherKey: { type: 'number' },
      },
    },
  },
};

fastify.post('/', opts, async (request, reply) => {
  return { hello: 'world' };
});
```

This example shows how to pass an options object to the route, which accepts a
`schema` key that contains all of the schemas for route, `body`, `querystring`,
`params`, and `headers`.

Read [Validation and
Serialization](../Reference/Validation-and-Serialization.md) to learn more.

### Serialize your data

<a id="serialize-data"></a>

Fastify has first class support for JSON. It is extremely optimized to parse
JSON bodies and to serialize JSON output.

To speed up JSON serialization (yes, it is slow!) use the `response` key of the
schema option as shown in the following example:

```js
const opts = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          hello: { type: 'string' },
        },
      },
    },
  },
};

fastify.get('/', opts, async (request, reply) => {
  return { hello: 'world' };
});
```

By specifying a schema as shown, you can speed up serialization by a factor of
2-3. This also helps to protect against leakage of potentially sensitive data,
since Fastify will serialize only the data present in the response schema. Read
[Validation and Serialization](../Reference/Validation-and-Serialization.md) to
learn more.

### Parsing request payloads

<a id="request-payload"></a>

Fastify parses `'application/json'` and `'text/plain'` request payloads
natively, with the result accessible from the [Fastify
request](../Reference/Request.md) object at `request.body`.

The following example returns the parsed body of a request back to the client:

```js
const opts = {};
fastify.post('/', opts, async (request, reply) => {
  return request.body;
});
```

Read [Content-Type Parser](../Reference/ContentTypeParser.md) to learn more
about Fastify's default parsing functionality and how to support other content
types.

### Extend your server

<a id="extend-server"></a>

Fastify is built to be extremely extensible and minimal, we believe that a
bare-bones framework is all that is necessary to make great applications
possible.

In other words, Fastify is not a "batteries included" framework, and relies on
an amazing [ecosystem](./Ecosystem.md)!

### Test your server

<a id="test-server"></a>

Fastify does not offer a testing framework, but we do recommend a way to write
your tests that uses the features and architecture of Fastify.

Read the [testing](./Testing.md) documentation to learn more!

### Run your server from CLI

<a id="cli"></a>

Fastify also has CLI integration thanks to
[fastify-cli](https://github.com/fastify/fastify-cli).

First, install `fastify-cli`:

```
npm i fastify-cli
```

You can also install it globally with `-g`.

Then, add the following lines to `package.json`:

```json
{
  "scripts": {
    "start": "fastify start server.js"
  }
}
```

And create your server file(s):

```js
// server.js
'use strict';

module.exports = async function (fastify, opts) {
  fastify.get('/', async (request, reply) => {
    return { hello: 'world' };
  });
};
```

Then run your server with:

```bash
npm start
```

### Slides and Videos

<a id="slides"></a>

- Slides

  - [Take your HTTP server to ludicrous
    speed](https://mcollina.github.io/take-your-http-server-to-ludicrous-speed)
    by [@mcollina](https://github.com/mcollina)
  - [What if I told you that HTTP can be
    fast](https://delvedor.github.io/What-if-I-told-you-that-HTTP-can-be-fast)
    by [@delvedor](https://github.com/delvedor)

- Videos
  - [Take your HTTP server to ludicrous
    speed](https://www.youtube.com/watch?v=5z46jJZNe8k) by
    [@mcollina](https://github.com/mcollina)
  - [What if I told you that HTTP can be
    fast](https://www.webexpo.net/prague2017/talk/what-if-i-told-you-that-http-can-be-fast/)
    by [@delvedor](https://github.com/delvedor)
