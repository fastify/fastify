# Rate limiting

Quote Vault now authenticates users, authorizes administrator operations, and
stores sessions in Redis. The API still needs to control how often a client can
perform an operation.

In this chapter, we are going to:

* explain what rate limiting protects,
* choose keys for public and authenticated requests,
* compare local and shared counter state,
* reuse our Redis client for consistent limits,
* and apply `@fastify/rate-limit` globally and per route.

## What rate limiting does

Rate limiting controls how often a client can perform an operation during a
period of time.

A policy such as "100 requests per minute" has three main parts:

* a key identifying the client,
* a counter recording how many requests that key made,
* and an expiry defining when the counter resets.

When a client exceeds the quota, the server returns HTTP status `429 Too Many
Requests`. `@fastify/rate-limit` also adds headers that describe the policy and
current state:

* `x-ratelimit-limit` is the maximum number of requests,
* `x-ratelimit-remaining` is the number still available,
* `x-ratelimit-reset` says how many seconds remain before reset,
* and `retry-after` tells a limited client how long to wait.

The plugin runs its check in an `onRequest` hook by default. It can reject an
excess request before validation, database queries, or the route handler do
more expensive work.

Rate limiting protects finite application resources from accidental request
loops, aggressive clients, and some simple forms of abuse. It does not replace
authentication, authorization, input validation, or infrastructure-level
denial-of-service protection.

A large attack can consume network or proxy capacity before a request reaches
Fastify. Production systems often enforce additional limits at a load
balancer, API gateway, or content delivery network.

## Identify the right client

`@fastify/rate-limit` uses `request.ip` as its key by default. That is useful
before authentication because an IP address is one of the few identifiers
available to the application.

IP addresses are imperfect identities:

* many users can share one address through a company gateway, mobile carrier,
  or home router,
* one client can move between addresses,
* and proxy configuration determines which address reaches `request.ip`.

Quote Vault now has a better key for an authenticated request: the stable user
ID stored in its session. Two authenticated users behind the same gateway
should receive separate account quotas, while the same user should not receive
a fresh quota merely by changing IP address.

We will therefore use:

* `user:<id>` when the session contains an authenticated user,
* `ip:<address>` for public endpoints such as `/login` and
  `/not-protected`.

The explicit prefixes prevent a numeric-looking IP or another identifier from
colliding with a user ID.

Authentication and rate limiting answer different questions. A valid session
says who the user is; the rate limiter says how much that user may do during a
window. Neither one replaces the other.

## Where should the counters live?

The authentication chapter introduced two ways to increase capacity:

* **Vertical scaling**, or scaling up, gives one application server more CPU or
  memory.
* **Horizontal scaling**, or scaling out, runs multiple application instances
  behind a load balancer.

By default, `@fastify/rate-limit` stores counters in the Fastify process. Its
local store uses an LRU cache with a default maximum of 5,000 entries.

> **Note:** LRU stands for Least Recently Used. When the cache becomes full, it
> removes the entry that has gone unused for the longest time. This bounds the
> number of counters in process memory, but an evicted client loses its current
> counter and can begin another window earlier than expected.

A local store can be reasonable for one vertically scaled instance. It avoids
a network call and keeps deployment simple. There are still tradeoffs:

* counters disappear whenever the process restarts,
* rate-limit data competes with the application for heap memory,
* and an unsuitable cache size can cause early eviction or memory pressure.

Local counters become inconsistent when the application scales horizontally.
If two instances each allow 100 requests, a client routed between both can make
up to 200 during one window. Adding instances changes the effective policy.

Sessions already required Quote Vault instances to share Redis. Rate-limit
counters have the same distributed-state requirement, so we can reuse the
existing `app.redis` client. Every instance then updates the same counter for a
given key.

Redis is a good fit because it provides low-latency access, key expiry, and a
shared view of counter state for every application instance.

Reusing Redis does not remove operational tradeoffs. Session and rate-limit
keys now share its capacity and failure boundary. Production deployments need
memory limits, monitoring, an eviction policy compatible with both workloads,
and an availability plan.

## Install the rate-limit plugin

The Redis client created in the authentication chapter is already installed
and connected. Add the Fastify rate-limit plugin:

```bash
npm i @fastify/rate-limit
```

## Configure the policies

Add global and quote-creation policies to `.env` after the existing session
settings:

