# Configuration

Configuration is part of the application infrastructure.
It should be loaded and validated early, and then exposed consistently to
the rest of the app.

Values such as host and port are small enough to hardcode at first, but they
still define how the application boots and behaves in each environment.
Once those values start to drift across files, shell commands, and test setup,
the application becomes harder to reason about.

For this, the Fastify ecosystem already provides the plugin
[`@fastify/env`](https://github.com/fastify/fastify-env).

Install it:

```bash
npm i @fastify/env
```

## Plugin layout: `app` vs `external`

Before writing the plugin itself, let’s improve our folder structure.

* `plugins/app` for plugins we own.
* `plugins/external` for wrappers around third-party plugins.

Our `plugins` directory now looks like this:

```text
plugins/
  app/
    auth.js
    db.js
    quotes-repo.js
  external/
    env.js
```

In larger applications, responsibilities are often split more aggressively.
But this is enough to keep the examples organized without turning the tutorial
into an architecture discussion.

## External configuration plugin

We will put the configuration logic in `plugins/external/env.js`.

### `plugins/external/env.js`

```js
import fp from 'fastify-plugin'
import fastifyEnv from '@fastify/env'

const schema = {
  type: 'object',
  required: ['HOST', 'PORT'],
  properties: {
    HOST: { type: 'string', default: '0.0.0.0' },
    PORT: { type: 'integer', default: 3000 }
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

Let’s unpack the important pieces:

* `@fastify/env` validates configuration against a schema.
* `confKey: 'config'` means validated values are exposed on the Fastify
  instance as `app.config`.
* `data: options.override ?? process.env` means our wrapper accepts an explicit
  override object, while normal runs still default to `process.env`.

This gives us one clear contract for configuration:
if the application boots, `app.config` is present and valid.

## Loading a `.env` File

At this point, it is worth making one detail explicit:
`@fastify/env` reads from `process.env`, but Fastify does not load a `.env`
file by itself.

There are several ways to provide environment variables:

* directly in the shell,
* through your process manager or deployment platform,
* or from a local `.env` file loaded at process start.

For local development, Node.js can load a `.env` file before the application
starts.
It is useful to define a dedicated `dev` script for that, while keeping
`start` as the more production-like entrypoint.

For example, we can define our `dev` script like this:

```json
{
  "scripts": {
    "dev": "node --watch --env-file=.env server.js"
  }
}
```

And then create a `.env` file:

```dotenv
HOST=127.0.0.1
PORT=3000
```

With this setup, `node --watch --env-file=.env server.js` loads the variables
into `process.env` before `server.js` runs.
Then `@fastify/env` validates them and exposes the result as `app.config`.

## Register configuration first

Configuration should be available before the rest of the application boots.
That way, any later plugin can depend on it when needed.

## Implementation for our application

### `app.js`

```js
import fastify from 'fastify'
import { idParam } from './schemas.js'
import configureErrorHandlers from './error-handlers.js'
import { dbPlugin } from './plugins/app/db.js'
import { quotesRepositoryPlugin } from './plugins/app/quotes-repo.js'
import { envPlugin } from './plugins/external/env.js'
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
  app.register(dbPlugin)
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

The important detail is that `envPlugin` is registered first.
That keeps configuration available before the rest of the application is
assembled.

## Use configuration when starting the server

Now that configuration lives on `app.config`, the HTTP server should use it
instead of hardcoded values.

Because plugin loading is asynchronous, we call `await app.ready()` before
reading `app.config`.

### `server.js`

```js
import closeWithGrace from 'close-with-grace'
import { createApp } from './app.js'

const app = createApp({ logger: true })

closeWithGrace(async ({ err }) => {
  if (err != null) {
    app.log.error(err)
  }

  await app.close()
})

try {
  await app.ready()
  await app.listen({
    host: app.config.HOST,
    port: app.config.PORT
  })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
```

This gives us two immediate benefits:

* Startup fails early if configuration is invalid.
* The server is no longer tied to one host/port pair in source code.

## Update the test helper

Our tests should not depend on the shell environment of the machine running
them.

We already created a dedicated `createTestApp()` helper in the previous chapter.
Now we extend it to inject a stable configuration object.
This keeps the application code close to production while still giving tests
full control over their inputs.

### `test/app.js`

```js
import { createApp } from '../app.js'

export function createTestApp (options = {}) {
  return createApp({
    ...options,
    logger: options.logger ?? false,
    env: {
      HOST: '127.0.0.1',
      PORT: 3000,
      ...options.env
    }
  })
}
```

This keeps tests deterministic and makes config overrides explicit.

## Testing configuration

Since configuration is now part of the application contract, we should test it.
Because this behavior belongs to an external plugin integration, it fits well in
`test/plugins`.

For example:

```js
// test/plugins/env.test.js
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
    PORT: 4321
  })

  await app.close()
})
```

This is also a nice reminder that environment variables usually start as
strings and are coerced into the schema types we declared.

## Manual verification

You can also verify that the server reads configuration correctly by starting it
with a custom port:

```bash
HOST=127.0.0.1 PORT=3001 node server.js
```

Then, in another terminal:

```bash
curl http://127.0.0.1:3001/not-protected
```

Expected response:

```json
{ "ok": true }
```

If the server starts on port `3001`, then configuration is being read and
applied correctly.

## Summary

In this chapter, we introduced configuration as a first-class part of the
application.
We used `@fastify/env` to validate environment variables, exposed them through
`app.config`, organized plugins into `app` and `external`, and updated our test
helper so configuration is stable in tests.
