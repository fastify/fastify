# CORS

Quote Vault works well as an API, but a browser frontend still has
one more constraint to deal with.

If our frontend runs on another origin such as `http://127.0.0.1:5173`, the
browser will block requests unless the API explicitly allows them.
In practice, this often shows up in the browser console as a message like
`Access to fetch at ... from origin ... has been blocked by CORS policy`.

In this chapter, we are going to:

* explain what CORS solves,
* add `@fastify/cors` to the project,
* expose the allowed frontend origin through configuration,
* register CORS as an external Fastify plugin,
* and test both regular cross-origin requests and preflight requests.

## Why CORS matters

CORS stands for Cross-Origin Resource Sharing.

It extends the browser's same-origin policy.
That policy exists to stop a page from silently reading data from another site
through the user's browser.

Without that isolation, a malicious page could try to read data from:

* internal company tools,
* banking dashboards,
* admin panels,
* or any API that relies on the browser carrying the user's credentials.

CORS is the controlled exception.
It lets the server say, "this specific frontend origin is allowed to read my
responses."

An origin is the combination of:

* protocol,
* host,
* and port.

So `http://127.0.0.1:5173` and `http://127.0.0.1:3000` are different origins
because the ports differ.
Without CORS headers, the API may still answer the request, but the browser
will not expose the response to frontend JavaScript.

This matters even more in Quote Vault because many of our routes use:

* the `Authorization` header,
* JSON request bodies,
* and methods such as `PUT` and `DELETE`.

That often triggers a browser preflight request:
an `OPTIONS` request where the browser asks which origins, methods, and
headers are allowed.
The server answers with headers such as `Access-Control-Allow-Origin`,
`Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers`.

CORS is enforced by browsers, not by HTTP clients in general.
`curl`, Postman, backend scripts, mobile apps, or any custom client can still
send requests to our API whether CORS is enabled or not.

So CORS is a browser isolation rule, not an authentication or authorization
mechanism.
It helps protect users against unintended cross-origin data access, but it does
not prove that a client is trusted and it does not replace CSRF protection.

