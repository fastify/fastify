# Decorating Fastify

In this chapter, we’ll extend Fastify using **decorators** — the 
built-in mechanism to attach features and data to:
- the **Fastify instance**,
- the [**Request**](https://fastify.dev/docs/latest/Reference/Request/) object,
- the [**Reply**](https://fastify.dev/docs/latest/Reference/Reply/) object.

We’ll focus on decorating the **Fastify instance** with a small in-memory database and 
a `quotesRepository` built on top of it.  
Later in this tutorial, we’ll explore alternative dependency patterns and 
libraries (e.g. a DI container).

## Why decorators?

Decorators give you a straightforward way to attach capabilities to Fastify. 
Defining these capabilities up front also lets  **V8** optimize memory 
usage by stabilizing the shape of server, request, and reply objects before they’re 
instantiated and used.

Read more about object-shape handling in JS engines [in this article](https://mathiasbynens.be/notes/shapes-ics#shapes).

## Database Decorator

We’ll replace our previous globals:

- `let dbId = 1;`
- `const quotes = [];`

…with a single database that manages multiple collections. Each collection keeps its own `id` 
counter and `Map` of documents.

Because our server file is starting to grow and take on too many responsibilities, let’s **decouple** 
services into separate files.

```js
// db.js
export function createDb() {
  const store = new Map();

  // Private helper
  function getCollection(collection) {
    if (!store.has(collection)) {
      store.set(collection, { id: 1, data: new Map() });
    }
    return store.get(collection);
  }

  // Public API
  return {
    getAll(collection, { limit } = {}) {
      const { data } = getCollection(collection);
      const arr = Array.from(data.values());
      return typeof limit === "number" ? arr.slice(0, limit) : arr;
    },

    getById(collection, id) {
      const { data } = getCollection(collection);
      return data.get(id) ?? null;
    },

    insert(collection, entity) {
      const bucket = getCollection(collection);
      const id = bucket.id++;
      const doc = { id, ...entity };
      bucket.data.set(id, doc);
      return doc;
    },

    update(collection, id, patch) {
      const { data } = getCollection(collection);
      if (!data.has(id)) return null;
      const updated = { ...data.get(id), ...patch };
      data.set(id, updated);
      return updated;
    },

    delete(collection, id) {
      const { data } = getCollection(collection);
      return data.delete(id);
    },
  };
}
````

Then, import and decorate the Fastify instance:

```js
// server.js (excerpt)
import { createDb } from "./db.js";

// IMPORTANT: Avoid arrow functions for decorators/handlers where `this` must be Fastify.
app.decorate("db", createDb());
```

## A Repository That Depends on the Database

It’s convenient to have specific services in charge of interacting with our DB.
We’ll define a repository for quotes.
To ensure the `db` decorator is available first, we’ll declare it as a dependency
with `decorate(name, value, [dependencies])`.

```js
// quotes-repository.js
export function createQuotesRepository(app) {
  return {
    list(limit) {
      return app.db.getAll("quotes", { limit });
    },
    get(id) {
      return app.db.getById("quotes", id);
    },
    create(text) {
      return app.db.insert("quotes", { text });
    },
    update(id, text) {
      return app.db.update("quotes", id, { text });
    },
    remove(id) {
      return app.db.delete("quotes", id);
    },
  };
}
```

Then, import and decorate:

```js
// server.js (excerpt)
import { createQuotesRepository } from "./quotes-repository.js";

// Declare dependency on "db" so Fastify enforces registration order.
// Will throw [FST_ERR_DEC_MISSING_DEPENDENCY] if `db` is not available.
app.decorate(
  "quotesRepository",
  createQuotesRepository(app),
  ["db"]
);
```

## Using the Repository in Routes

Update existing routes to call `this.quotesRepository.*`. 
Keep **regular function syntax** so `this` is the `FastifyInstance`.

```js
// server.js
app.get("/quotes", async function (request, reply) {
  // IMPORTANT: Avoid arrow functions for decorators/handlers where `this` must be Fastify.
  const limit = Number(request.query.limit ?? 10);
  return this.quotesRepository.list(Number.isNaN(limit) ? undefined : limit);
});

app.get("/quotes/:id", async function (request, reply) {
  const id = Number(request.params.id);
  const quote = this.quotesRepository.get(id);
  if (!quote) {
    reply.code(404);
    return { message: "Quote not found" };
  }
  return quote;
});

app.post("/quotes", async function (request, reply) {
  const quote = this.quotesRepository.create(request.body.text);
  reply.code(201);
  return quote;
});

app.put("/quotes/:id", async function (request, reply) {
  const id = Number(request.params.id);
  const updated = this.quotesRepository.update(id, request.body.text);
  if (!updated) {
    reply.code(404);
    return { message: "Quote not found" };
  }
  return updated;
});

app.delete("/quotes/:id", async function (request, reply) {
  const id = Number(request.params.id);
  const deleted = this.quotesRepository.remove(id);
  if (!deleted) {
    reply.code(404);
    return { message: "Quote not found" };
  }
  reply.code(204).send();
});
```

## When to Decorate (short take)

Fastify core plugins frequently decorate **request** and **reply** 
for convenience (e.g., 
`fastify-static` → `reply.sendFile`, `fastify-jwt` → `request.jwtVerify`).

In application code, most of the time you’ll:

* Put **business logic** on the **Fastify instance** (services, repositories).
* Put **scoped per-request data** on **request** decorators 
(e.g., authentication state).

We’ll see examples and deeper explanations for request/reply decorators later 
in the chapters on **hooks** and **authentication**.

## Internals involves

To continue...