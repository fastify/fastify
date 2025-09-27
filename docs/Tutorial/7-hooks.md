# Hooks

So far, our application has been configured very simply.
We just created the app, registered routes, and started the server.
Each request goes straight through the route handler.

This works fine for very simple cases, but often we need to perform operations
at precise moments during **application setup** or the **request/reply lifecycle**.
Examples include authentication, logging, resource cleanup, and response shaping.

To address this, Fastify provides **hooks** – functions that run automatically
at specific points in the server or request lifecycle.

## Two families of hooks

Fastify defines two groups of hooks:

* **Application hooks** – run during server boot and shutdown:
  `onRoute`, `onRegister`, `onReady`, `onListen`, `preClose`, `onClose`.

* **Lifecycle hooks** – run during request lifecycle:
  `onTimeout`, `onRequest`, `preParsing`, `preValidation`, `preHandler`,
  `preSerialization`, `onSend`, `onResponse`, `onError`, `onRequestAbort`.

In this chapter, we’ll focus only on three:
`onRequest`, `preHandler`, and `onClose`.

For the full list and details, consult the [documentation](https://fastify.dev/docs/latest/Reference/Hooks/).

## Hook declaration paradigms

Hooks support two async paradigms:

1. **Async/Promise**

   ```js
   app.addHook('onRequest', async (request, reply) => {
     // await something
   });
   ```

2. **Callback** with `done`

   ```js
   app.addHook('onRequest', (request, reply, done) => {
     done(); // or done(err)
   });
   ```

> It is recommended to **not mix them**. 
> Pick one paradigm and stick to it.

In this tutorial, we’ll use **async/Promise** consistently.

## Request lifecycle

Hooks are attached at precise points in the request pipeline.
Here is the simplified flow:

```
Incoming Request
  │
  └─▶ Routing
        │
        └─▶ Instance Logger
             │
   4**/5** ◀─┴─▶ onRequest Hook
                  │
        4**/5** ◀─┴─▶ preParsing Hook
                        │
              4**/5** ◀─┴─▶ Parsing
                             │
                   4**/5** ◀─┴─▶ preValidation Hook
                                  │
                            400 ◀─┴─▶ Validation
                                        │
                              4**/5** ◀─┴─▶ preHandler Hook
                                              │
                                    4**/5** ◀─┴─▶ User Handler
                                                    │
                                                    └─▶ Reply
                                                          │
                                                4**/5** ◀─┴─▶ preSerialization Hook
                                                                │
                                                                └─▶ onSend Hook
                                                                      │
                                                            4**/5** ◀─┴─▶ Outgoing Response
                                                                            │
                                                                            └─▶ onResponse Hook
```

> source: [https://fastify.dev/docs/latest/Reference/Lifecycle/#lifecycle](https://fastify.dev/docs/latest/Reference/Lifecycle/#lifecycle)

## Responding early from a hook

Sometimes you want to end a request before the route handler runs (e.g. authentication).

If you send a reply in a hook, the rest of the hooks and the route handler are skipped.

```js
// Stop request if no Authorization header
app.addHook('onRequest', async (request, reply) => {
  if (!request.headers['authorization']) {
    return reply.code(401).send({ message: 'Missing Authorization' });
  }
});
```

> **Rule of thumb:** Do the work **as early as possible.**
> In the example above, the `Authorization` header is required and checked in 
> `onRequest` instead of `preHandler`.
> That way, Fastify doesn’t waste time parsing the body and validating data 
> before rejecting the request.

## Implementation for our application

We’ll add three hooks to *Quote Vault*:

1. **`onClose`** – clean up our fake database when the server shuts down.
2. **`onRequest`** – attach a fake user object based on the `Authorization` header.
3. **`preHandler`** – ensure only an admin can delete quotes.

### Close resources on our fake DB

We’ll add a `close` method so we can release resources in `onClose`:

```js
export function createDb() {
  const store = new Map();
  let started = true;

  function getCollection(collection) {
    if (!store.has(collection)) {
      store.set(collection, { id: 1, data: new Map() });
    }
    return store.get(collection);
  }

  return {
    started,
    // existing methods...

    close() {
      // Here it’s only a flag, but a real DB would
      // close connections and free resources.
      started = false;
    }
  };
}
```

> Later we’ll do this with a real database.
> For now we just illustrate the Fastify fundamentals.

And the hook will be registered like this:

```js
// Clean up fake db resources
app.addHook('onClose', async function (instance) {
  instance.log.info('closing database');
  instance.db.close();
});
```

### Authenticate a user

We’ll store the parsed user info on `request.user`.
To do this optimally, we must declare the field upfront using `decorateRequest`:

```js
app.decorateRequest('user', null);
```

This creates the property on the request object with an initial `null` value.
This is important because it fixes the shape of `Request`/`Reply` instances 
before they are used.
Read this article for more information:
[JavaScript engine fundamentals: Shapes and Inline Caches](https://mathiasbynens.be/notes/shapes-ics)


We use `null` instead of a default object because Fastify
**blocks decorating with reference types** (like `{}` or `[]`).
If you used an object, it would be shared across all requests – leading 
to security issues and memory leaks.

We can then declare the `onRequest` hook:

```js
app.decorateRequest('user', null);

app.addHook("onRequest", async function (request, reply) {
    const auth = request.headers["authorization"];
    if (!auth) {
      return reply.code(401).send({ message: "Missing Authorization" });
    }
    
    if (auth === "Bearer admin") {
      request.user = { role: "admin" };
    } else if (auth === "Bearer user") {
      request.user = { role: "user" };
    } else {
      return reply.code(401).send({ message: "Invalid token" });
    }
  });
```

> Again, this is just for illustration.
> We’ll implement a similar mechanism later, but with real, secure authentication.

### Hooks configuration

We put all the logic into a `configureHooks` function in its own file `hooks.js`:

```js
// hooks.js
export default function configureHooks(app) {
  // Add onClose hook here...

  app.decorateRequest('user', null);
  // Add onRequest hook here...
}
```

### Register in `server.js`

```js
// server.js
import configureHooks from './hooks.js';

// after decorations
configureHooks(app)
```

## Route-level hooks with `preHandler`

Sometimes, we want to apply extra checks on a **specific route only**.
The `preHandler` hook runs **just before the route handler**.

For example, our `delete` endpoint should only be accessible to admins:

```js
app.delete(
  "/quotes/:id",
  {
    schema: {
      params: { $ref: "idParam#" },
      response: {
        ...deleteQuoteResponse,
        403: { $ref: "errorMessage#" }
      },
    },
    preHandler: async function (request, reply) {
      if (request.user?.role !== 'admin') {
        reply.code(403);
        return reply.send({ message: "Admin only" });
      }
    },
  },
  function (request, reply) {
    const deleted = this.quotesRepository.remove(request.params.id);
    if (!deleted) {
      reply.code(404);
      return { message: "Quote not found" };
    }
    reply.code(204).send();
  }
);
```

## Testing hooks

Here are a few focused requests to confirm that hooks work as expected:

* **Missing Authorization header**:

```bash
curl -i http://localhost:3000/quotes
```

Expected: `401 Unauthorized` – missing header.

* **Invalid token**:

```bash
curl -i http://localhost:3000/quotes \
  -H "Authorization: Bearer hacker"
```

Expected: `401 Unauthorized` – invalid token.

* **User can list but not delete**:

```bash
curl -i http://localhost:3000/quotes \
  -H "Authorization: Bearer user"
```

Expected: `200 OK` – quotes are returned.

```bash
curl -i -X DELETE http://localhost:3000/quotes/1 \
  -H "Authorization: Bearer user"
```

Expected: `403 Forbidden` – only admins can delete.

* **Admin can delete**:

```bash
curl -i -X DELETE http://localhost:3000/quotes/1 \
  -H "Authorization: Bearer admin"
```

Expected: `204 No Content` – quote successfully deleted.
Or 404 if the quote doesn't exist.