```dotenv
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
SESSION_COOKIE_SECRET=replace-this-with-at-least-32-random-characters
SESSION_COOKIE_NAME=quoteVaultSession
SESSION_COOKIE_SECURE=false
SESSION_MAX_AGE=1800000

# New for this chapter: rate-limit policies.
RATE_LIMIT_MAX=100
RATE_LIMIT_TIME_WINDOW=60000
QUOTE_CREATE_RATE_LIMIT_MAX=10
QUOTE_CREATE_RATE_LIMIT_TIME_WINDOW=60000
```

Both windows are in milliseconds, so `60000` means one minute. The global
policy allows 100 requests per route and minute. Quote creation has a stricter
default of ten because it performs a database write.

Apply the same additions to the example file.

### `.env.example`

```dotenv
HOST=127.0.0.1
PORT=3000
CORS_ORIGIN=http://127.0.0.1:5173

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
SESSION_COOKIE_SECRET=replace-this-with-at-least-32-random-characters
SESSION_COOKIE_NAME=quoteVaultSession
SESSION_COOKIE_SECURE=false
SESSION_MAX_AGE=1800000

# New for this chapter: rate-limit policies.
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

Then extend `plugins/infrastructure/env.ts`:

```ts
// Add these fields to AppConfig.
export interface AppConfig {
  RATE_LIMIT_MAX: number
  RATE_LIMIT_TIME_WINDOW: number
  QUOTE_CREATE_RATE_LIMIT_MAX: number
  QUOTE_CREATE_RATE_LIMIT_TIME_WINDOW: number
}

const schema = {
  type: 'object',
  required: [
    // Existing application, Redis, session, and PostgreSQL settings.

    // New for this chapter: rate-limit policies are required.
    'RATE_LIMIT_MAX',
    'RATE_LIMIT_TIME_WINDOW',
    'QUOTE_CREATE_RATE_LIMIT_MAX',
    'QUOTE_CREATE_RATE_LIMIT_TIME_WINDOW'
  ],
  properties: {
    // Existing properties.

    // New for this chapter: validate quota and window boundaries.
    RATE_LIMIT_MAX: { type: 'integer', minimum: 1 },
    RATE_LIMIT_TIME_WINDOW: { type: 'integer', minimum: 1 },
    QUOTE_CREATE_RATE_LIMIT_MAX: { type: 'integer', minimum: 1 },
    QUOTE_CREATE_RATE_LIMIT_TIME_WINDOW: {
      type: 'integer',
      minimum: 1
    }
  }
}
```

The minimum constraints prevent a zero or negative quota and time window from
passing startup validation.

## Adapt the shared Redis client

`@fastify/rate-limit` accepts a custom counter store. We will implement that
small contract around the existing `app.redis` client instead of creating
another Redis connection.

### `plugins/infrastructure/redis-rate-limit-store.ts`

```ts
import type { RouteOptions } from 'fastify'
import type { createClient } from 'redis'

type IncrementCallback = (
  error: Error | null,
  result?: { current: number, ttl: number }
) => void

interface RateLimitRouteOptions extends RouteOptions {
  routeInfo?: Pick<RouteOptions, 'method' | 'url'>
}

const INCREMENT_AND_EXPIRE = `
  local current = redis.call('INCR', KEYS[1])

  if current == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
  end

  return { current, redis.call('PTTL', KEYS[1]) }
`

export function createRedisRateLimitStore (
  redis: ReturnType<typeof createClient>,
  namespace: string
) {
  return class RedisRateLimitStore {
    prefix: string

    constructor () {
      this.prefix = namespace
    }

    incr (
      key: string,
      callback: IncrementCallback,
      timeWindow: number
    ) {
      redis.eval(INCREMENT_AND_EXPIRE, {
        keys: [this.prefix + key],
        arguments: [String(timeWindow)]
      }).then((result) => {
        const [current, ttl] = result as [number, number]
        callback(null, { current, ttl })
      }, callback)
    }

    child ({ routeInfo }: RateLimitRouteOptions) {
      if (routeInfo == null) {
        throw new TypeError(
          'Rate-limit child options are missing route information'
        )
      }

      const store = new RedisRateLimitStore()
      store.prefix += [
        routeInfo.method,
        routeInfo.url,
        '-'
      ].join('')
      return store
    }
  }
}
```

The script increments the counter and applies its expiry atomically. `child`
gives a route-specific policy its own key prefix. Keeping the adapter isolated
also keeps Redis-specific counter commands out of the rate-limit plugin. It
implements the fixed-window policy used in this tutorial.

## Register the rate limiter

Create an infrastructure plugin for the third-party integration.

### `plugins/infrastructure/rate-limit.ts`

```ts
import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import {
  createRedisRateLimitStore
} from './redis-rate-limit-store.ts'
import type { FastifyInstance, FastifyRequest } from 'fastify'

