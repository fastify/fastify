# Organizing Application Plugins

Quote Vault now has plugins, routes, schemas, repositories, and tests. The code
is still split mainly by technical type:

```text
.
├── schemas.ts
├── error-handlers.ts
├── plugins/
│   ├── auth.ts
│   ├── db.ts
│   └── quotes-repo.ts
└── routes/
    ├── protected.ts
    └── quotes.ts
```

That layout was useful while learning each Fastify concept. As the application
grows, it becomes easier to work on a feature when its related code lives
together.

This chapter changes structure only. The API behavior remains the same.

## Separate application domains from infrastructure

We will use two top-level plugin groups:

* `plugins/app` contains behavior specific to Quote Vault.
* `plugins/infrastructure` connects the application to configuration,
  databases, caches, and third-party Fastify plugins.

A repository belongs to its application domain because its queries express
application behavior. For example, the quote repository belongs in
`plugins/app/quotes` even when it later uses Knex. The infrastructure layer
will create and close the shared Knex client.

This distinction is about responsibility, not where a dependency comes from.
Application features may use official Fastify plugins, independent libraries,
or code written from scratch.

## Organize application code by domain

Move the existing files into this structure:

```text
plugins/
  app/
    authentication/
      authentication.hooks.ts
      authentication.plugin.ts
    errors/
      error.handlers.ts
      errors.plugin.ts
    quotes/
      quotes-database.service.ts
      quotes.plugin.ts
      quotes.repository.ts
      quotes.routes.ts
      schemas.ts
  infrastructure/
app.ts
server.ts
```

The `infrastructure` directory is empty for now. The next chapter will add
validated configuration to it.

A domain contains only the parts it needs:

* `.routes.ts` declares HTTP routes.
* `.hooks.ts` contains Fastify lifecycle or access-control hooks.
* `.service.ts` implements reusable behavior or manages a resource.
* `.repository.ts` isolates persistence operations.
* `schemas.ts` owns the domain's JSON Schemas.
* `.handlers.ts` contains standalone HTTP handlers.
* `<domain>.plugin.ts` is the public entry point for the domain.

Route plugins should normally keep Fastify's encapsulation. When a route
module is wrapped with `fastify-plugin`, set `encapsulate: true` explicitly:
the wrapper otherwise disables encapsulation by default. A flattened route
plugin can expose its schemas, decorators, and hooks beyond the intended
domain.

Only flatten a plugin when another domain deliberately needs behavior from it.
Record that decision next to the plugin metadata and reconsider it whenever
the plugin gains a hook.

### Encapsulation applies to one registration at a time

`fastify-plugin` skips the encapsulation boundary of the plugin it wraps. It
does not recursively skip the boundaries of plugins registered by that
plugin:

```ts
import fastify from 'fastify'
import fp from 'fastify-plugin'

const entryPlugin = fp(async function entryPlugin (app) {
  app.decorate('entryValue', 'shared')

  app.register(async function childPlugin (child) {
    child.decorate('childValue', 'local')
  })
})

const app = fastify()
app.register(entryPlugin)

await app.ready()

console.log(app.hasDecorator('entryValue')) // true
console.log(app.hasDecorator('childValue')) // false
```

The direct decoration is shared with the parent because `entryPlugin` is
wrapped. The call to `register(childPlugin)` still creates a child context, so
the child's decoration stays local.

This gives an entry point precise control over its internals. A child plugin
can also use `fastify-plugin` when its behavior must reach the entry point's
scope, or it can remain encapsulated when its routes and decorations should
stay private. We will use both forms below: authentication hooks are shared
with application domains, while quote routes remain encapsulated.

Move the files as follows:

| Before | After |
| --- | --- |
| `plugins/auth.ts` | `plugins/app/authentication/authentication.hooks.ts` |
| `plugins/db.ts` | `plugins/app/quotes/quotes-database.service.ts` |
| `plugins/quotes-repo.ts` | `plugins/app/quotes/quotes.repository.ts` |
| `routes/quotes.ts` | `plugins/app/quotes/quotes.routes.ts` |
| `schemas.ts` | `plugins/app/quotes/schemas.ts` |
| `error-handlers.ts` | `plugins/app/errors/error.handlers.ts` |

The `routes/protected.ts` wrapper is replaced by domain composition in
`app.ts`, so it no longer needs its own file.

