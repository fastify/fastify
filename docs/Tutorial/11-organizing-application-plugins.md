# Organizing Application Plugins

Quote Vault now has plugins, routes, schemas, repositories, and tests. The code
is still split mainly by technical type:

```text
plugins/
  auth.js
  db.js
  quotes-repo.js
routes/
  protected.js
  quotes.js
schemas.js
error-handlers.js
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
      authentication.hooks.js
      authentication.plugin.js
    errors/
      error.handlers.js
      errors.plugin.js
    quotes/
      quotes-database.service.js
      quotes.plugin.js
      quotes.repository.js
      quotes.routes.js
      schemas.js
  infrastructure/
app.js
server.js
```

The `infrastructure` directory is empty for now. The next chapter will add
validated configuration to it.

A domain contains only the parts it needs:

* `.routes.js` declares HTTP routes.
* `.hooks.js` contains Fastify lifecycle or access-control hooks.
* `.service.js` implements reusable behavior or manages a resource.
* `.repository.js` isolates persistence operations.
* `schemas.js` owns the domain's JSON Schemas.
* `.handlers.js` contains standalone HTTP handlers.
* `<domain>.plugin.js` is the public entry point for the domain.

Route plugins should normally keep Fastify's encapsulation. When a route
module is wrapped with `fastify-plugin`, set `encapsulate: true` explicitly:
the wrapper otherwise disables encapsulation by default. A flattened route
plugin can expose its schemas, decorators, and hooks beyond the intended
domain.

Only flatten a plugin when another domain deliberately needs behavior from it.
Record that decision next to the plugin metadata and reconsider it whenever
the plugin gains a hook.

Move the files as follows:

| Before | After |
| --- | --- |
| `plugins/auth.js` | `plugins/app/authentication/authentication.hooks.js` |
| `plugins/db.js` | `plugins/app/quotes/quotes-database.service.js` |
| `plugins/quotes-repo.js` | `plugins/app/quotes/quotes.repository.js` |
| `routes/quotes.js` | `plugins/app/quotes/quotes.routes.js` |
| `schemas.js` | `plugins/app/quotes/schemas.js` |
| `error-handlers.js` | `plugins/app/errors/error.handlers.js` |

The `routes/protected.js` wrapper is replaced by domain composition in
`app.js`, so it no longer needs its own file.

Update relative imports and rename the existing exports to describe their
responsibilities:

```js
authenticationHooksPlugin
quotesDatabaseServicePlugin
quotesRepositoryPlugin
quotesRoutesPlugin
```

## Give each domain one entry point

`app.js` should not need to know how a domain is assembled. Create
`plugins/app/quotes/quotes.plugin.js`:

```js
import fp from 'fastify-plugin'
import {
  quotesDatabaseServicePlugin
} from './quotes-database.service.js'
import { quotesRepositoryPlugin } from './quotes.repository.js'
import { quotesRoutesPlugin } from './quotes.routes.js'

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

Keep the existing plugin metadata on the internal modules. For example, the
repository still declares that it needs the database decoration:

```js
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

Register quote schemas in `quotes.routes.js`, next to the routes that consume
them. The repository remains responsible only for persistence.

Create the authentication entry point in
`plugins/app/authentication/authentication.plugin.js`:

```js
import fp from 'fastify-plugin'
import {
  authenticationHooksPlugin
} from './authentication.hooks.js'

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

This entry point is not encapsulated because the quote domain must inherit its
authentication hook. This is a deliberate use of `fastify-plugin`: it exposes
shared domain behavior to plugins registered after it in the same application
scope.

The errors folder also gets a small entry point:

```js
import fp from 'fastify-plugin'
import configureErrorHandlers from './error.handlers.js'

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

## Compose domains in `app.js`

The root now imports domain entry points instead of their internal parts:

```js
import fastify from 'fastify'
import {
  authenticationPlugin
} from './plugins/app/authentication/authentication.plugin.js'
import { errorsPlugin } from './plugins/app/errors/errors.plugin.js'
import { quotesPlugin } from './plugins/app/quotes/quotes.plugin.js'

export function createApp (options = {}) {
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
  app.js
  app.test.js
  plugins/
    app/
      authentication/
        authentication.test.js
      quotes/
        quotes.test.js
        quotes-database.service.test.js
```

Move the existing files:

| Before | After |
| --- | --- |
| `test/auth.test.js` | `test/plugins/app/authentication/authentication.test.js` |
| `test/quotes.test.js` | `test/plugins/app/quotes/quotes.test.js` |
| `test/plugins/db.test.js` | `test/plugins/app/quotes/quotes-database.service.test.js` |

`test/app.test.js` remains at the test root because it verifies application
composition, public routes, and global error handling. `test/app.js` also stays
there because it is shared by every test domain.

After moving the three files, update their test-helper import:

```js
import { createTestApp } from '../../../app.js'
```

Only the paths change in this chapter. Keep the assertions from the previous
chapter unchanged.

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
* each domain has one `<domain>.plugin.js` entry point,
* and Fastify encapsulation controls which behavior domains share.

The next chapter adds validated configuration as the first infrastructure
integration.
