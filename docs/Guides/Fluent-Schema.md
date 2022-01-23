<h1 align="center">Fastify</h1>

## Schéma fluide

La documentation [Validation and
Serialization](../Reference/Validation-and-Serialization.md) décrit tous les paramètres acceptés par Fastify pour configurer JSON Schema Validation pour valider l'entrée et JSON Schema Serialization pour optimiser la sortie.

[`fluent-json-schema`](https://github.com/fastify/fluent-json-schema) peut être utilisé pour simplifier cette tâche tout en permettant la réutilisation des constantes.

### Paramètres de base

```js
const S = require('fluent-json-schema');

// You can have an object like this, or query a DB to get the values
const MY_KEYS = {
  KEY1: 'ONE',
  KEY2: 'TWO',
};

const bodyJsonSchema = S.object()
  .prop('someKey', S.string())
  .prop('someOtherKey', S.number())
  .prop('requiredKey', S.array().maxItems(3).items(S.integer()).required())
  .prop('nullableKey', S.mixed([S.TYPES.NUMBER, S.TYPES.NULL]))
  .prop('multipleTypesKey', S.mixed([S.TYPES.BOOLEAN, S.TYPES.NUMBER]))
  .prop(
    'multipleRestrictedTypesKey',
    S.oneOf([S.string().maxLength(5), S.number().minimum(10)])
  )
  .prop('enumKey', S.enum(Object.values(MY_KEYS)))
  .prop('notTypeKey', S.not(S.array()));

const queryStringJsonSchema = S.object()
  .prop('name', S.string())
  .prop('excitement', S.integer());

const paramsJsonSchema = S.object()
  .prop('par1', S.string())
  .prop('par2', S.integer());

const headersJsonSchema = S.object().prop('x-foo', S.string().required());

// Note that there is no need to call `.valueOf()`!
const schema = {
  body: bodyJsonSchema,
  querystring: queryStringJsonSchema, // (or) query: queryStringJsonSchema
  params: paramsJsonSchema,
  headers: headersJsonSchema,
};

fastify.post('/the/url', { schema }, handler);
```

### Réutilisation

Avec `fluent-json-schema` vous pouvez manipuler vos schémas plus facilement et par programmation puis les réutiliser grâce à la méthode `addSchema()`. Vous pouvez vous référer au schéma de deux manières différentes qui sont détaillées dans la documentation
[Validation and
Serialization](../Reference/Validation-and-Serialization.md#adding-a-shared-schema)
documentation.

Voici quelques exemples d'utilisation :

**`$ref-way`**: fait référence à un schéma externe.

```js
const addressSchema = S.object()
  .id('#address')
  .prop('line1')
  .required()
  .prop('line2')
  .prop('country')
  .required()
  .prop('city')
  .required()
  .prop('zipcode')
  .required();

const commonSchemas = S.object()
  .id('https://fastify/demo')
  .definition('addressSchema', addressSchema)
  .definition('otherSchema', otherSchema); // You can add any schemas you need

fastify.addSchema(commonSchemas);

const bodyJsonSchema = S.object()
  .prop('residence', S.ref('https://fastify/demo#address'))
  .required()
  .prop('office', S.ref('https://fastify/demo#/definitions/addressSchema'))
  .required();

const schema = { body: bodyJsonSchema };

fastify.post('/the/url', { schema }, handler);
```

**`replace-way`**: fait référence à un schéma partagé à remplacer avant le processus de validation.

```js
const sharedAddressSchema = {
  $id: 'sharedAddress',
  type: 'object',
  required: ['line1', 'country', 'city', 'zipcode'],
  properties: {
    line1: { type: 'string' },
    line2: { type: 'string' },
    country: { type: 'string' },
    city: { type: 'string' },
    zipcode: { type: 'string' },
  },
};
fastify.addSchema(sharedAddressSchema);

const bodyJsonSchema = {
  type: 'object',
  properties: {
    vacation: 'sharedAddress#',
  },
};

const schema = { body: bodyJsonSchema };

fastify.post('/the/url', { schema }, handler);
```

NB Vous pouvez confondre les `$ref-way` et les `replace-way` lors de l'utilisation de
`fastify.addSchema`.