If you want to study CSRF in more detail, the
[OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
is a strong reference.
Fastify also provides
[`@fastify/csrf-protection`](https://github.com/fastify/csrf-protection),
which offers utilities for adding CSRF protection to Fastify applications.

So we still need server-side protection for the real security checks:

* authentication,
* authorization,
* input validation,
* and any other permission checks our API requires.

## Install the dependency

Fastify exposes CORS through an official plugin:
[`@fastify/cors`](https://github.com/fastify/fastify-cors).

Install it with:

```bash
npm i @fastify/cors
```

## Extend the configuration

We already validate environment variables through `@fastify/env`.
Now we add one more setting so the allowed frontend origin is explicit.

Update your `.env` file:

```dotenv
HOST=127.0.0.1
PORT=3000
CORS_ORIGIN=http://127.0.0.1:5173
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=quote_vault
CAN_CREATE_DATABASE=0
CAN_DROP_DATABASE=0
CAN_SEED_DATABASE=0
```

And keep the example file in sync.

### `.env.example`

```dotenv
HOST=127.0.0.1
PORT=3000
CORS_ORIGIN=http://127.0.0.1:5173
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_USER=your-postgres-user
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_DB=your-postgres-database
CAN_CREATE_DATABASE=0
CAN_DROP_DATABASE=0
CAN_SEED_DATABASE=0
```

### `plugins/external/env.js`

```js
import fp from 'fastify-plugin'
import fastifyEnv from '@fastify/env'

const schema = {
  type: 'object',
  required: [
    'HOST',
    'PORT',
    // New for this chapter: the frontend origin allowed by CORS.
    'CORS_ORIGIN',
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB'
  ],
  properties: {
    HOST: { type: 'string', default: '0.0.0.0' },
    PORT: { type: 'integer', default: 3000 },
    // New for this chapter: validated and exposed as app.config.CORS_ORIGIN.
    CORS_ORIGIN: { type: 'string' },
    POSTGRES_HOST: { type: 'string' },
    POSTGRES_PORT: { type: 'integer' },
    POSTGRES_USER: { type: 'string' },
    POSTGRES_PASSWORD: { type: 'string' },
    POSTGRES_DB: { type: 'string' }
  }
}

export const envPlugin = fp(
  async function envPlugin (app, options) {
    await app.register(fastifyEnv, {
      confKey: 'config',
      schema,
      data: options.override ?? process.env
    })
  },
  { name: 'env' }
)
```

We make `CORS_ORIGIN` required for the same reason we made database settings
explicit in the previous chapter:
the application should not silently guess how it is meant to be used.

## Wrap CORS in an external plugin

CORS support comes from a third-party package, so it belongs in
`plugins/external`.

### `plugins/external/cors.js`

```js
import fp from 'fastify-plugin'
import cors from '@fastify/cors'

export function buildCorsOptions (app) {
  return {
    // Only allow the frontend origin configured for this environment.
    origin: app.config.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
}

export const corsPlugin = fp(
  async function corsPlugin (app, options) {
    await app.register(cors, options.override ?? buildCorsOptions(app))
  },
  {
    name: 'cors',
    dependencies: ['env']
  }
)
```

This keeps the same structure we already use for infrastructure concerns:

* `env` owns validated configuration,
* `cors` translates that configuration into a third-party integration,
* and the rest of the application does not need to know how the plugin is
  wired.

The allowed methods match the routes we expose in Quote Vault.

We also make `Authorization` and `Content-Type` explicit because the browser
will ask about them during preflight checks before calling protected JSON
endpoints such as `POST /quotes`.
 
## Register the plugin

In our implementation, the CORS plugin depends on validated configuration from
`envPlugin`.
That means it should be registered after `envPlugin`, because its options are
built from `app.config.CORS_ORIGIN`.

### `app.js`

```js
import fastify from 'fastify'
import { idParam } from './schemas.js'
import configureErrorHandlers from './error-handlers.js'
import { quotesRepositoryPlugin } from './plugins/app/quotes-repo.js'
// New for this chapter: register the external CORS plugin.
import { corsPlugin } from './plugins/external/cors.js'
import { envPlugin } from './plugins/external/env.js'
import { knexPlugin } from './plugins/external/knex.js'
import { protectedRoutes } from './routes/protected.js'

export function createApp (options = {}) {
  const app = fastify({
    logger: options.logger ?? false,
    ajv: {
      customOptions: {
        allErrors: false,
        coerceTypes: 'array',
        removeAdditional: 'all'
      }
    }
  })

  app.register(envPlugin, { override: options.env })
  // New for this chapter: build CORS options from validated config.
  app.register(corsPlugin, { override: options.cors })
  app.register(knexPlugin, { override: options.knex })
  app.register(quotesRepositoryPlugin)

  app.addSchema(idParam)

  app.register(protectedRoutes)

  configureErrorHandlers(app)

  app.get('/throw', async function () {
    throw new Error('💥 Kaboom!')
  })

  app.get('/not-protected', async function () {
    return { ok: true }
  })

  return app
}
```

At this point, every route in the application benefits from the same CORS
configuration.

## Test the behavior

As with the previous chapters, we want the tutorial code to prove the behavior
instead of only describing it.

The test helper now needs the new environment variable.

### `test/app.js`

```js
import { createApp } from '../app.js'
import { fileURLToPath } from 'node:url'

const migrationsDirectory = fileURLToPath(
  new URL('../migrations', import.meta.url)
)

export function createTestApp (options = {}) {
  const app = createApp({
    ...options,
    logger: options.logger ?? false,
    env: {
      HOST: '127.0.0.1',
      PORT: 3000,
      // New for this chapter: provide a test origin for the CORS plugin.
      CORS_ORIGIN: 'http://127.0.0.1:5173',
      POSTGRES_HOST: '127.0.0.1',
      POSTGRES_PORT: 5432,
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_DB: 'quote_vault',
      ...options.env
    }
  })

  app.addHook('onReady', async function () {
    await this.knex.migrate.latest({
      directory: migrationsDirectory
    })

    await this.knex('quotes').truncate()
  })

  return app
}
```

We should also update the environment plugin test so it reflects the new
startup contract.

### `test/plugins/env.test.js`

```js
import { describe, test } from 'node:test'
import { createTestApp } from '../app.js'

describe('env plugin', () => {
  test('loads validated configuration from the env plugin', async (t) => {
    const app = createTestApp({
      env: {
        HOST: '127.0.0.1',
        PORT: '4321'
      }
    })

    await app.ready()

    t.assert.deepStrictEqual(app.config, {
      HOST: '127.0.0.1',
      PORT: 4321,
      // New for this chapter: assert that the CORS origin is part of config.
      CORS_ORIGIN: 'http://127.0.0.1:5173',
      POSTGRES_HOST: '127.0.0.1',
      POSTGRES_PORT: 5432,
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_DB: 'quote_vault'
    })

    await app.close()
  })
})
```

Now we can add dedicated CORS tests.

### `test/plugins/cors.test.js`

```js
import { describe, test } from 'node:test'
import { createTestApp } from '../app.js'

describe('cors plugin', () => {
  test('adds CORS headers to regular requests from the allowed origin', async (t) => {
    const app = createTestApp()

    const res = await app.inject({
      method: 'GET',
      url: '/not-protected',
      headers: {
        origin: 'http://127.0.0.1:5173'
      }
    })

    t.assert.equal(res.statusCode, 200)
    t.assert.equal(
      res.headers['access-control-allow-origin'],
      'http://127.0.0.1:5173'
    )

    await app.close()
  })

  test('answers preflight requests without going through auth', async (t) => {
    const app = createTestApp()

    const res = await app.inject({
      method: 'OPTIONS',
      url: '/quotes',
      headers: {
        origin: 'http://127.0.0.1:5173',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization,content-type'
      }
    })

    t.assert.equal(res.statusCode, 204)
    t.assert.equal(
      res.headers['access-control-allow-origin'],
      'http://127.0.0.1:5173'
    )
    t.assert.equal(
      res.headers['access-control-allow-methods'],
      'GET, POST, PUT, DELETE'
    )
    t.assert.equal(
      res.headers['access-control-allow-headers'],
      'Content-Type, Authorization'
    )

    await app.close()
  })
})
```

The second test is especially useful.
It proves that an `OPTIONS` preflight request can succeed even though
`/quotes` is otherwise protected by authentication.

That is important because browsers need to complete the preflight before they
attempt the actual `POST`.

## Manual verification

Start the application:

```bash
npm run dev
```

You can inspect a regular cross-origin response by sending an `Origin` header:

```bash
curl -i http://127.0.0.1:3000/not-protected \
  -H 'origin: http://127.0.0.1:5173'
```

You should see:

* `access-control-allow-origin: http://127.0.0.1:5173`

Now simulate a browser preflight request:

```bash
curl -i -X OPTIONS http://127.0.0.1:3000/quotes \
  -H 'origin: http://127.0.0.1:5173' \
  -H 'access-control-request-method: POST' \
  -H 'access-control-request-headers: authorization,content-type'
```

You should get a `204` response with headers similar to:

* `access-control-allow-origin: http://127.0.0.1:5173`
* `access-control-allow-methods: GET, POST, PUT, DELETE`
* `access-control-allow-headers: Content-Type, Authorization`

Finally, try the real request:

```bash
curl -X POST http://127.0.0.1:3000/quotes \
  -H 'origin: http://127.0.0.1:5173' \
  -H 'authorization: Bearer admin' \
  -H 'content-type: application/json' \
  -d '{"text":"Browsers need explicit permissions"}'
```

`curl` itself does not enforce browser CORS rules, but these headers let us
verify that the API is returning the information a browser expects.

## Summary

Quote Vault now supports browser clients running on another origin:

* `@fastify/cors` is installed and wrapped in an external plugin,
* the allowed frontend origin is validated through configuration,
* CORS is registered early in the app lifecycle,
* regular responses include the expected CORS headers,
* and preflight requests succeed before protected JSON routes are called.

At this point, the API is ready to be consumed by a separate frontend without
running into the browser’s same-origin restrictions.