export interface RateLimitOverride {
  max?: number
  timeWindow?: number
  nameSpace?: string
  skipOnError?: boolean
}

export interface RateLimitPluginOptions {
  override?: RateLimitOverride
}

function buildRateLimitOptions (app: FastifyInstance) {
  return {
    max: app.config.RATE_LIMIT_MAX,
    timeWindow: app.config.RATE_LIMIT_TIME_WINDOW,
    nameSpace: 'quote-vault-rate-limit-',
    keyGenerator (request: FastifyRequest) {
      const userId = request.session.user?.id
      return userId == null ? `ip:${request.ip}` : `user:${userId}`
    },
    skipOnError: false
  }
}

export const rateLimitPlugin = fp<RateLimitPluginOptions>(
  async function rateLimitPlugin (app, options) {
    const settings: ReturnType<typeof buildRateLimitOptions> & {
      store?: ReturnType<typeof createRedisRateLimitStore>
    } = {
      ...buildRateLimitOptions(app),
      ...options.override
    }

    // Reuse the shared Redis client through the rate-limit store contract.
    settings.store = createRedisRateLimitStore(
      app.redis,
      settings.nameSpace
    )

    await app.register(rateLimit, settings)
  },
  {
    name: 'rate-limit',
    dependencies: ['env', 'redis', 'session']
  }
)
```

The custom store uses our existing shared client. The namespace keeps counter
keys separate from the session keys added in the authentication chapter.

The `session` dependency is important for both boot order and request hook
order. The session plugin registers its `onRequest` hook first, so it loads the
session before the rate limiter calls `keyGenerator`. The application
authentication hook runs afterward. Public requests still have a session
object, but no `session.user`, so they use the IP fallback.

`skipOnError: false` makes a Redis error reject the request instead of silently
skipping the check. This is a fail-closed policy: Quote Vault prefers an
explicit service failure over unlimited requests when the configured policy
cannot be enforced. Some applications choose fail-open for availability, but
that should be a deliberate risk decision.

The test override is merged over the real settings. Tests can lower a quota or
use an isolated namespace while still exercising Redis.

## Register the plugin before routes

Add the rate limiter to the infrastructure entry point after sessions:

```ts
import type {
  RateLimitOverride
} from './rate-limit.ts'

export interface InfrastructureOptions {
  // Existing infrastructure options.
  rateLimit?: RateLimitOverride
}

export const infrastructurePlugin = fp(
  async function infrastructurePlugin (app, options) {
    app.register(envPlugin, { override: options.env })
    app.register(corsPlugin, { override: options.cors })
    app.register(redisPlugin, { override: options.redis })
    app.register(sessionPlugin, { override: options.session })
    app.register(knexPlugin, { override: options.knex })
    // New for this chapter: shared rate-limit counters.
    app.register(rateLimitPlugin, { override: options.rateLimit })
  },
  { name: 'infrastructure' }
)
```

The session plugin is registered first, so its `onRequest` hook loads the
session before the rate limiter chooses an IP or user key.

### `app.ts`

```ts
import type { FastifyServerOptions } from 'fastify'
import type {
  InfrastructureOptions
} from './plugins/infrastructure/infrastructure.plugin.ts'

export interface AppOptions extends InfrastructureOptions {
  logger?: FastifyServerOptions['logger'] | string
}

