# Decorating Fastify

In this chapter, we’ll extend Fastify using **decorators** - the 
built-in mechanism to attach features and data to:
- the **Fastify instance**,
- the [**Request**](../Reference/Request.md) object,
- the [**Reply**](../Reference/Reply.md) object.

We’ll focus on decorating the **Fastify instance** with a small 
in-memory document database and a `quotesRepository` built on top of it.  
Later in this tutorial, we’ll explore alternative dependency patterns.

## Why decorators?

Decorators give you a straightforward way to attach capabilities to Fastify. 
Defining these capabilities up front also lets  **V8** optimize memory 
usage by stabilizing the shape of the instance, request, and reply objects
before they’re instantiated and used.

Read more about object-shape handling in JS engines
[in this article](https://mathiasbynens.be/notes/shapes-ics#shapes).

## Database Decorator

Let's first create our in-memory document database that manages multiple
collections. 
Each collection keeps its own `id` counter and `Map` of documents.

Because our server file is starting to grow and take on too many
responsibilities, we should start to separate concerns into different files.

So let's create our db in a `db.ts` file:

Fastify decorators are added at runtime, so TypeScript cannot infer their
properties from `decorate()`. Module augmentation extends the
`FastifyInstance`, `FastifyRequest`, or `FastifyReply` interface with those
properties. This is the usual approach when accessing decorators directly.
Fastify also provides [`getDecorator<T>()`](https://fastify.dev/docs/latest/Reference/Decorators/#getdecoratorname)
as a scoped alternative.

```ts
// db.ts
interface Document {
  id: number;
  [property: string]: unknown;
}

interface Collection {
  id: number;
  data: Map<number, Document>;
}

declare module "fastify" {
  interface FastifyInstance {
    db: ReturnType<typeof createDb>;
  }
}

export function createDb() {
  const store = new Map<string, Collection>();

  // Private helper
  function getCollection(collection: string) {
    if (!store.has(collection)) {
      store.set(collection, { id: 1, data: new Map() });
    }
    return store.get(collection)!;
  }

  // Public API
  return {
    getAll(collection: string, { limit }: { limit?: number } = {}) {
      const { data } = getCollection(collection);
      const arr = Array.from(data.values());
      return typeof limit === "number" ? arr.slice(0, limit) : arr;
    },

    getById(collection: string, id: number) {
      const { data } = getCollection(collection);
      return data.get(id) ?? null;
    },

    insert(collection: string, entity: Record<string, unknown>) {
      const bucket = getCollection(collection);
      const id = bucket.id++;
      const doc = { id, ...entity };
      bucket.data.set(id, doc);
      return doc;
    },

    update(
      collection: string,
      id: number,
      patch: Record<string, unknown>
    ) {
      const { data } = getCollection(collection);
      const current = data.get(id);
      if (current === undefined) return null;
      const updated = { ...current, ...patch, id };
      data.set(id, updated);
      return updated;
    },

    delete(collection: string, id: number) {
      const { data } = getCollection(collection);
      return data.delete(id);
    },
  };
}

```

Then, import and decorate the Fastify instance:

```ts
// server.ts
import { createDb } from "./db.ts";

app.decorate("db", createDb());
```

## A Repository That Depends on the Database

It’s convenient to have specific services in charge of interacting with our DB.
We’ll then define a repository for quotes.
To ensure the `db` decorator is available first, we’ll declare it as a
dependency (`decorate` signature: `decorate(name, value, [dependencies])`).

```ts
// quotes-repository.ts
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    quotesRepository: ReturnType<typeof createQuotesRepository>;
  }
}

export function createQuotesRepository(app: FastifyInstance) {
  return {
    list(limit?: number) {
      return app.db.getAll("quotes", { limit });
    },
    get(id: number) {
      return app.db.getById("quotes", id);
    },
    create(text: string) {
      return app.db.insert("quotes", { text });
    },
    update(id: number, text: string) {
      return app.db.update("quotes", id, { text });
    },
    remove(id: number) {
      return app.db.delete("quotes", id);
    },
  };
}
```

Then, import and decorate:

```ts
// server.ts
import { createQuotesRepository } from "./quotes-repository.ts";

// Declare dependency on "db" so Fastify enforces 
// decoration in the right order.
app.decorate(
  "quotesRepository",
  createQuotesRepository(app),
  ["db"]
);
```

## Using the Repository in Routes

Update existing routes to call `this.quotesRepository`.
Fastify binds a route handler's `this` value to the instance that owns the
route. Arrow functions capture `this` from the surrounding scope instead, so
use regular functions when a handler accesses an instance decorator this way.
The repository now owns the in-memory state, so remove the old `id` and
`quotes` declarations from `server.ts`.

```ts
// server.ts
app.get<{ Querystring: { limit?: string } }>("/quotes", async function (request, reply) {
  const limit = Number(request.query.limit ?? 10);
  return this.quotesRepository.list(Number.isNaN(limit) ? undefined : limit);
});

app.get<{ Params: { id: string } }>("/quotes/:id", async function (request, reply) {
  const id = Number(request.params.id);
  const quote = this.quotesRepository.get(id);
  if (!quote) {
    reply.code(404);
    return { message: "Quote not found" };
  }
  return quote;
});

app.post<{ Body: { text: string } }>("/quotes", async function (request, reply) {
  const quote = this.quotesRepository.create(request.body.text);
  reply.code(201);
  return quote;
});

app.put<{
  Params: { id: string };
  Body: { text: string };
}>("/quotes/:id", async function (request, reply) {
  const id = Number(request.params.id);
  const updated = this.quotesRepository.update(id, request.body.text);
  if (!updated) {
    reply.code(404);
    return { message: "Quote not found" };
  }
  return updated;
});

app.delete<{ Params: { id: string } }>("/quotes/:id", async function (request, reply) {
  const id = Number(request.params.id);
  const deleted = this.quotesRepository.remove(id);
  if (!deleted) {
    reply.code(404);
    return { message: "Quote not found" };
  }
  return reply.code(204).send();
});
```

## Verify the refactor

If the server from the previous chapter is still running, stop it with
`Ctrl+C`. Start the updated application:

```bash
node server.ts
```

Repeat the curl commands from [Testing Routes](04-defining-routes.md#testing-routes).
The responses should remain the same now that the database decorator and
repository own the in-memory state.

## When to Decorate (short take)

Fastify core plugins frequently decorate **request** and **reply** (e.g., 
`fastify-static` → `reply.sendFile`, `fastify-jwt` → `request.jwtVerify`).

In application code, most of the time you’ll:

* Put **business logic** on the **Fastify instance** (services, repositories).
* Put **scoped per-request data** on **request** decorators 
(e.g., authentication state).

We’ll see examples and deeper explanations for request/reply decorators later 
in the chapters on **hooks** and **authentication**.
