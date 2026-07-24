# Rate limiting

<!--
Editorial TODO: add the authentication chapter before this chapter, then update
the demo so authenticated routes use the authenticated subject as their
rate-limit key. Keep IP-based limits for unauthenticated endpoints.
-->

Quote Vault can now serve a browser frontend on another origin.
That also means the API is easier to call repeatedly, whether the client is
well behaved or not.

In this chapter, we are going to:

* explain what rate limiting protects,
* compare local and shared rate-limit state,
* add Redis to the development infrastructure,
* connect Redis through an external Fastify plugin,
* apply `@fastify/rate-limit` to the application.

## What rate limiting does

Rate limiting controls how often a client can perform an operation during a
period of time.

A policy such as "100 requests per minute" has three main parts:

* a key identifying the client,
* a counter recording how many requests that key made,
* and an expiry defining when the counter resets.

[`@fastify/rate-limit`](https://github.com/fastify/fastify-rate-limit) uses the
client IP address as the key by default.
It runs in the `onRequest` hook, before validation and the route handler, so an
excess request can be rejected without doing the more expensive application
work.

When a client exceeds the quota, the plugin returns HTTP status `429 Too Many
Requests`.
It also adds headers that describe the policy and current state:

* `x-ratelimit-limit` is the maximum number of requests,
* `x-ratelimit-remaining` is the number still available,
* `x-ratelimit-reset` says how many seconds remain before reset,
* and `retry-after` tells a limited client how long to wait.

This protects finite application resources from accidental request loops,
aggressive clients, and some simple forms of abuse.
It does not replace authentication, authorization, input validation, or
infrastructure-level denial-of-service protection.
A sufficiently large attack can consume network or proxy capacity before a
request reaches Fastify, so production systems often enforce additional limits
at a load balancer, API gateway, or content delivery network.

## Where should the counters live?

Before choosing a store, it helps to distinguish two ways an application can
handle more traffic:

* **Vertical scaling**, also called scaling up, gives one server more resources,
  such as additional CPU or memory. The application still runs as a single
  instance, but that instance can do more work.
* **Horizontal scaling**, also called scaling out, runs more application
  instances and distributes requests between them with a load balancer. Each
  instance has its own process and memory.

Vertical scaling is simpler, but one machine has a practical capacity limit and
remains a single failure boundary unless other redundancy is added.

Horizontal scaling can increase capacity and availability by adding instances,
but those instances must agree on any state that affects request handling.

By default, `@fastify/rate-limit` stores counters in the Fastify process.
Its local store uses an LRU cache, with a default maximum of 5,000 entries.

> **Note:** LRU stands for Least Recently Used. An LRU cache has a fixed
> capacity and, when it becomes full, removes the entry that has gone unused
> for the longest time to make room for a new one. Here, that bounds the number
> of client counters kept in process memory, but an evicted client loses its
> current counter and can start a new rate-limit window earlier than expected.

That can be a reasonable choice when one application instance is scaled
vertically by giving the same machine more CPU or memory.
There is no network call to a separate store, and deployment remains simple.

There are still tradeoffs:

* counters disappear whenever the process restarts,
* rate-limit data competes with the application for heap memory,
* and a badly chosen `cache` size can contribute to memory pressure or
  exhaustion.

The cache bound helps, but it is not a substitute for measuring heap usage and
choosing a capacity appropriate for the process.

More commonly, API compute is scaled horizontally.
Several interchangeable instances run behind a load balancer, and serverless
platforms may create or remove instances as traffic changes.
We therefore try to keep API instances stateless: any instance should be able
to handle the next request without relying on state held by a previous one.

Local rate-limit counters break that model.
If two Fastify instances each allow 100 requests, a client routed between them
can make up to 200 requests during the same window.
Adding more instances increases the effective limit, and restarting one
instance resets only its part of the quota.

To keep one consistent policy, we delegate the counters to a shared store.
All API instances then increment the same keys, regardless of which instance
receives a request.

## What is Redis?

[Redis](https://redis.io/) is an in-memory data store that can be used as a
database, cache, streaming engine, or message broker.
It provides data structures and commands through a network server rather than
inside our Node.js process.

Redis is a good fit for rate limiting because it offers:

* low-latency access to data kept primarily in memory,
* atomic operations, so concurrent instances can safely update one counter,
* key expiry, so counters can be removed when their time window ends,
* and a shared view of state for every API instance.

`@fastify/rate-limit` performs the Redis update atomically with a Lua script.
The script increments the counter and manages its expiry as one server-side
operation.

Moving the state does not make capacity planning disappear.
Redis still needs memory limits, monitoring, and an eviction policy appropriate
for the workload.
For production, it also needs authentication, encrypted connections when
traffic crosses an untrusted network, and a deliberate availability strategy.

## Install the dependencies

Fastify provides rate limiting through an official plugin.
Its built-in Redis store expects an
[`ioredis`](https://github.com/redis/ioredis) client.

Install both packages:

```bash
npm i @fastify/rate-limit ioredis
```

## Add Redis to the local infrastructure

Our Docker Compose file already starts PostgreSQL.
Add Redis beside it so local development and the test suite use the same shared
store design as the application.

### `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: quote_vault
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - 5432:5432
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d quote_vault"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - db_data:/var/lib/postgresql/data

  # New for this chapter: shared rate-limit state.
  redis:
    image: redis:8-alpine
    ports:
      - 6379:6379
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - redis_data:/data

volumes:
  db_data:
  redis_data:
```

Start both services:

```bash
docker compose up -d
```

The Redis image listens on port `6379` by default.
The health check sends `PING` with `redis-cli` and expects Redis to answer
`PONG`.

The named volume preserves Redis data across ordinary container recreation.
Rate-limit keys still expire according to their configured time window, so
this volume does not make those counters permanent.

## Extend the configuration

We need the Redis address and the rate-limit policy to be explicit for each
environment.

Update `.env`:

```dotenv
HOST=127.0.0.1
PORT=3000
CORS_ORIGIN=http://127.0.0.1:5173

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
RATE_LIMIT_MAX=100
RATE_LIMIT_TIME_WINDOW=60000
QUOTE_CREATE_RATE_LIMIT_MAX=10
QUOTE_CREATE_RATE_LIMIT_TIME_WINDOW=60000

POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=quote_vault
CAN_CREATE_DATABASE=0
CAN_DROP_DATABASE=0
CAN_SEED_DATABASE=0
```

Both time-window settings are expressed in milliseconds, so `60000` means one
minute.
The global policy allows 100 requests per route and minute, while quote
creation has a stricter default of ten.

Keep the example file in sync.

### `.env.example`

```dotenv
HOST=127.0.0.1
PORT=3000
CORS_ORIGIN=http://127.0.0.1:5173

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
RATE_LIMIT_MAX=100
RATE_LIMIT_TIME_WINDOW=60000
QUOTE_CREATE_RATE_LIMIT_MAX=10
QUOTE_CREATE_RATE_LIMIT_TIME_WINDOW=60000

POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_USER=your-postgres-user
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_DB=your-postgres-database
CAN_CREATE_DATABASE=0
CAN_DROP_DATABASE=0
CAN_SEED_DATABASE=0
```

Now validate the new settings with the existing environment plugin.

### `plugins/external/env.js`

```js
import fp from 'fastify-plugin'
import fastifyEnv from '@fastify/env'

const schema = {
  type: 'object',
  required: [
    'HOST',
    'PORT',
    'CORS_ORIGIN',

    // New for this chapter: Redis and rate-limit settings are required.
    'REDIS_HOST',
    'REDIS_PORT',
    'RATE_LIMIT_MAX',
    'RATE_LIMIT_TIME_WINDOW',
    'QUOTE_CREATE_RATE_LIMIT_MAX',
    'QUOTE_CREATE_RATE_LIMIT_TIME_WINDOW',

    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB'
  ],
  properties: {
    HOST: { type: 'string', default: '0.0.0.0' },
    PORT: { type: 'integer', default: 3000 },
    CORS_ORIGIN: { type: 'string' },

    // New for this chapter: coerce ports and policy values to integers.
    REDIS_HOST: { type: 'string' },
    REDIS_PORT: { type: 'integer' },
    RATE_LIMIT_MAX: { type: 'integer', minimum: 1 },
    RATE_LIMIT_TIME_WINDOW: { type: 'integer', minimum: 1 },
    QUOTE_CREATE_RATE_LIMIT_MAX: { type: 'integer', minimum: 1 },
    QUOTE_CREATE_RATE_LIMIT_TIME_WINDOW: { type: 'integer', minimum: 1 },

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

The minimum constraints prevent a zero or negative quota and time window from
passing startup validation.

## Connect to Redis

Like Knex and CORS, the Redis client is external infrastructure.
We will create it in `plugins/external` and let Fastify own its lifecycle.

### `plugins/external/redis.js`

```js
import fp from 'fastify-plugin'
import { Redis } from 'ioredis'
import { once } from 'node:events'

export const REDIS_CONNECTION_NAME = 'quote-vault-rate-limit'

export function buildRedisOptions (app) {
  return {
    host: app.config.REDIS_HOST,
    port: app.config.REDIS_PORT,
    connectionName: REDIS_CONNECTION_NAME,
    connectTimeout: 500,
    maxRetriesPerRequest: 1
  }
}

export const redisPlugin = fp(
  async function redisPlugin (app, options) {
    const redis = new Redis(options.override ?? buildRedisOptions(app))

    app.decorate('redis', redis)

    app.addHook('onClose', async function (instance) {
      const closed = once(instance.redis, 'end')
      await instance.redis.quit()
      await closed
    })

    // Fail startup when the shared rate-limit store is unavailable.
    await redis.ping()
  },
  {
    name: 'redis',
    dependencies: ['env']
  }
)
```

The connection timeout and retry count follow the rate-limit plugin's guidance
to avoid holding a request through long Redis retry cycles.

We send `PING` while the application starts.
If Redis is unavailable, `app.ready()` fails instead of starting an instance
that cannot enforce the configured limit.

The check deliberately runs in the async plugin function rather than in an
`onReady` hook.
Plugin initialization is already part of Fastify's boot sequence, so
`app.ready()` and `app.listen()` wait for the `PING` either way.
An `onReady` hook would still stop the server from listening if `PING` failed,
but Fastify would load dependent plugins before running that check.

The `onClose` hook sends `QUIT` and waits for the connection's `end` event so
the connection is fully closed when Fastify shuts down.

In a production environment, the connection options would usually also include
credentials and TLS settings supplied through secret configuration.

## Register the rate limiter

We keep the rate-limit integration separate from the Redis connection.
That gives each plugin one responsibility and makes their dependency explicit.

### `plugins/external/rate-limit.js`

```js
import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'

export function buildRateLimitOptions (app) {
  return {
    max: app.config.RATE_LIMIT_MAX,
    timeWindow: app.config.RATE_LIMIT_TIME_WINDOW,
    redis: app.redis,
    nameSpace: 'quote-vault-rate-limit-',
    skipOnError: false
  }
}

export const rateLimitPlugin = fp(
  async function rateLimitPlugin (app, options) {
    await app.register(rateLimit, {
      ...buildRateLimitOptions(app),
      ...options.override
    })
  },
  {
    name: 'rate-limit',
    dependencies: ['env', 'redis']
  }
)
```

The `redis` option replaces the plugin's default local store with our shared
client.
The namespace keeps Quote Vault keys recognizable and prevents collisions with
other applications using the same Redis database.

`skipOnError: false` means a Redis error rejects the request instead of silently
skipping the rate-limit check.
This is a fail-closed choice: we prefer an explicit service failure over
unlimited traffic when the policy cannot be enforced.
Some systems choose fail-open for availability, but that decision should be
made from the risk of the protected operation rather than by accident.

The test override is merged over the real options.
Tests can lower the quota or use an isolated namespace while still exercising
the Redis store.

## Register the plugins in the application

The Redis plugin depends on `env`, and the rate limiter depends on both `env`
and `redis`.
Register them before the application routes so the global `onRequest` hook
applies to those routes.

### `app.js`

```js
import fastify from 'fastify'
import { idParam } from './schemas.js'
import configureErrorHandlers from './error-handlers.js'
import { quotesRepositoryPlugin } from './plugins/app/quotes-repo.js'
import { corsPlugin } from './plugins/external/cors.js'
import { envPlugin } from './plugins/external/env.js'
import { knexPlugin } from './plugins/external/knex.js'

// New for this chapter: the shared store and its consumer.
import { rateLimitPlugin } from './plugins/external/rate-limit.js'
import { redisPlugin } from './plugins/external/redis.js'

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
  app.register(corsPlugin, { override: options.cors })

  // New for this chapter: connect first, then install the rate-limit hook.
  app.register(redisPlugin, { override: options.redis })
  app.register(rateLimitPlugin, { override: options.rateLimit })

  app.register(knexPlugin, { override: options.knex })
  app.register(quotesRepositoryPlugin)

  // Declare routes in a plugin so the queued rate-limit plugin loads first.
  app.register(async function application (app) {
    app.addSchema(idParam)

    app.register(protectedRoutes)

    configureErrorHandlers(app)

    app.get('/throw', async function () {
      throw new Error('💥 Kaboom!')
    })

    app.get('/not-protected', async function () {
      return { ok: true }
    })

    app.get(
      '/health',
      {
        config: {
          rateLimit: false
        }
      },
      async function () {
        return { status: 'ok' }
      }
    )
  })

  return app
}
```

Fastify loads registered plugins in order.

`app.register()` queues a plugin for Fastify's boot process, but a following
root-level `app.get()` call declares its route immediately.
Because `createApp()` is synchronous, it cannot `await` the rate-limit plugin
before making those root-level calls.

Wrapping the routes in the `application` plugin queues their declaration after
the preceding infrastructure plugins.
This follows the documented `@fastify/rate-limit` usage: register the limiter
before declaring the routes it should protect.

Because `global` defaults to `true`, the plugin applies its default `onRequest`
check to every route in that encapsulation scope.
Another valid design would make `createApp()` asynchronous, await registration
of the infrastructure plugins, and only then declare root-level routes.
Keeping the app factory synchronous and registering the routes as a plugin is
the smaller change for the structure built in this tutorial.
Routes can opt out with `config: { rateLimit: false }` or override the policy
with `config: { rateLimit: { max, timeWindow } }` when an operation needs a
different limit.

We will exclude a health check used by the platform's load balancer from client
rate limiting:

```js
app.get(
  '/health',
  {
    config: {
      // Do not count infrastructure health checks against a client quota.
      rateLimit: false
    }
  },
  async function () {
    return { status: 'ok' }
  }
)
```

A more expensive or abuse-sensitive operation can use a stricter policy.
Update quote creation to allow only ten requests per minute for each generated
client key.

### `routes/quotes.js`

```js
app.post(
  '/quotes',
  {
    config: {
      rateLimit: {
        max: app.config.QUOTE_CREATE_RATE_LIMIT_MAX,
        timeWindow: app.config.QUOTE_CREATE_RATE_LIMIT_TIME_WINDOW
      }
    },
    schema: {
      body: quoteBody,
      response: singleQuoteResponse
    }
  },
  async function (request, reply) {
    const quote = await this.quotesRepository.create(request.body.text)
    const demo = { ...quote, secret: 'do-not-leak' }
    reply.code(201)
    return demo
  }
)
```

These route settings override the corresponding global values only for that
route. Other routes continue to use `RATE_LIMIT_MAX` and
`RATE_LIMIT_TIME_WINDOW` from the application configuration.
Keeping the stricter policy in validated configuration also lets each
environment choose an appropriate value without changing the route code.

## Update the test configuration

The test app needs values for the six new required settings.

### `test/app.js`

```js
import { createApp } from '../app.js'
import { fileURLToPath } from 'node:url'

export const TEST_RATE_LIMIT_NAMESPACE = 'quote-vault-test-rate-limit-'

const migrationsDirectory = fileURLToPath(
  new URL('../migrations', import.meta.url)
)

export function createTestApp (options = {}) {
  const rateLimit = {
    nameSpace: TEST_RATE_LIMIT_NAMESPACE,
    ...options.rateLimit
  }

  const app = createApp({
    ...options,
    logger: options.logger ?? false,
    rateLimit,
    env: {
      HOST: '127.0.0.1',
      PORT: 3000,
      CORS_ORIGIN: 'http://127.0.0.1:5173',

      // New for this chapter: local Redis and a one-minute default policy.
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: 6379,
      RATE_LIMIT_MAX: 100,
      RATE_LIMIT_TIME_WINDOW: 60000,
      QUOTE_CREATE_RATE_LIMIT_MAX: 10,
      QUOTE_CREATE_RATE_LIMIT_TIME_WINDOW: 60000,

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

    // Redis is dedicated test infrastructure, so reset its selected database.
    await this.redis.flushdb()
  })

  return app
}
```

The test app uses one fixed namespace and resets its selected Redis database in
the same `onReady` hook that truncates the `quotes` table.
Because the suite runs with `--concurrency=1`, one test cannot add counters
while another test clears them.

`FLUSHDB` removes every key from the currently selected Redis database.
That is appropriate here because the Compose Redis instance is disposable test
infrastructure owned by this project.
The test environment must never point this helper at a shared or production
Redis database.

Also extend the expected object in `test/plugins/env.test.js`:

```js
t.assert.deepStrictEqual(app.config, {
  HOST: '127.0.0.1',
  PORT: 4321,
  CORS_ORIGIN: 'http://127.0.0.1:5173',
  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: 6379,
  RATE_LIMIT_MAX: 100,
  RATE_LIMIT_TIME_WINDOW: 60000,
  QUOTE_CREATE_RATE_LIMIT_MAX: 10,
  QUOTE_CREATE_RATE_LIMIT_TIME_WINDOW: 60000,
  POSTGRES_HOST: '127.0.0.1',
  POSTGRES_PORT: 5432,
  POSTGRES_USER: 'postgres',
  POSTGRES_PASSWORD: 'postgres',
  POSTGRES_DB: 'quote_vault'
})
```

## Test the Redis lifecycle

First, prove that the infrastructure plugin exposes a working client and
closes it with the application.

### `test/plugins/redis.test.js`

```js
import { randomUUID } from 'node:crypto'
import { describe, test } from 'node:test'
import { REDIS_CONNECTION_NAME } from '../../plugins/external/redis.js'
import { createTestApp } from '../app.js'

describe('redis plugin', () => {
  test('decorates the app with a Redis client and closes it', async (t) => {
    const app = createTestApp()
    const key = `quote-vault-test-${randomUUID()}`
    t.after(() => app.close())

    await app.ready()

    await app.redis.set(key, 'available', 'EX', 10)
    t.assert.equal(await app.redis.get(key), 'available')
    t.assert.equal(app.redis.options.connectionName, REDIS_CONNECTION_NAME)
    await app.redis.del(key)

    await app.close()

    t.assert.equal(app.redis.status, 'end')
  })
})
```

The temporary key has a ten-second expiry as a safety net, and the test also
deletes it explicitly.

## Test rate limiting across instances

Now test the HTTP behavior and the distributed property that motivated Redis.

### `test/plugins/rate-limit.test.js`

```js
import { describe, test } from 'node:test'
import { createTestApp } from '../app.js'

describe('rate limit plugin', () => {
  test('returns 429 and rate-limit headers after the quota is exhausted', async (t) => {
    const app = createTestApp({
      rateLimit: {
        max: 2,
        timeWindow: 60000
      }
    })
    t.after(() => app.close())

    const first = await app.inject('/not-protected')
    const second = await app.inject('/not-protected')
    const limited = await app.inject('/not-protected')

    t.assert.equal(first.statusCode, 200)
    t.assert.equal(first.headers['x-ratelimit-limit'], '2')
    t.assert.equal(first.headers['x-ratelimit-remaining'], '1')
    t.assert.equal(second.statusCode, 200)
    t.assert.equal(second.headers['x-ratelimit-remaining'], '0')
    t.assert.equal(limited.statusCode, 429)
    t.assert.equal(limited.headers['retry-after'], '60')
  })

  test('shares a quota across application instances through Redis', async (t) => {
    const rateLimit = { max: 1, timeWindow: 60000 }
    const firstApp = createTestApp({ rateLimit })
    const secondApp = createTestApp({ rateLimit })
    t.after(() => Promise.all([firstApp.close(), secondApp.close()]))

    // Complete both reset hooks before either app consumes the shared quota.
    await firstApp.ready()
    await secondApp.ready()

    // Both instances must observe the same quota stored in Redis.
    const first = await firstApp.inject('/not-protected')
    const limited = await secondApp.inject('/not-protected')

    t.assert.equal(first.statusCode, 200)
    t.assert.equal(limited.statusCode, 429)
  })

  test('excludes the health check from the global rate limit', async (t) => {
    const app = createTestApp({
      rateLimit: {
        max: 1,
        timeWindow: 60000
      }
    })
    t.after(() => app.close())

    for (let requestNumber = 0; requestNumber < 3; requestNumber++) {
      const response = await app.inject('/health')

      t.assert.equal(response.statusCode, 200)
      t.assert.equal(response.headers['x-ratelimit-limit'], undefined)
    }
  })

  test('applies a stricter limit to quote creation', async (t) => {
    // Test the boundary without repeating the production default of ten.
    const max = 2
    const app = createTestApp({
      env: {
        QUOTE_CREATE_RATE_LIMIT_MAX: max
      }
    })
    t.after(() => app.close())

    for (let requestNumber = 0; requestNumber < max; requestNumber++) {
      const response = await app.inject({
        method: 'POST',
        url: '/quotes',
        headers: {
          authorization: 'Bearer admin'
        },
        payload: {
          text: `Rate-limited quote ${requestNumber}`
        }
      })

      t.assert.equal(response.statusCode, 201)
      t.assert.equal(response.headers['x-ratelimit-limit'], String(max))
    }

    const limited = await app.inject({
      method: 'POST',
      url: '/quotes',
      headers: {
        authorization: 'Bearer admin'
      },
      payload: {
        text: 'One quote too many'
      }
    })

    t.assert.equal(limited.statusCode, 429)
    const retryAfter = Number(limited.headers['retry-after'])
    t.assert.ok(retryAfter > 0)
    t.assert.ok(retryAfter <= 60)
  })
})
```

Run the suite with PostgreSQL and Redis available:

```bash
npm test
```

## Manual verification

Start the infrastructure and application:

```bash
docker compose up -d
npm run dev
```

Then call the unprotected route and inspect the response headers:

```bash
curl -i http://127.0.0.1:3000/not-protected
```

The first response should include headers similar to:

* `x-ratelimit-limit: 100`
* `x-ratelimit-remaining: 99`
* `x-ratelimit-reset: 60`

After 100 requests from the same IP during one minute, the next response has
status `429` and includes `retry-after`.

For a quick local check, temporarily lower `RATE_LIMIT_MAX`, restart the
application, and repeat the request.
Restore the intended value when the check is complete.

## Identifying the right client

For authenticated API operations, the rate-limit key should usually identify
the authenticated account or API client rather than its IP address.
That gives the same account one consistent quota across devices and networks,
while users who share a corporate network or carrier-grade NAT do not all
consume the same quota.

The authentication used by Quote Vault so far is only a placeholder with
hard-coded tokens such as `Bearer admin`.
It provides a role but no stable account or subject identifier, so it cannot
yet provide a useful authenticated rate-limit key.
For this chapter, we therefore keep the plugin's default IP-based key.

When Fastify runs behind a trusted proxy, the direct connection address may be
the proxy rather than the original client.
Configure Fastify's `trustProxy` option only for proxies you control so
`request.ip` can use the forwarded address safely.
Blindly trusting `x-forwarded-for` lets a client forge its key and bypass an
IP-based limit.

After we add real authentication, we will register its hook before the limiter,
run the limiter later in the lifecycle, and generate keys from the authenticated
subject:

```js
await app.register(rateLimit, {
  hook: 'preHandler',
  keyGenerator: function (request) {
    return request.user?.id ?? request.ip
  }
})
```

The fallback remains important for unauthenticated routes.
Login, token-creation, and password-reset attempts need their own IP-based
limits because no authenticated subject exists yet.
We should use a stable account identifier as the authenticated key, not a role
such as `admin`, otherwise every administrator would share one quota.

The right policy may also differ by route.
A read endpoint, login attempt, quote creation, and password reset do not have
the same cost or abuse risk.
Start with an explicit global ceiling, observe real traffic, and add narrower
route policies where the domain requires them.

## Summary

Quote Vault now enforces a consistent request quota across application
instances:

* Redis runs beside PostgreSQL in Docker Compose,
* Redis and rate-limit settings are validated at startup,
* the Redis connection is opened and closed through Fastify's plugin lifecycle,
* `@fastify/rate-limit` uses Redis instead of process memory,
* excess requests receive `429` with rate-limit headers,
* health checks opt out while quote creation has a stricter route policy,
* and tests prove that two Fastify instances share one quota.

The API instances can remain stateless and scale horizontally while Redis owns
the small, time-bound counters needed to enforce the policy consistently.
