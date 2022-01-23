# Guide de migration V3

Ce guide est destiné à aider à la migration de Fastify v2 vers v3.

Avant de commencer, assurez-vous que tous les avertissements d'obsolescence de la v2 sont corrigés. Toutes les dépréciations v2 ont été supprimées et elles ne fonctionneront plus après la mise à niveau. ([#1750](https://github.com/fastify/fastify/pull/1750))

## Changements récent

### Modification de la prise en charge des middlewares ([#2014](https://github.com/fastify/fastify/pull/2014))

À partir de Fastify v3, la prise en charge des middlewares devient native.

Si vous utilisez le middleware Express dans votre application, veuillez installer et enregistrer le plug-in [`fastify-express`](https://github.com/fastify/fastify-express) ou
[`middie`](https://github.com/fastify/middie) avant de le faire.

**v2:**

```js
// Using the Express `cors` middleware in Fastify v2.
fastify.use(require('cors')());
```

**v3:**

```js
// Using the Express `cors` middleware in Fastify v3.
await fastify.register(require('fastify-express'));
fastify.use(require('cors')());
```

### Modification de la sérialisation de journalisation ([#2017](https://github.com/fastify/fastify/pull/2017))

[Les sérialiseurs](../Reference/Logging.md) de journalisation ont été mis à jour pour désormais Fastify
Fastify [`Request`](../Reference/Request.md) et
[`Reply`](../Reference/Reply.md) les objets au lieu des objets natifs.

Tous les sérialiseurs personnalisés doivent être mis à jour s'ils reposent sur des `request` ou `reply`
présentes sur les objets natifs mais pas sur les objets Fastify.

**v2:**

```js
const fastify = require('fastify')({
  logger: {
    serializers: {
      res(res) {
        return {
          statusCode: res.statusCode,
          customProp: res.customProp,
        };
      },
    },
  },
});
```

**v3:**

```js
const fastify = require('fastify')({
  logger: {
    serializers: {
      res(reply) {
        return {
          statusCode: reply.statusCode, // No change required
          customProp: reply.raw.customProp, // Log custom property from res object
        };
      },
    },
  },
});
```

### Remplacement de schéma modifié ([#2023](https://github.com/fastify/fastify/pull/2023))

`replace-way` La prise en charge des schémas partagés non standard a été supprimée `$ref` Cette fonctionnalité a été remplacée par une substitution basée sur la spécification JSON Schema . Pour vous aider à comprendre ce changement, lisez [Validation et sérialisation dans Fastify v3 .](https://dev.to/eomm/validation-and-serialization-in-fastify-v3-2e8l).

**v2:**

```js
const schema = {
  body: 'schemaId#',
};
fastify.route({ method, url, schema, handler });
```

**v3:**

```js
const schema = {
  body: {
    $ref: 'schemaId#',
  },
};
fastify.route({ method, url, schema, handler });
```

### Modification des options de validation du schéma ([#2023](https://github.com/fastify/fastify/pull/2023))

Les options `setSchemaCompiler` et `setSchemaResolver` ont été remplacées par les `setValidatorCompiler` pour permettre de futures améliorations de l'outillage. Pour vous aider à comprendre ce changement, lisez [Validation et sérialisation dans Fastify v3](https://dev.to/eomm/validation-and-serialization-in-fastify-v3-2e8l).

**v2:**

```js
const fastify = Fastify();
const ajv = new AJV();
ajv.addSchema(schemaA);
ajv.addSchema(schemaB);

fastify.setSchemaCompiler((schema) => ajv.compile(schema));
fastify.setSchemaResolver((ref) => ajv.getSchema(ref).schema);
```

**v3:**

```js
const fastify = Fastify();
const ajv = new AJV();
ajv.addSchema(schemaA);
ajv.addSchema(schemaB);

fastify.setValidatorCompiler(({ schema, method, url, httpPart }) =>
  ajv.compile(schema)
);
```

### Changement du comportement du hook preParsing ([#2286](https://github.com/fastify/fastify/pull/2286))

À partir de Fastify v3, le comportement du `preParsing` crochet changera légèrement afin de prendre en charge la manipulation de la charge utile de la demande.

Le hook prend maintenant un argument supplémentaire, `payload`, et donc la nouvelle signature de hook est `fn(request, reply, payload, done)` ou `async fn(request, reply, payload)`.

Le hook peut éventuellement renvoyer un nouveau flux via `done(null, stream)` ou renvoyer le flux en cas de fonctions asynchrones.

Si le hook renvoie un nouveau flux, il sera utilisé à la place de celui d'origine dans les hooks suivants. Un exemple de cas d'utilisation pour cela est la gestion des requêtes compressées.

Le nouveau flux doit ajouter la `receivedEncodedLength` propriété au flux qui doit refléter la taille réelle des données reçues du client. Par exemple, dans une requête compressée, il doit s'agir de la taille de la charge utile compressée. Cette propriété peut (et doit) être mise à jour dynamiquement lors d'événements. `data`.

L'ancienne syntaxe de Fastify v2 sans charge utile est prise en charge mais elle est obsolète.

### Modification du comportement des hooks ([#2004](https://github.com/fastify/fastify/pull/2004))

À partir de Fastify v3, le comportement de `onRoute` et `onRegister` changera légèrement afin de prendre en charge l'encapsulation des hooks.

- `onRoute` - Le hook sera appelé de manière asynchrone. Le hook est maintenant hérité lors de l'enregistrement d'un nouveau plugin dans la même portée d'encapsulation. Ainsi, ce hook doit être enregistré _avant_ d'enregistrer des plugins.
- `onRegister` - Identique au hook onRoute. La seule différence est que désormais le tout premier appel ne sera plus le framework lui-même, mais le premier plugin enregistré.

### Modification de la syntaxe de l'analyseur de type de contenu ( ([#2286](https://github.com/fastify/fastify/pull/2286))

Dans Fastify v3, les analyseurs de type de contenu ont désormais une seule signature pour les analyseurs.

TLes nouvelles signatures sont `fn(request, payload, done)` ou `async fn(request, payload)`. Notez que `request` est maintenant une requête Fastify et non un fichier
`IncomingMessage`. La charge utile est par défaut un flux si l'option `parseAs`  est utilisé `addContentTypeParser`, `payload` reflète alors la valeur de l'option (chaîne ou tampon).

Les anciennes signatures `fn(req, [done])` ou `fn(req, payload, [done])` (ou `req`
`IncomingMessage`) sont toujours prises en charge mais sont obsolètes.

### Modification de la prise en charge de TypeScript

Le système de type a été modifié dans la version 3 de Fastify. Le nouveau système de type introduit des contraintes et des valeurs par défaut génériques, ainsi qu'une nouvelle façon de définir les types de schéma tels qu'un corps de requête, une chaîne de requête, et plus encore !

**v2:**

```ts
interface PingQuerystring {
  foo?: number;
}

interface PingParams {
  bar?: string;
}

interface PingHeaders {
  a?: string;
}

interface PingBody {
  baz?: string;
}

server.get<PingQuerystring, PingParams, PingHeaders, PingBody>(
  '/ping/:bar',
  opts,
  (request, reply) => {
    console.log(request.query); // This is of type `PingQuerystring`
    console.log(request.params); // This is of type `PingParams`
    console.log(request.headers); // This is of type `PingHeaders`
    console.log(request.body); // This is of type `PingBody`
  }
);
```

**v3:**

```ts
server.get<{
  Querystring: PingQuerystring;
  Params: PingParams;
  Headers: PingHeaders;
  Body: PingBody;
}>('/ping/:bar', opts, async (request, reply) => {
  console.log(request.query); // This is of type `PingQuerystring`
  console.log(request.params); // This is of type `PingParams`
  console.log(request.headers); // This is of type `PingHeaders`
  console.log(request.body); // This is of type `PingBody`
});
```

### Gérer l'exception non interceptée ([#2073](https://github.com/fastify/fastify/pull/2073))

Dans les gestionnaires de routage de synchronisation, si une erreur était générée, le serveur s'arrêtait de par sa conception sans appeler le fichier `.setErrorHandler()`. Cela a changé et maintenant toutes les erreurs inattendues dans les routes synchronisées et asynchrones sont gérées.

**v2:**

```js
fastify.setErrorHandler((error, request, reply) => {
  // this is NOT called
  reply.send(error);
});
fastify.get('/', (request, reply) => {
  const maybeAnArray = request.body.something ? [] : 'I am a string';
  maybeAnArray.substr(); // Thrown: [].substr is not a function and crash the server
});
```

**v3:**

```js
fastify.setErrorHandler((error, request, reply) => {
  // this IS called
  reply.send(error);
});
fastify.get('/', (request, reply) => {
  const maybeAnArray = request.body.something ? [] : 'I am a string';
  maybeAnArray.substr(); // Thrown: [].substr is not a function, but it is handled
});
```

## Autres ajouts et améliorations

- Les hooks ont maintenant un contexte cohérent quelle que soit la façon dont ils sont enregistrés
  ([#2005](https://github.com/fastify/fastify/pull/2005))
- Obsolète `request.req` et `reply.res` pour
  [`request.raw`](../Reference/Request.md) and
  [`reply.raw`](../Reference/Reply.md)
  ([#2008](https://github.com/fastify/fastify/pull/2008))
- Supprimé `modifyCoreObjects` option
  ([#2015](https://github.com/fastify/fastify/pull/2015))
- Ajout [`connectionTimeout`](../Reference/Server.md#factory-connection-timeout)
  option ([#2086](https://github.com/fastify/fastify/pull/2086))
- Ajout [`keepAliveTimeout`](../Reference/Server.md#factory-keep-alive-timeout)
  option ([#2086](https://github.com/fastify/fastify/pull/2086))
- Ajout async-await support pour les [plugins](../Reference/Plugins.md#async-await)
  ([#2093](https://github.com/fastify/fastify/pull/2093))
- Ajout de la fonctionnalité pour le renvoi d'objet en tant qu'erreur
  ([#2134](https://github.com/fastify/fastify/pull/2134))