export function createApp (options: AppOptions = {}) {
  const app = fastify({
    // Existing Fastify options.
  })

  app.register(infrastructurePlugin, options)
  app.register(errorsPlugin)

  app.register(async function application (app) {
    app.register(usersPlugin)
    app.register(passwordsPlugin)
    app.register(authenticationPlugin)
    app.register(registrationPlugin)
    app.register(authorizationPlugin)
    app.register(quotesPlugin)

    // Existing public routes.
  })

  return app
}
```

Fastify loads the infrastructure entry point before the application scope, so
the rate-limit hook exists before domain and public routes are declared.

The plugin's `global` option defaults to `true`, so the hook applies to every
route declared below it. Routes can opt out or replace part of the policy.

## Exclude the health check

Platform health checks should require neither a session nor a client quota.
First add the new route to `publicRoutes` in
`plugins/app/authentication/authentication.hooks.ts`:

```ts
const publicRoutes = new Set([
  'GET /health',
  'GET /not-protected',
  'GET /throw',
  'POST /login',
  'POST /register'
])
```

Then opt the route out of rate limiting:

```ts
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
```

The load balancer can now probe this route without adding rate-limit headers or
creating counters.

## Apply a stricter route policy

Quote creation performs a database write, so apply the smaller configured
quota to that route.

### `plugins/app/quotes/quotes.routes.ts`

```ts
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

These settings override only `max` and `timeWindow` for this route. It still
uses Redis, the namespace, the authenticated key generator, and the error
policy from the global configuration.

## Update the test configuration

The test helper already configures Redis, sessions, users, and the shared-state
reset. Add the four rate-limit settings and a test namespace:

### `test/app.ts`

```ts
import type { AppOptions } from '../app.ts'

export const TEST_RATE_LIMIT_NAMESPACE = 'quote-vault-test-rate-limit-'

// Keep the `TestApp` interface and `addLoginDecorator()` helper from the
// authentication chapter.
export function createTestApp (
  options: AppOptions = {}
): TestApp {
  const rateLimit = {
    nameSpace: TEST_RATE_LIMIT_NAMESPACE,
    ...options.rateLimit
  }

  const app = createApp({
    ...options,
    logger: options.logger ?? false,
    rateLimit,
    env: {
      // Existing application, Redis, session, and PostgreSQL settings.
      RATE_LIMIT_MAX: 100,
      RATE_LIMIT_TIME_WINDOW: 60000,
      QUOTE_CREATE_RATE_LIMIT_MAX: 10,
      QUOTE_CREATE_RATE_LIMIT_TIME_WINDOW: 60000,
      ...options.env
    }
  })

  addLoginDecorator(app)

  app.addHook('onReady', async function () {
    // Existing migration and PostgreSQL fixture setup.

    // Redis is disposable test infrastructure owned by this project.
    await this.redis.flushDb()
  })

  return app
}
```

The suite still runs with `--concurrency=1` because tests reset shared
PostgreSQL and Redis state. `FLUSHDB` is appropriate only for the disposable
local Redis service described in the authentication chapter. It also
invalidates sessions created during manual checks.

Also extend the expected object in
`test/plugins/infrastructure/env.test.ts` with the four new values. The test
helper’s explicit environment must include them as well so every test app
satisfies the validated startup contract.

## Test public limits

Create `test/plugins/infrastructure/rate-limit.test.ts`:

```ts
import { describe, test, type TestContext } from 'node:test'
import { createTestApp } from '../../app.ts'
import {
  createRedisRateLimitStore
} from '../../../plugins/infrastructure/redis-rate-limit-store.ts'

describe('rate limit plugin', function () {
test('rejects child stores without route information', async (t: TestContext) => {
  const app = createTestApp()
  t.after(() => app.close())
  await app.ready()

  const Store = createRedisRateLimitStore(app.redis, 'test-rate-limit-')
  const store = new Store()

  t.assert.throws(
    () => Reflect.apply(store.child, store, [{}]),
    {
      name: 'TypeError',
      message: 'Rate-limit child options are missing route information'
    }
  )
})

test('returns 429 and rate-limit headers after the quota is exhausted', async (t: TestContext) => {
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
})
```

The first test covers the adapter boundary where `@fastify/rate-limit` supplies
route metadata to a child store. `Reflect.apply()` deliberately bypasses the
static method contract to verify that malformed runtime input fails clearly.
The public route has no authenticated subject, so its requests use the IP key.

Add a cross-instance public check inside the same `describe` block:

```ts
test('shares a public quota across instances', async function (t: TestContext) {
  const rateLimit = {
    max: 1,
    timeWindow: 60000
  }
  const firstApp = createTestApp({ rateLimit })
  const secondApp = createTestApp({ rateLimit })
  t.after(() => Promise.all([
    firstApp.close(),
    secondApp.close()
  ]))

  await firstApp.ready()
  await secondApp.ready()

  const first = await firstApp.inject('/not-protected')
  const limited = await secondApp.inject('/not-protected')

  t.assert.equal(first.statusCode, 200)
  t.assert.equal(limited.statusCode, 429)
})
```

