# Plugins and Encapsulation

Our application now validates input, installs hooks, and handles custom
errors correctly. What it still lacks is structure, scoping, and a way to
limit overhead.

For example, how can we apply hooks and error handlers to only a subset of
routes? How do we expose a decorator to only one part of the application?
Right now everything is defined on the top-level instance, which is
inefficient and not safe.

Plugins solve this.

## Definition

Plugins are cohesive, reusable functions that extend a Fastify
application. A plugin receives a scoped Fastify instance. Inside that
scope it can add routes, decorators, hooks, and any other Fastify
feature.

Example of a simple plugin:

```js
// Define plugin
async function myPlugin(fastify, opts) {
  fastify.decorate('greet', (name) => `Hello, ${name}`);

  fastify.get('/hello/:name', (req, reply) => {
    reply.send({ message: fastify.greet(req.params.name) });
  });
}

// Register plugin
app.register(myPlugin);
```

## Encapsulation

Every call to `register()` creates a child context. Configuration inside a
plugin applies to that plugin and to its descendants. It does not affect
the parent or sibling plugins. This prevents leakage, reduces accidental
side effects, and keeps overhead local to where it is needed.

### Tree representation
```js
// root scope
const app = Fastify();

async function parentPlugin(
  instance // root -> instance scope
) {

  // root -> instance -> childA scope
  await instance.register(async function childA(childA) {
    // code...
  });

  // root -> instance -> childB scope
  await instance.register(async function childB(childB) {
    // code...
  });
}

app.register(parentPlugin);
```

In this tree:
* `app` is the root.
* What the root defines is visible everywhere below.
* What `parentPlugin` defines is visible to `childA` and `childB`, but not to
  `app`.
* What `childA` defines is not visible to `childB`.
* What `childB` defines is not visible to `childA`.

### Feature encapsulation

Decorator encapsulation prevents features from leaking to the parent and
to sibling plugins.

```js
import Fastify from 'fastify';

async function usersPlugin(fastify) {
  fastify.decorate('scope', 'users');

  fastify.get('/users', async function () {
    return { scope: fastify.scope };
  });
}

async function tasksPlugin(fastify) {
  fastify.decorate('scope', 'tasks');

  fastify.get('/tasks', async function () {
    return { scope: fastify.scope };
  });
}

const app = Fastify();

app.decorate('scope', 'root');

app.get('/', async function () {
  return { scope: app.scope };
});

app.register(usersPlugin);
app.register(tasksPlugin);

await app.listen({ port: 3000 });
```

* `GET /users` → `{ scope: "users" }`
* `GET /tasks` → `{ scope: "tasks" }`
* `GET /` → `{ scope: "root" }`

The root does not see what the children define, and children do not see
what their siblings define.

### Lifecycle encapsulation

When the router matches a route, Fastify runs only the hooks that belong
to the same encapsulation context as the route. This keeps work small and
targeted.

```js
import Fastify from 'fastify';

async function usersPlugin(fastify) {
  fastify.addHook('onRequest', async () => {
    fastify.log.info('users onRequest');
  });

  fastify.get('/users', async () => ({ ok: true }));
}

async function tasksPlugin(fastify) {
  fastify.addHook('onRequest', async () => {
    fastify.log.info('tasks onRequest');
  });

  fastify.get('/tasks', async () => ({ ok: true }));
}

const app = Fastify({ logger: true });

app.addHook('onRequest', async () => {
  app.log.info('root onRequest');
});

app.register(usersPlugin);
app.register(tasksPlugin);

await app.listen({ port: 3000 });
```

* `GET /users` logs `root onRequest` and `users onRequest`.
* `GET /tasks` logs `root onRequest` and `tasks onRequest`.
* Hooks in one plugin do not affect sibling plugins.

By the same mechanism you can localize error handling, validation,
serialization, and other behavior inside one plugin without affecting
parents or siblings.

## `fastify-plugin`

`fastify-plugin` is a helper that adds metadata to a plugin and, by
default, **skips encapsulation**. When encapsulation is skipped, the
effects of the plugin (for example, decorators) are promoted to the
parent so sibling plugins can use them.

It also lets you:

* name a plugin.
* declare the required Fastify version.
* declare required decorators on **Fastify**, **Request**, or **Reply**.
* declare dependencies on other plugins.

### Skipping encapsulation

A typical use case that justifies skipping the encapsulation is
if you want a utility to be used across the application and let 
it access its decorators.

```js
import Fastify from 'fastify';
import fp from 'fastify-plugin';

const dbPlugin = fp(
  async function (fastify) {
    fastify.decorate('db', { query: () => 'ok' });
  },
  { name: 'db' } // encapsulation is skipped by default
);

async function routesPlugin(fastify) {
  fastify.get('/needs-db', async function () {
    return { q: fastify.db.query() };
  });
}

const app = Fastify();

// registration order still matters
app.register(dbPlugin);
app.register(routesPlugin);

await app.listen({ port: 3000 });
```

### Keeping encapsulation

You can keep encapsulation and still profit from the metadata features
`fastify-plugin` offers.

```js
import fp from 'fastify-plugin';

const auditPlugin = fp(
  async function (fastify) {
    fastify.decorate('audit', { record: () => true });
  },
  {
    name: 'audit',
    encapsulate: true
  }
);
```

### Adding safety constraints

You can declare what your plugin needs. Fastify will fail fast when the
requirements are not met.

```js
import fp from 'fastify-plugin';

const myFeature = fp(
  async function (fastify) {
    // relies on fastify.db and reply.compress
  },
  {
    name: 'my-feature',
    fastify: '5.x',
    decorators: {
      fastify: ['db']
      // you can also declare required decorators
      // on request and reply
    },
    // plugins that need to be registered before
    dependencies: ['database']
  }
);
```

## Booting the application