Update relative imports, exported identifiers, and plugin metadata together.
Plugin dependencies use metadata names, so they must follow the new domain
vocabulary too:

| File | Export | Plugin name |
| --- | --- | --- |
| `authentication.hooks.ts` | `authenticationHooksPlugin` | `authentication-hooks` |
| `quotes-database.service.ts` | `quotesDatabaseServicePlugin` | `quotes-database` |
| `quotes.repository.ts` | `quotesRepositoryPlugin` | `quotes-repository` |
| `quotes.routes.ts` | `quotesRoutesPlugin` | `quotes-routes` |

## Give each domain one entry point

`app.ts` should not need to know how a domain is assembled. It will register
one entry point per domain.

### Share authentication with application domains

The quote domain will be a child of the application scope. Its routes must
inherit authentication from that scope, so wrap the moved hook plugin and give
it its new metadata name:

#### `plugins/app/authentication/authentication.hooks.ts`

```ts
import fp from 'fastify-plugin'

interface User {
  role: 'admin' | 'user'
}

declare module 'fastify' {
  interface FastifyRequest {
    user: User | null
  }
}

export const authenticationHooksPlugin = fp(
  async function authenticationHooksPlugin (app) {
    app.decorateRequest('user', null)

    app.addHook('onRequest', async function (request, reply) {
      const auth = request.headers.authorization

      if (auth == null) {
        return reply.code(401).send({
          message: 'Missing Authorization'
        })
      }

      if (auth === 'Bearer admin') {
        request.user = { role: 'admin' }
      } else if (auth === 'Bearer user') {
        request.user = { role: 'user' }
      } else {
        return reply.code(401).send({
          message: 'Invalid token'
        })
      }
    })
  },
  { name: 'authentication-hooks' }
)
```

Create the authentication entry point in
`plugins/app/authentication/authentication.plugin.ts`:

```ts
import fp from 'fastify-plugin'
import {
  authenticationHooksPlugin
} from './authentication.hooks.ts'

export const authenticationPlugin = fp(
  async function authenticationPlugin (app) {
    app.register(authenticationHooksPlugin)
  },
  {
    // Shared so the quote domain inherits the teaching authentication hook.
    // Reassess this boundary whenever the hook changes.
    name: 'authentication'
  }
)
```

Both registrations deliberately skip their own boundary. The authentication
entry point reaches the application scope, and its hook plugin reaches the
entry point's scope. The quote domain can therefore inherit the hook while its
own routes remain encapsulated.

### Encapsulate the quote domain

Unlike authentication, the quote repository and routes belong only to their
domain. Create
`plugins/app/quotes/quotes.plugin.ts`:

```ts
import fp from 'fastify-plugin'
import {
  quotesDatabaseServicePlugin
} from './quotes-database.service.ts'
import { quotesRepositoryPlugin } from './quotes.repository.ts'
import { quotesRoutesPlugin } from './quotes.routes.ts'

export const quotesPlugin = fp(
  async function quotesPlugin (app) {
    app.register(quotesDatabaseServicePlugin)
    app.register(quotesRepositoryPlugin)
    app.register(quotesRoutesPlugin)
  },
  {
    name: 'quotes',
    encapsulate: true,
    dependencies: ['authentication']
  }
)
```

The domain entry point owns the registration order of its database service,
repository, and routes. `encapsulate: true` keeps its decorations and hooks
inside the quote domain.

In `quotes-database.service.ts`, rename the plugin export and change its
metadata from `{ name: 'db' }` to `{ name: 'quotes-database' }`.

Update the metadata on the internal modules as they move. For example, the
repository declares that it needs the renamed database plugin and decoration:

```ts
export const quotesRepositoryPlugin = fp(
  async function quotesRepositoryPlugin (app) {
    app.decorate('quotesRepository', createQuotesRepository(app))
  },
  {
    name: 'quotes-repository',
    dependencies: ['quotes-database'],
    decorators: { fastify: ['db'] }
  }
)
```

Register quote schemas in `quotes.routes.ts`, next to the routes that consume
them. The repository remains responsible only for persistence.

The route plugin depends on the shared authentication hook and the quote
repository. Update those names while keeping the route context encapsulated:

```ts
export const quotesRoutesPlugin = fp(
  quotesRoutes,
  {
    name: 'quotes-routes',
    encapsulate: true,
    dependencies: [
      'authentication-hooks',
      'quotes-repository'
    ],
    decorators: {
      fastify: ['quotesRepository']
    }
  }
)
```

