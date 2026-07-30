# Validation and Serialization

Right now, our routes just accept whatever the client sends and return 
whatever we produce. That works, but it’s risky and inefficient. 
Let’s tighten things up with validation and serialization.

To address this, we need to add two steps:

* **Validate** inputs before our logic runs - so we reject bad data early and 
avoid chasing runtime errors.
* **Serialize** outputs under strict rules - so we prevent accidental data 
leaks and let Fastify generate optimized code for faster responses.

Fastify solves both with a **schema-first** approach using
[JSON Schema](https://json-schema.org/):
you declare input and output shapes, and Fastify compiles them into
high-performance validators and serializers that run automatically for each request.

## Validation

Fastify uses [Ajv](https://ajv.js.org/) for validation.
Ajv takes your JSON Schema and compiles it into a JavaScript function that 
is friendly to V8’s optimizing compiler.

**Example**

```ts
const schema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: { name: { type: 'string' } }
  }
};

app.post('/hello', { schema }, async (req) => ({ hello: req.body.name }));
```

If validation fails, Fastify automatically sends a `400 Bad Request` response 
with details.

## Serialization

For responses, Fastify uses
[fast-json-stringify](https://github.com/fastify/fast-json-stringify),
a library maintained as part of the Fastify project.
When you supply a **response schema**, Fastify compiles a dedicated serializer that:

* Is faster than `JSON.stringify` for structured data
* Only outputs properties declared in the schema (extra properties are removed)

**Example**

```ts
const schema = {
  response: {
    200: {
      type: 'object',
      additionalProperties: false,
      properties: { hello: { type: 'string' } }
    }
  }
};

app.get('/hello', { schema }, async () => ({ hello: 'world', secret: 'hidden' }));
// The "secret" field is stripped automatically
```

Schemas are keyed by status code (`200`, `404`) and can 
use `'2xx'` or `'default'` as wildcards.

## Implementation for our application

We’ll move all schemas into a `schemas.ts` file, configure Ajv with safe
defaults, and attach schemas to all our routes.

### `schemas.ts`

We’ll define:

* A reusable `id` params schema via `addSchema`
* Request body and querystring schemas
* Response schemas for quotes and errors

```ts
export interface QuoteBody {
  text: string;
}

export interface Quote extends QuoteBody {
  id: number;
}

export interface IdParams {
  id: number;
}

export interface ListQuery {
  limit?: number;
}

// Schema for validating the ":id" route parameter
export const idParam = {
  $id: "idParam", // Unique identifier so we can $ref this schema in other places
  type: "object", // The params object itself
  properties: {
    id: { type: "integer", minimum: 1 }, // Must be a positive integer
  },
  required: ["id"], // "id" must be present
};

// Schema for validating the request body when creating/updating a quote
export const quoteBody = {
  type: "object",
  required: ["text"],
  additionalProperties: false, // Only declared keys are kept
  properties: {
    text: { type: "string", minLength: 1 },
  },
};

// Schema for validating the querystring (?limit=)
export const listQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: { type: "integer", minimum: 1 },
  },
};

// Schema describing a quote entity in responses
export const quoteResponse = {
  $id: "quoteResponse",
  type: "object",
  additionalProperties: false,
  required: ["id", "text"],
  properties: {
    id: { type: "integer" },
    text: { type: "string" },
  },
};

// Schema describing an error message in responses
export const errorMessage = {
  $id: "errorMessage",
  type: "object",
  additionalProperties: false,
  required: ["message"],
  properties: { message: { type: "string" } },
};

// Response schema for listing multiple quotes
export const listQuotesResponse = {
  200: {
    type: "array", // Array of quotes
    items: { $ref: "quoteResponse#" }, // Each element must match quoteResponse
  },
};

// Response schema for returning a single quote or an error
export const singleQuoteResponse = {
  "2xx": { $ref: "quoteResponse#" }, // Any 2xx response returns a quote
  404: { $ref: "errorMessage#" }, // Not found → error message
};

// Response schema for delete operation
export const deleteQuoteResponse = {
  204: { type: "null" }, // No content on success
  404: { $ref: "errorMessage#" }, // Not found → error message
};
```

### Server with schemas

```ts
// server.ts
import fastify from 'fastify';
import closeWithGrace from 'close-with-grace';
import { createDb } from './db.ts';
import { createQuotesRepository } from './quotes-repository.ts';
import {
  idParam, quoteBody, listQuery,
  quoteResponse, errorMessage,
  listQuotesResponse, singleQuoteResponse, deleteQuoteResponse
} from './schemas.ts';
import type { IdParams, ListQuery, QuoteBody } from './schemas.ts';

const app = fastify({
  logger: true,
  forceCloseConnections: false,
  ajv: {
    customOptions: {
      // Explicitly disable allErrors to avoid CVE-2020-8192 risk
      allErrors: false,
      // Coerce types: e.g., "42" (string) -> 42 (integer)
      coerceTypes: 'array',
      // Remove properties not in schema
      removeAdditional: 'all'
    }
  }
});

app.decorate('db', createDb());
app.decorate(
  'quotesRepository',
  createQuotesRepository(app),
  ['db']
);

// Shared schemas
app.addSchema(quoteResponse);
app.addSchema(errorMessage);
app.addSchema(idParam);


// Routes
app.get<{ Querystring: ListQuery }>(
  "/quotes",
  {
    schema: {
      querystring: listQuery,
      response: listQuotesResponse,
    },
  },
  function (request) {
    const limit = request.query.limit ?? 10;
    return this.quotesRepository.list(limit);
  }
);

app.get<{ Params: IdParams }>(
  "/quotes/:id",
  {
    schema: {
      params: { $ref: "idParam#" },
      response: singleQuoteResponse,
    },
  },
  function (request, reply) {
    const quote = this.quotesRepository.get(request.params.id);
    if (!quote) {
      reply.code(404);
      return { message: "Quote not found" };
    }
    return quote;
  }
);

app.post<{ Body: QuoteBody }>(
  "/quotes",
  {
    schema: {
      body: quoteBody,
      response: singleQuoteResponse,
    },
  },
  function (request, reply) {
    const quote = this.quotesRepository.create(request.body.text);
    const demo = { ...quote, secret: "do-not-leak" }; // removed by serializer
    reply.code(201);
    return demo;
  }
);

app.put<{ Params: IdParams; Body: QuoteBody }>(
  "/quotes/:id",
  {
    schema: {
      params: { $ref: "idParam#" },
      body: quoteBody,
      response: singleQuoteResponse,
    },
  },
  function (request, reply) {
    const updated = this.quotesRepository.update(
      request.params.id,
      request.body.text
    );
    if (!updated) {
      reply.code(404);
      return { message: "Quote not found" };
    }
    return updated;
  }
);

app.delete<{ Params: IdParams }>(
  "/quotes/:id",
  {
    schema: {
      params: { $ref: "idParam#" },
      response: deleteQuoteResponse,
    },
  },
  function (request, reply) {
    const deleted = this.quotesRepository.remove(request.params.id);
    if (!deleted) {
      reply.code(404);
      return { message: "Quote not found" };
    }
    return reply.code(204).send();
  }
);

closeWithGrace(
  { delay: 15_000 },
  async ({ err }) => {
    if (err != null) {
      app.log.error(err);
    }

    await app.close();
  }
);

// Start the server
try {
  await app.listen({ port: 3000 });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
```

### Quick mapping reminder

* `body`: request body (POST, PUT, PATCH)
* `querystring` / `query`: URL query parameters
* `params`: route parameters
* `headers`: HTTP request headers

## Testing schemas

Here are a few focused requests to confirm validation and serialization:

* **Params validation** (invalid `id`):

```bash
curl -i http://localhost:3000/quotes/abc
```

Expected: `400 Bad Request` - ID must be integer.

* **Body validation** (missing required field):

```bash
curl -i -X POST http://localhost:3000/quotes \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: `400 Bad Request` - must have required property `text`.

* **Response serialization** (hidden property stripped):

```bash
curl -i -X POST http://localhost:3000/quotes \
  -H "Content-Type: application/json" \
  -d '{"text":"Premature optimization is the root of all evil"}'
```

Expected: `201 Created` with `{ "id": 1, "text": "..." }` - no `secret` field.


## Optional: custom error messages with `ajv-errors`

A concrete example: you want to validate `text` and show a user-friendly message
instead of Ajv’s default.

Install the optional plugin before trying this example:

```bash
npm install ajv-errors
```

```ts
import AjvErrors from 'ajv-errors';

const app = fastify({
  ajv: {
    customOptions: {
      allErrors: true // ⚠ May enable CVE-2020-8192 risk
    },
    plugins: [AjvErrors]
  }
});

const schema = {
  body: {
    type: 'object',
    required: ['text'],
    properties: {
      text: {
        type: 'string',
        minLength: 1,
        errorMessage: {
          type: 'Text must be a string',
          minLength: 'Text cannot be empty'
        }
      }
    }
  }
};
```

Now, if the user sends `{ "text": "" }`, they’ll see `"Text cannot be empty"`
in the response. 

## Using other validators

You’re not locked into Ajv.
Fastify can use other validators or custom Ajv configurations via
[`setValidatorCompiler`](/docs/latest/Reference/Validation-and-Serialization/#using-other-validation-libraries)
.

Here is a trivial compiler that **always accepts data**, no matter what:

```ts
function myAlwaysValidCompiler() {
  return function validate(data: unknown) {
    return { value: data };
  };
}

// Replace AJV with our own compiler
app.setValidatorCompiler(myAlwaysValidCompiler);
```

Test again with an invalid `id`:

```bash
curl -i http://localhost:3000/quotes/abc
```

Normally this would fail because `id` must be an integer.
With our custom compiler, the request is accepted.

Fastify custom validators return `{ value }` for accepted data or `{ error }`
for rejected data. Remove this deliberately unsafe compiler after the
experiment to restore the Quote Vault validation rules.

### Overriding the serializer

Similarly, you can replace the response serializer.
Here’s a naive version that just wraps everything in a JSON object 
and ignores the declared schema:

```ts
function mySerializerCompiler() {
  return function serialize(data: unknown) {
    return JSON.stringify({
      wrapped: true,
      data,
    });
  };
}

app.setSerializerCompiler(mySerializerCompiler);
```

Test again to post a quote:

```bash
curl -i -X POST http://localhost:3000/quotes \
  -H "Content-Type: application/json" \
  -d '{"text":"Premature optimization is the root of all evil"}'
```

Instead of stripping the `secret` field, Fastify now sends:
```json
{
  "wrapped": true,
  "data": {
    "id": 1,
    "text": "Premature optimization is the root of all evil",
    "secret": "do-not-leak"
  }
}
```