Fastify uses
[Avvio](https://github.com/fastify/avvio)
to load plugins in a deterministic way.
Asynchronous loading is nontrivial. Avvio builds and runs a dependency
graph so each plugin starts in a safe, predictable order. A plugin may
also register other plugins during its own initialization.

To tell Fastify to load the current plugin tree, call
`await fastify.ready()`. This loads every plugin that was registered up
to that point and makes their decorators available. The methods
`fastify.listen(...)` and `fastify.inject(...)` call `ready()` for you,
so you usually do not need to call it manually.

### Awaiting a plugin

If you `await` a call to `fastify.register(...)`, Fastify loads that
plugin immediately. At that point its decorators become available. This
is sometimes required.

Note: awaiting one plugin causes Fastify to load all plugins that were
queued before it.

```js
import Fastify from 'fastify';
import fp from 'fastify-plugin';

const app = Fastify();

app.register(
  fp(
    async function (f) {
      f.decorate('a', { query: () => 'ok' });
    },
    { name: 'a' }
  )
);

console.log('app.a', app.a); // undefined (not loaded yet)

await app.register(
  fp(
    async function (f) {
      f.decorate('b', { query: () => 'ok' });
    },
    { name: 'b' }
  )
);

app.register(
  fp(
    async function (f) {
      f.decorate('c', { query: () => 'ok' });
    },
    { name: 'c' }
  )
);

console.log('app.b', app.b); // loaded
console.log('app.a', app.a); // also loaded because plugin b is awaited
console.log('app.c', app.c); // not loaded yet
```

## Implementation for our application

We will refactor the application into small, focused plugins. Each
plugin explains its purpose, then shows its code.

### fastify-plugin

First, install `fastify-plugin`:
```
npm i fastify-plugin
```

### DB plugin

This plugin exposes `app.db` to the rest of the application and closes
the connection on shutdown.

```js
import fp from "fastify-plugin";

// Put `createDb` function here

export const dbPlugin = fp(
  async function dbPlugin(app) {
    app.decorate("db", createDb());

    app.addHook("onClose", async function (instance) {
      instance.log.info("closing database");
      instance.db.close();
    });
  },
  { name: "db" }
);
```

### Quotes repository plugin

This plugin needs the database. It exposes
`app.quotesRepository` so route plugins can query it.

```js
// plugins/quotes-repo.js
import fp from 'fastify-plugin';

// Put `createQuotesRepository` function here

export const quotesRepositoryPlugin = fp(
  async function quotesRepo(app) {
    app.decorate("quotesRepository", createQuotesRepository(app));
  },
  {
    name: "quotes-repo",
    decorators: { fastify: ["db"] },
    dependencies: ["db"],
  }
);
```

### Auth plugin

This plugin adds an authenticated user to the request. It rejects
requests that do not present a valid token.

```js
// plugins/auth.js
export const authPlugin = async function authPlugin(app) {
  app.decorateRequest("user", null);

  app.addHook("onRequest", async function (req, reply) {
    const auth = req.headers["authorization"];

    if (!auth) {
      return reply.code(401).send({ message: "Missing Authorization" });
    }

    if (auth === "Bearer admin") {
      req.user = { role: "admin" };
    } else if (auth === "Bearer user") {
      req.user = { role: "user" };
    } else {
      return reply.code(401).send({ message: "Invalid token" });
    }
  });
};
```

> Security note:
> This plugin is a teaching fake.
> Header tokens like "Bearer user" or
> "Bearer admin" are trivially forgeable
> and offer no real protection.

### Quotes routes (encapsulated)

This plugin defines all `/quotes` routes. It assumes
`app.quotesRepository` exists. It registers all schemas inside its own
scope.

```js
// routes/quotes.js
// plugins/quotes-routes.js
import fp from "fastify-plugin";
import {
  quoteBody,
  listQuery,
  quoteResponse,
  errorMessage,
  listQuotesResponse,
  singleQuoteResponse,
  deleteQuoteResponse,
} from "../schemas.js";

export const quotesRoutesPlugin = fp(
  async function quotesRoutesPlugin(app) {
    // Shared schemas (scoped to this plugin)
    app.addSchema(quoteResponse);
    app.addSchema(errorMessage);

    // Put quotes routes here...
  },
  {
    name: "quotes-routes",
    decorators: {
      // Ensure `quotesRepository` is accessible
      fastify: ["quotesRepository"],
    },
    // Ensure "auth" plugin is registered
    dependencies: ["auth"],
  }
);
```

### Protected routes wrapper

This plugin protects its children by first registering the auth plugin,
then registering any route plugins under it. Everything in this subtree
now requires authentication.

```js
// routes/protected.js
import fp from "fastify-plugin";
import { authPlugin } from "../plugins/auth.js";
import { quotesRoutesPlugin } from "./quotes.js";

export const protectedRoutes = async function protectedRoutes(app) {
  // Register with `fp`, to get apply to the siblings (protected routes plugins)
  // But because `protectedRoutes` plugin is itself encasulate, it does not
  // leak into parent scope, only siblings.
  app.register(fp(authPlugin, { name: 'auth' }));

  await app.register(quotesRoutesPlugin);
  // Any other protected routes...
};
```

### Server assembly

Finally we assemble the server. We load infrastructure plugins first,
then the protected routes, then set up error handling, then start.

```js
const app = fastify({
  logger: true,
  ajv: {
    customOptions: {
      allErrors: false,
      coerceTypes: "array",
      removeAdditional: "all",
    },
  },
});

// Plugins
app.register(dbPlugin)
app.register(quotesRepositoryPlugin)

// Shared schemas
app.addSchema(idParam);

// Routes
app.register(protectedRoutes)

// Testing error handler
app.get("/throw", async function () {
  throw new Error("💥 Kaboom!");
});

// Ensure `protectedRoutes` doesn't leak in root.
app.get("/not-protected", async function () {
  return { ok: true }
});

// Root error handlers
configureErrorHandlers(app)

closeWithGrace(async ({ err }) => {
  if (err != null) {
    app.log.error(err);
  }

  await app.close();
});

try {
  await app.listen({ port: 3000 });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
```

## Testing Access Control

* **Public route**:

```bash
curl -i http://localhost:3000/not-protected
```

Expected:

```
HTTP/1.1 200 OK
{ "ok": true }
```

* **Protected route without Authorization**:

```bash
curl -i http://localhost:3000/quotes
```

Expected:

```
HTTP/1.1 401 Unauthorized
{ "message": "Missing Authorization" }
```

* **Protected route with valid Authorization**:

```bash
curl -i http://localhost:3000/quotes \
  -H "Authorization: Bearer user"
```

Expected:

```
HTTP/1.1 200 OK
[]
```