Also prove that the health route opts out and cover its handler:

```ts
test('excludes the health check', async function (t: TestContext) {
  const app = createTestApp({
    rateLimit: {
      max: 1,
      timeWindow: 60000
    }
  })
  t.after(() => app.close())

  for (
    let requestNumber = 0;
    requestNumber < 3;
    requestNumber++
  ) {
    const response = await app.inject('/health')

    t.assert.equal(response.statusCode, 200)
    t.assert.equal(
      response.headers['x-ratelimit-limit'],
      undefined
    )
  }
})
```

## Test authenticated keys

A separate test proves that quote creation uses the session user rather than
the shared injection IP. It reuses the `app.login()` test decorator defined in
the Authentication chapter:

```ts
test('gives authenticated users separate quotas', async (t: TestContext) => {
  const app = createTestApp({
    env: { QUOTE_CREATE_RATE_LIMIT_MAX: 1 }
  })
  t.after(() => app.close())

  const userCookie = await app.login()
  const adminCookie = await app.login('admin@example.com')

  const createQuote = (cookie: string, text: string) => app.inject({
    method: 'POST',
    url: '/quotes',
    headers: { cookie },
    payload: { text }
  })

  const userFirst = await createQuote(userCookie, 'User quote')
  const adminFirst = await createQuote(adminCookie, 'Admin quote')
  const userLimited = await createQuote(userCookie, 'One too many')

  t.assert.equal(userFirst.statusCode, 201)
  t.assert.equal(adminFirst.statusCode, 201)
  t.assert.equal(userLimited.statusCode, 429)
})
```

Both users appear to come from the same address under `app.inject()`. Their
first writes both succeed because the generated keys contain different user
IDs. Only the second request from the regular user is rejected.

## Test consistency across instances

We also need to preserve one quota when the same authenticated user reaches two
application instances:

```ts
test('shares an authenticated quota across application instances', async (t: TestContext) => {
  const firstApp = createTestApp({
    env: { QUOTE_CREATE_RATE_LIMIT_MAX: 1 }
  })
  const secondApp = createTestApp({
    env: { QUOTE_CREATE_RATE_LIMIT_MAX: 1 }
  })
  t.after(() => Promise.all([firstApp.close(), secondApp.close()]))

  // Finish both reset hooks before either instance creates shared state.
  await firstApp.ready()
  await secondApp.ready()

  const cookie = await firstApp.login()
  const first = await firstApp.inject({
    method: 'POST',
    url: '/quotes',
    headers: { cookie },
    payload: { text: 'First instance' }
  })
  const limited = await secondApp.inject({
    method: 'POST',
    url: '/quotes',
    headers: { cookie },
    payload: { text: 'Second instance' }
  })

  t.assert.equal(first.statusCode, 201)
  t.assert.equal(limited.statusCode, 429)
})
```

The session and the rate-limit counter both come from Redis. Instance B loads
the same user ID and observes the counter written by instance A.

Run the complete suite:

```bash
npm test
```

## Manual verification

Start the application and log in with the seeded user. As in the authentication
chapter, `-c cookies.txt` creates a cookie jar that later commands can read with
`-b cookies.txt`:

```bash
curl -i \
  -c cookies.txt \
  -H 'content-type: application/json' \
  -d '{"email":"user@example.com","password":"User-password1!"}' \
  http://127.0.0.1:3000/login
```

Then repeat quote creation with that cookie:

```bash
curl -i \
  -b cookies.txt \
  -H 'content-type: application/json' \
  -d '{"text":"A rate-limited quote"}' \
  http://127.0.0.1:3000/quotes
```

The response headers show the stricter quote-creation limit. After the quota
is exhausted, the same user receives `429` until the window expires. Remove
the local cookie jar when the checks are complete:

```bash
rm cookies.txt
```

## Summary

Quote Vault now limits public clients by IP and authenticated clients by user
ID. It reuses the Redis connection introduced for sessions, so counters remain
consistent across application instances.

We also made the operational choices explicit:

* policy values are validated configuration,
* health checks opt out,
* expensive writes use a stricter route policy,
* Redis errors fail closed,
* and tests prove both key isolation and cross-instance consistency.

The next chapter will turn our route schemas into an OpenAPI document and an
interactive Swagger UI.