The errors folder also gets a small entry point:

```ts
import fp from 'fastify-plugin'
import configureErrorHandlers from './error.handlers.ts'

// Error handlers are intentionally shared with every application domain.
// Most HTTP plugins should stay encapsulated instead of using this pattern.
export const errorsPlugin = fp(
  async function errorsPlugin (app) {
    configureErrorHandlers(app)
  },
  {
    name: 'errors'
  }
)
```

## Compose domains in `app.ts`

The root now imports domain entry points instead of their internal parts:

```ts
import fastify from 'fastify'
import {
  authenticationPlugin
} from './plugins/app/authentication/authentication.plugin.ts'
import { errorsPlugin } from './plugins/app/errors/errors.plugin.ts'
import { quotesPlugin } from './plugins/app/quotes/quotes.plugin.ts'
import type { FastifyServerOptions } from 'fastify'

export interface AppOptions {
  logger?: FastifyServerOptions['logger']
}

export function createApp (options: AppOptions = {}) {
  const app = fastify({
    logger: options.logger,
    forceCloseConnections: false,
    ajv: {
      customOptions: {
        allErrors: false,
        coerceTypes: 'array',
        removeAdditional: 'all'
      }
    }
  })

  app.register(errorsPlugin)

  app.register(async function application (app) {
    app.register(authenticationPlugin)
    app.register(quotesPlugin)
  })

  app.get('/throw', async function () {
    throw new Error('💥 Kaboom!')
  })

  app.get('/not-protected', async function () {
    return { ok: true }
  })

  return app
}
```

The application scope remains encapsulated, so its authentication hook does
not leak to `/not-protected`. Inside that scope, the `authentication` domain is
registered before the `quotes` domain that depends on it.

## Organize tests by domain

The test layout should evolve with the application layout. Keep the shared
test factory and application-composition test at the root, then group domain
tests under the plugin they exercise:

```text
test/
  app.ts
  app.test.ts
  plugins/
    app/
      authentication/
        authentication.test.ts
      quotes/
        quotes.test.ts
        quotes-database.service.test.ts
```

Move the existing files:

| Before | After |
| --- | --- |
| `test/auth.test.ts` | `test/plugins/app/authentication/authentication.test.ts` |
| `test/quotes.test.ts` | `test/plugins/app/quotes/quotes.test.ts` |
| `test/plugins/db.test.ts` | `test/plugins/app/quotes/quotes-database.service.test.ts` |

`test/app.test.ts` remains at the test root because it verifies application
composition, public routes, and global error handling. `test/app.ts` also stays
there because it is shared by every test domain.

After moving the authentication and quote route tests, update their test-helper
import:

```ts
import { createTestApp } from '../../../app.ts'
```

Their assertions remain unchanged.

The database service now lives inside the encapsulated quote domain, so the
root instance returned by `createTestApp()` should not expose `app.db`. Test
the service plugin in its own Fastify scope instead:

### `test/plugins/app/quotes/quotes-database.service.test.ts`

```ts
import fastify from 'fastify'
import { test, type TestContext } from 'node:test'
import {
  quotesDatabaseServicePlugin
} from '../../../../plugins/app/quotes/quotes-database.service.ts'

test('closes the database resource', async (t: TestContext) => {
  const app = fastify()
  t.after(() => app.close())
  app.register(quotesDatabaseServicePlugin)

  await app.ready()
  const database = app.db

  t.assert.equal(database.started, true)
  t.assert.deepStrictEqual(database.getAll('quotes'), [])

  await app.close()
  t.assert.equal(database.started, false)
})
```

The endpoint tests exercise the complete application tree. This focused test
creates the database service as a root plugin because it needs direct access
to the private resource whose shutdown it verifies.

## Verify behavior

This refactor should not change any response:

```bash
npm test
```

The same tests proving authentication, quote behavior, error handling, and
coverage should still pass.

## Summary

Quote Vault is now organized around application domains and infrastructure:

* repositories stay with the domain whose data they represent,
* filename suffixes expose module responsibilities,
* each domain has one `<domain>.plugin.ts` entry point,
* and Fastify encapsulation controls which behavior domains share.

The next chapter adds validated configuration as the first infrastructure
integration.
