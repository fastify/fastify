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

## Infrastructure configuration plugin

The previous chapter reserved `plugins/infrastructure` for adapters around
third-party plugins. Configuration is its first integration.

### `plugins/infrastructure/env.ts`

```ts
import fp from 'fastify-plugin'
import fastifyEnv from '@fastify/env'

export interface AppConfig {
  HOST: string
  PORT: number
}

export type AppConfigInput = {
  [Key in keyof AppConfig]?: AppConfig[Key] | string
}

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig
  }
}

interface EnvPluginOptions {
  override?: AppConfigInput
}

const schema = {
  type: 'object',
  required: ['HOST', 'PORT'],
  properties: {
    HOST: { type: 'string', default: '0.0.0.0' },
    PORT: { type: 'integer', default: 3000 }
  }
}

export const envPlugin = fp<EnvPluginOptions>(
  async function envPlugin (app, options) {
    await app.register(fastifyEnv, {
      confKey: 'config',
      schema,
      data: options.override
    })
  },
  { name: 'env' }
)
```

Let’s unpack the important pieces:

* `@fastify/env` validates configuration against a schema.
* `confKey: 'config'` means validated values are exposed on the Fastify
  instance as `app.config`.
* `@fastify/env` reads `process.env` by default.
* `data: options.override` lets tests and other callers provide explicit values
  without modifying the process environment.

This gives us one clear contract for configuration:
if the application boots, `app.config` is present and valid.

### `plugins/infrastructure/infrastructure.plugin.ts`

As with an application domain, infrastructure has one entry point:

```ts
import fp from 'fastify-plugin'
import { envPlugin } from './env.ts'
import type { AppConfigInput } from './env.ts'

export interface InfrastructureOptions {
  env?: AppConfigInput
}

export const infrastructurePlugin = fp<InfrastructureOptions>(
  async function infrastructurePlugin (app, options) {
    app.register(envPlugin, { override: options.env })
  },
  { name: 'infrastructure' }
)
```

The entry point is wrapped with `fastify-plugin` so `app.config` is visible to
the application scope registered after it. Later infrastructure integrations
will be added here instead of imported individually by `app.ts`.

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
    "dev": "node --watch --env-file=.env server.ts"
  }
}
```

And then create a `.env` file:

```dotenv
HOST=127.0.0.1
PORT=3000
```

Keep the discoverable local defaults in `.env.example`:

```dotenv
HOST=127.0.0.1
PORT=3000
```

Create the local file from that example:

```bash
cp .env.example .env
```

With this setup, `node --watch --env-file=.env server.ts` loads the variables
into `process.env` before `server.ts` runs.
Then `@fastify/env` validates them and exposes the result as `app.config`.

## Register configuration first

Configuration should be available before the rest of the application boots.
That way, any later plugin can depend on it when needed.

## Implementation for our application

### `app.ts`

```ts
import fastify from 'fastify'
import {
  authenticationPlugin
} from './plugins/app/authentication/authentication.plugin.ts'
import { errorsPlugin } from './plugins/app/errors/errors.plugin.ts'
import { quotesPlugin } from './plugins/app/quotes/quotes.plugin.ts'
import {
  infrastructurePlugin
} from './plugins/infrastructure/infrastructure.plugin.ts'
import type { FastifyServerOptions } from 'fastify'
import type {
  InfrastructureOptions
} from './plugins/infrastructure/infrastructure.plugin.ts'

export interface AppOptions extends InfrastructureOptions {
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

  app.register(infrastructurePlugin, options)
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

The infrastructure entry point is registered before the application scope.
It owns the configuration override and makes validated configuration available
to every domain.

## Use configuration when starting the server

Now that configuration lives on `app.config`, the HTTP server should use it
instead of hardcoded values.

Because plugin loading is asynchronous, we call `await app.ready()` before
reading `app.config`.

### `server.ts`

```ts
import closeWithGrace from 'close-with-grace'
import { createApp } from './app.ts'

const app = createApp({ logger: true })

closeWithGrace(
  { delay: 15_000 },
  async function ({ err }) {
    if (err != null) {
      app.log.error(err)
    }

    await app.close()
  }
)

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

### `test/app.ts`

```ts
import { createApp } from '../app.ts'
import type { AppOptions } from '../app.ts'

export function createTestApp (options: AppOptions = {}) {
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

Since configuration is now part of the application contract, we should test
it. Because this behavior belongs to an infrastructure integration, it fits
in `test/plugins/infrastructure`.

For example:

```ts
// test/plugins/infrastructure/env.test.ts
import { test, type TestContext } from 'node:test'
import { createTestApp } from '../../app.ts'

test('loads validated configuration from the env plugin', async (t: TestContext) => {
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
HOST=127.0.0.1 PORT=3001 node server.ts
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
`app.config`, and updated our test helper so configuration is stable in tests.
