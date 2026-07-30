# Authentication

Registration creates users, but Quote Vault still accepts the dummy tokens
`Bearer user` and `Bearer admin`. Anyone can copy those values, so they do not
establish a real identity.

In this chapter, we will:

* verify email and password credentials,
* store login sessions in Redis,
* add `/login`, `/me`, and `/logout`,
* and require authentication for quote routes.

## How sessions work

After login, the server sends a random session identifier in a signed cookie.
The browser returns that cookie on later requests. User data remains in the
server-side session store; the cookie contains only the identifier.

Signing detects a modified identifier. It does not encrypt the cookie or
protect a stolen cookie, so production traffic must use HTTPS.

`@fastify/session` includes an in-process store, but that store is not suitable
for production or horizontal scaling:

* **Vertical scaling** gives one server more CPU or memory.
* **Horizontal scaling** runs several application instances behind a load
  balancer.

With local sessions, a user can log in through instance A and then reach
instance B, which cannot see A's memory. Redis gives every instance access to
the same expiring session data. The Rate Limiting chapter will reuse this
Redis client.

## Install the dependencies

Install the cookie and session plugins, the Redis session store, and the
official Redis client:

```bash
npm i @fastify/cookie @fastify/session connect-redis redis
```

## Add Redis to local infrastructure

Add Redis beside PostgreSQL in `docker-compose.yml`:

```yaml
services:
  # Existing PostgreSQL service.

  # New for this chapter: shared session state.
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

Start the services:

```bash
docker compose up -d
```

## Configure Redis and sessions

Add the settings to `.env`:

```dotenv
# New for this chapter: shared Redis sessions.
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
SESSION_COOKIE_SECRET=replace-this-with-at-least-32-random-characters
SESSION_COOKIE_NAME=quoteVaultSession
SESSION_COOKIE_SECURE=false
SESSION_MAX_AGE=1800000
```

`SESSION_MAX_AGE` is in milliseconds, so this value gives a session a
30-minute lifetime. Local HTTP requires `SESSION_COOKIE_SECURE=false`; deployed
HTTPS applications should use secure cookies and a secret supplied by secret
management.

Keep `.env.example` synchronized so every required setting is discoverable.
For the included Docker services, it contains ready-to-use local values:

### `.env.example`

```dotenv
HOST=127.0.0.1
PORT=3000
CORS_ORIGIN=http://127.0.0.1:5173

# New for this chapter: shared Redis sessions.
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
SESSION_COOKIE_SECRET=replace-this-with-at-least-32-random-characters
SESSION_COOKIE_NAME=quoteVaultSession
SESSION_COOKIE_SECURE=false
SESSION_MAX_AGE=1800000

POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=quote_vault
CAN_CREATE_DATABASE=0
CAN_DROP_DATABASE=0
CAN_SEED_DATABASE=0
```

Create `.env` from it:

```bash
cp .env.example .env
```

Extend the schema in `plugins/infrastructure/env.ts`:

```ts
// Add these fields to AppConfig.
export interface AppConfig {
  REDIS_HOST: string
  REDIS_PORT: number
  SESSION_COOKIE_SECRET: string
  SESSION_COOKIE_NAME: string
  SESSION_COOKIE_SECURE: boolean
  SESSION_MAX_AGE: number
}

const schema = {
  type: 'object',
  required: [
    // Existing settings.

    // New for this chapter: Redis and session settings are required.
    'REDIS_HOST',
    'REDIS_PORT',
    'SESSION_COOKIE_SECRET',
    'SESSION_COOKIE_NAME',
    'SESSION_COOKIE_SECURE',
    'SESSION_MAX_AGE'
  ],
  properties: {
    // Existing properties.

    // New for this chapter: validate Redis and cookie configuration.
    REDIS_HOST: { type: 'string' },
    REDIS_PORT: { type: 'integer' },
    SESSION_COOKIE_SECRET: { type: 'string', minLength: 32 },
    SESSION_COOKIE_NAME: { type: 'string', minLength: 1 },
    SESSION_COOKIE_SECURE: { type: 'boolean' },
    SESSION_MAX_AGE: { type: 'integer', minimum: 1 }
  }
}
```

The comments localize the changes in an existing file.

## Connect Fastify to Redis

Create `plugins/infrastructure/redis.ts`:

```ts
import fp from 'fastify-plugin'
import { createClient } from 'redis'
import type { FastifyInstance } from 'fastify'
import type { RedisClientOptions } from 'redis'

const REDIS_CONNECTION_NAME = 'quote-vault'

declare module 'fastify' {
  interface FastifyInstance {
    redis: ReturnType<typeof createClient>
  }
}

interface RedisPluginOptions {
  override?: RedisClientOptions
}

function buildRedisOptions (app: FastifyInstance): RedisClientOptions {
  return {
    name: REDIS_CONNECTION_NAME,
    socket: {
      host: app.config.REDIS_HOST,
      port: app.config.REDIS_PORT,
      connectTimeout: 500
    }
  }
}

export const redisPlugin = fp<RedisPluginOptions>(
  async function redisPlugin (app, options) {
    const redis = createClient(options.override ?? buildRedisOptions(app))

    // Log connection events instead of throwing because Redis may reconnect.
    // Startup and command failures still reject their own promises.
    redis.on('error', function (error) {
      app.log.error(error)
    })

    await redis.connect()
    app.decorate('redis', redis)

    app.addHook('onClose', async function (instance) {
      await instance.redis.quit()
    })

    // Sessions require Redis, so startup waits for a usable connection.
    await redis.ping()
  },
  {
    name: 'redis',
    dependencies: ['env']
  }
)
```

The startup `PING` prevents an instance from serving requests when it cannot
load sessions. Production Redis connections normally add credentials and TLS.

## Register cookie sessions

Create `plugins/infrastructure/session.ts`:

```ts
import fastifyCookie from '@fastify/cookie'
import fastifySession from '@fastify/session'
import { RedisStore } from 'connect-redis'
import fp from 'fastify-plugin'
import type { FastifySessionOptions } from '@fastify/session'
import type { FastifyInstance } from 'fastify'
import type { AuthenticatedUser } from '../app/authentication/schemas.ts'

const SESSION_KEY_PREFIX = 'quote-vault-session:'

declare module 'fastify' {
  interface Session {
    user?: AuthenticatedUser
  }
}

interface SessionPluginOptions {
  override?: Partial<FastifySessionOptions>
}

function buildSessionOptions (app: FastifyInstance): FastifySessionOptions {
  return {
    secret: app.config.SESSION_COOKIE_SECRET,
    cookieName: app.config.SESSION_COOKIE_NAME,
    store: new RedisStore({
      client: app.redis,
      prefix: SESSION_KEY_PREFIX
    }),
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: app.config.SESSION_COOKIE_SECURE,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: app.config.SESSION_MAX_AGE
    }
  }
}

export const sessionPlugin = fp<SessionPluginOptions>(
  async function sessionPlugin (app, options) {
    await app.register(fastifyCookie)
    await app.register(fastifySession, {
      ...buildSessionOptions(app),
      ...options.override
    })
  },
  {
    name: 'session',
    dependencies: ['env', 'redis']
  }
)
```

`connect-redis` implements the store contract expected by `@fastify/session`.
It serializes session data and expires each Redis key with the session.

`httpOnly`, `sameSite`, and `secure` reduce cookie exposure.
`saveUninitialized: false` avoids storing sessions for visitors who never log
in, and `rolling: true` renews active sessions.

Add Redis and sessions to `infrastructure.plugin.ts`:

```ts
import type { FastifySessionOptions } from '@fastify/session'
import type { RedisClientOptions } from 'redis'

// Add these fields to the existing infrastructure options.
export interface InfrastructureOptions {
  redis?: RedisClientOptions
  session?: Partial<FastifySessionOptions>
}

export const infrastructurePlugin = fp(
  async function infrastructurePlugin (app, options) {
    app.register(envPlugin, { override: options.env })
    app.register(corsPlugin, { override: options.cors })
    // New for this chapter: shared Redis-backed cookie sessions.
    app.register(redisPlugin, { override: options.redis })
    app.register(sessionPlugin, { override: options.session })
    app.register(knexPlugin, { override: options.knex })
  },
  { name: 'infrastructure' }
)
```

Because the infrastructure entry point is exposed with `fastify-plugin`, the
application domains inherit `app.redis`, `request.session`, and the session
hooks.

## Add the authentication query

Extend the repository created in the Registration chapter with
`findByEmail`. Add `StoredUser` to the existing type-only import from
`schemas.ts`, then add the method:

```ts
import type {
  CreateUser,
  PublicUser,
  StoredUser
} from './schemas.ts'

// Add this method to the existing repository.
async findByEmail (email: string): Promise<StoredUser | undefined> {
  return app.knex<StoredUser>('users')
    .leftJoin('user_roles', 'users.id', 'user_roles.user_id')
    .leftJoin('roles', 'roles.id', 'user_roles.role_id')
    .select(
      'users.id',
      'users.username',
      'users.email',
      'users.password'
    )
    // LEFT JOIN keeps users without roles; COALESCE replaces their null
    // aggregate with an empty JSON array.
    .select(app.knex.raw(`
      coalesce(
        json_agg(roles.name order by roles.name)
          filter (where roles.name is not null),
        '[]'
      ) as roles
    `))
    .where('users.email', email)
    .groupBy('users.id')
    .first()
}
```

A normal join returns one row per role. PostgreSQL's `json_agg` keeps this as
one database query and returns the roles as an ordered array. `LEFT JOIN`
preserves a user who currently has no role.

## Build the authentication domain

Create `plugins/app/authentication/schemas.ts`:

```ts
import { passwordProperty } from '../passwords/schemas.ts'

export interface Credentials {
  email: string
  password: string
}

export interface AuthenticatedUser {
  id: number
  username: string
  email: string
  roles: string[]
}

export const credentialsBody = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', format: 'email' },
    password: passwordProperty
  }
}

export const authenticationError = {
  $id: 'authenticationError',
  type: 'object',
  additionalProperties: false,
  required: ['message'],
  properties: {
    message: { type: 'string' }
  }
}

export const loginResponse = {
  200: {
    type: 'object',
    additionalProperties: false,
    required: ['user'],
    properties: {
      user: { $ref: 'user#' }
    }
  },
  401: { $ref: 'authenticationError#' }
}
```

This tutorial reuses the password policy for login input. In an application
with existing users, apply a changing policy when setting passwords rather
than locking out users whose older password no longer matches the new policy.

Credential verification belongs in a service that knows nothing about
`request`, `reply`, cookies, or status codes.

### `plugins/app/authentication/authentication.service.ts`

```ts
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import type { Credentials } from './schemas.ts'

// Compare a valid precomputed hash when the email is unknown so that both
// login paths do similar work, reducing account discovery through timing.
const DUMMY_PASSWORD_HASH = '00112233445566778899aabbccddeeff.745fa59b7f1a240c5831b6e4178500966400fdab1f7727e7ebfc43de46297907'

declare module 'fastify' {
  interface FastifyInstance {
    authenticationService: ReturnType<typeof createAuthenticationService>
  }
}

function createAuthenticationService (app: FastifyInstance) {
  return {
    async authenticate ({ email, password }: Credentials) {
      const user = await app.usersRepository.findByEmail(email.toLowerCase())
      const passwordMatches = await app.passwordManager.comparePassword(
        password,
        user?.password ?? DUMMY_PASSWORD_HASH
      )

      if (user == null || !passwordMatches) return null

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles
      }
    }
  }
}

export const authenticationServicePlugin = fp(
  async function authenticationServicePlugin (app) {
    app.decorate(
      'authenticationService',
      createAuthenticationService(app)
    )
  },
  {
    name: 'authentication-service',
    dependencies: ['password-manager', 'users-repository'],
    decorators: {
      fastify: ['passwordManager', 'usersRepository']
    }
  }
)
```

Register the reusable session check as an application-wide hook.

### `plugins/app/authentication/authentication.hooks.ts`

```ts
import fp from 'fastify-plugin'
import type { FastifyRequest } from 'fastify'

const publicRoutes = new Set([
  'GET /not-protected',
  'GET /throw',
  'POST /login',
  'POST /register'
])

function isPublicRequest (request: FastifyRequest) {
  const [path] = request.url.split('?', 1)
  return publicRoutes.has(`${request.method} ${path}`)
}

export const authenticationHookPlugin = fp(
  async function authenticationHookPlugin (app) {
    app.addHook(
      'onRequest',
      async function authenticationHook (request, reply) {
        if (isPublicRequest(request)) return

        if (request.session.user == null) {
          return reply.code(401).send({
            message: 'You must be authenticated to access this route.'
          })
        }
      }
    )
  },
  {
    name: 'authentication-hook',
    dependencies: ['session']
  }
)
```

Session authentication needs only the user loaded by the session plugin, so
`onRequest` runs before Fastify parses a body or validates input. An
unauthorized request is rejected without doing that unnecessary work. A policy
that needs parsed or validated request data must use a later hook instead.

Finally, the route module translates HTTP input into service calls and manages
the session lifecycle.

### `plugins/app/authentication/authentication.routes.ts`

```ts
import fp from 'fastify-plugin'
import {
  authenticationError,
  credentialsBody,
  loginResponse
} from './schemas.ts'
import type { Credentials } from './schemas.ts'

export const authenticationRoutesPlugin = fp(
  async function authenticationRoutesPlugin (app) {
    app.addSchema(authenticationError)

    app.post<{ Body: Credentials }>('/login', {
      schema: {
        body: credentialsBody,
        response: loginResponse
      }
    }, async function (request, reply) {
      const user = await this.authenticationService.authenticate(request.body)

      if (user == null) {
        reply.code(401)
        return { message: 'Invalid email or password.' }
      }

      // Issue a new identifier when privilege changes at login.
      await request.session.regenerate()
      request.session.user = user
      await request.session.save()

      return { user }
    })

    app.get('/me', {
      schema: {
        response: {
          200: { $ref: 'user#' },
          401: { $ref: 'authenticationError#' }
        }
      }
    }, async function (request) {
      return request.session.user
    })

    app.post('/logout', {
      schema: {
        response: {
          204: { type: 'null' },
          401: { $ref: 'authenticationError#' }
        }
      }
    }, async function (request, reply) {
      await request.session.destroy()
      reply.clearCookie(app.config.SESSION_COOKIE_NAME, { path: '/' })
      return reply.code(204).send()
    })
  },
  {
    name: 'authentication-routes',
    encapsulate: true,
    dependencies: [
      'authentication-hook',
      'authentication-service',
      'users-schemas'
    ],
    decorators: {
      fastify: ['authenticationService']
    }
  }
)
```

The service's generic result and dummy hash reduce account-enumeration clues.
Regenerating the session identifier at login prevents a pre-login identifier
from keeping its identity after the privilege change. Password hashes never
enter the session or response.

Roles are a snapshot taken at login. Revoke or refresh sessions when a user's
roles change, or load current roles on every request when immediate updates
are required.

Replace the teaching authentication entry point with the complete domain
composition.

### `plugins/app/authentication/authentication.plugin.ts`

```ts
import fp from 'fastify-plugin'
import {
  authenticationHookPlugin
} from './authentication.hooks.ts'
import {
  authenticationRoutesPlugin
} from './authentication.routes.ts'
import {
  authenticationServicePlugin
} from './authentication.service.ts'

export const authenticationPlugin = fp(
  async function authenticationPlugin (app) {
    app.register(authenticationServicePlugin)
    app.register(authenticationHookPlugin)
    app.register(authenticationRoutesPlugin)
  },
  {
    name: 'authentication',
    // Shared so the application scope inherits the authentication hook.
    dependencies: ['passwords', 'session', 'users']
  }
)
```

Authentication is shared so its `onRequest` hook applies to the route domains
registered after it. Its entry point still keeps the service, hook, and routes
together.

## Protect the quote domain

The application-wide hook protects quote routes automatically because they are
registered after authentication and are not in `publicRoutes`. The quote route
module no longer installs its own authentication handler. Update its metadata
to record the hook-order dependency without requiring an `authenticate`
decorator:

```ts
{
  name: 'quotes-routes',
  encapsulate: true,
  dependencies: [
    'authentication-hook',
    'quotes-repository'
  ],
  decorators: {
    fastify: ['quotesRepository']
  }
}
```

`/register`, `/login`, and the other listed routes pass through the same hook
but are allowed to continue without a session.

The existing delete route still has the temporary role check from the Hooks
chapter. It must now read the authenticated session instead of the removed
`request.user` teaching value. Replace the complete route declaration with:

```ts
app.delete<{ Params: { id: number } }>(
  '/quotes/:id',
  {
    schema: {
      params: { $ref: 'idParam#' },
      response: deleteQuoteResponse
    },
    onRequest: async function (request, reply) {
      if (!request.session.user?.roles.includes('admin')) {
        return reply.code(403).send({
          message: 'Admin only'
        })
      }
    }
  },
  async function (request, reply) {
    const deleted = await this.quotesRepository.remove(
      request.params.id
    )
    if (!deleted) {
      reply.code(404)
      return { message: 'Quote not found' }
    }
    return reply.code(204).send()
  }
)
```

The global authentication hook runs before this route-level hook. An
unauthenticated request is rejected before the role check reads the session.
The next chapter replaces this inline policy with the reusable authorization
builder.

## Allow the browser to send the cookie

Update the existing CORS options:

```ts
function buildCorsOptions (app: FastifyInstance): FastifyCorsOptions {
  return {
    origin: app.config.CORS_ORIGIN,
    // New for this chapter: allow the browser to send the session cookie.
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
  }
}
```

The frontend must also use `credentials: 'include'`. Credentialed CORS must
use a specific trusted origin, not an unrestricted one.

## Register authentication

`app.ts` still composes only infrastructure and domain entry points:

```ts
app.register(infrastructurePlugin, options)
app.register(errorsPlugin)

app.register(async function application (app) {
  app.register(usersPlugin)
  app.register(passwordsPlugin)
  // Register the application-wide policy before route domains.
  app.register(authenticationPlugin)
  // Registration remains public through the hook's explicit allowlist.
  app.register(registrationPlugin)
  app.register(quotesPlugin)
})
```

This keeps the application boundary introduced in the registration chapter.
Only the authentication implementation and its public-route list change here;
the shared services and route domains remain in the same scope.

## Verify shared sessions

Log in and keep the returned cookie. The `-c cookies.txt` option tells `curl`
to create a local cookie-jar file from the response. That file is not part of
the application. The next command uses `-b cookies.txt` to send the stored
session cookie:

```bash
curl -i \
  -c cookies.txt \
  -H 'content-type: application/json' \
  -d '{"email":"user@example.com","password":"User-password1!"}' \
  http://127.0.0.1:3000/login

curl -i -b cookies.txt http://127.0.0.1:3000/me
```

`curl` does not remove the cookie jar automatically. Delete it when you finish
the manual checks:

```bash
rm cookies.txt
```

## Update the test fixtures

Replace `test/app.ts` with the complete session-aware helper:

```ts
import { createApp } from '../app.ts'
import { fileURLToPath } from 'node:url'
import type { FastifyInstance } from 'fastify'
import type { AppOptions } from '../app.ts'

const migrationsDirectory = fileURLToPath(
  new URL('../migrations', import.meta.url)
)

export const TEST_PASSWORD = 'Test-password1!'
const TEST_PASSWORD_HASH =
  '8868154c9dada8c28e25d841551a51d0.' +
  '36d210eaa751723df3828efe7949867e' +
  '11ba02dd6de76bc46a34b95ed051bb1f'

export interface TestApp extends FastifyInstance {
  login: (email?: string) => Promise<string>
}

function addLoginDecorator (
  app: FastifyInstance
): asserts app is TestApp {
  app.decorate('login', async function login (
    this: FastifyInstance,
    email = 'user@example.com'
  ) {
    const response = await this.inject({
      method: 'POST',
      url: '/login',
      payload: {
        email,
        password: TEST_PASSWORD
      }
    })

    if (response.statusCode !== 200) {
      throw new Error(
        `Test login failed with status ${response.statusCode}`
      )
    }

    const setCookie = response.headers['set-cookie']
    if (typeof setCookie !== 'string') {
      throw new Error('Test login did not return a session cookie')
    }

    return setCookie.split(';', 1)[0]
  })
}

export function createTestApp (
  options: AppOptions = {}
): TestApp {
  const app = createApp({
    ...options,
    logger: options.logger ?? false,
    env: {
      HOST: '127.0.0.1',
      PORT: 3000,
      CORS_ORIGIN: 'http://127.0.0.1:5173',
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: 6379,
      SESSION_COOKIE_SECRET:
        'test-session-secret-at-least-32-characters',
      SESSION_COOKIE_NAME: 'quoteVaultTestSession',
      SESSION_COOKIE_SECURE: false,
      SESSION_MAX_AGE: 1800000,
      POSTGRES_HOST: '127.0.0.1',
      POSTGRES_PORT: 5432,
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_DB: 'quote_vault',
      ...options.env
    }
  })

  addLoginDecorator(app)

  app.addHook('onReady', async function () {
    await this.knex.migrate.latest({
      directory: migrationsDirectory
    })

    await this.knex.raw(
      'TRUNCATE TABLE user_roles, users, roles, quotes RESTART IDENTITY'
    )

    const [userRole, adminRole] =
      await this.knex('roles').insert([
        { name: 'user' },
        { name: 'admin' }
      ], ['id', 'name'])

    const [user, admin] = await this.knex('users')
      .insert([
        {
          username: 'Test User',
          email: 'user@example.com',
          password: TEST_PASSWORD_HASH
        },
        {
          username: 'Test Admin',
          email: 'admin@example.com',
          password: TEST_PASSWORD_HASH
        }
      ], ['id', 'email'])

    await this.knex('user_roles').insert([
      {
        user_id: user.id,
        role_id: userRole.id
      },
      {
        user_id: admin.id,
        role_id: userRole.id
      },
      {
        user_id: admin.id,
        role_id: adminRole.id
      }
    ])

    // This Redis database is disposable and dedicated to tests.
    await this.redis.flushDb()
  })

  return app
}
```

The precomputed test hash avoids repeating an expensive hash operation during
every fixture reset while still letting login verify the configured scrypt
format. `TestApp` keeps the `login()` helper local to test code instead of
augmenting every Fastify instance in the project. The assertion function
records the type refinement performed by `decorate()` without a type cast.
`FLUSHDB` is safe only because this Redis database is dedicated, disposable
test infrastructure.

Add the Redis and session settings to the expected object in
`test/plugins/infrastructure/env.test.ts`. The test helper shown above already
provides these values explicitly.

The CORS preflight test must now request and expect only `Content-Type`:

```ts
'access-control-request-headers': 'content-type'

t.assert.equal(
  response.headers['access-control-allow-headers'],
  'Content-Type'
)
```

Cookies are sent through the browser's credential mode; the application no
longer uses the teaching `Authorization` header.

## Test authentication

Replace the teaching-token tests in
`test/plugins/app/authentication/authentication.test.ts` with the session
authentication tests below:

```ts
import { describe, test, type TestContext } from 'node:test'
import {
  TEST_PASSWORD,
  createTestApp
} from '../../../app.ts'

describe('authentication', function () {
  test('creates a session for valid credentials', async function (t: TestContext) {
    const app = createTestApp()
    t.after(() => app.close())

    const response = await app.inject({
      method: 'POST',
      url: '/login',
      payload: {
        email: 'admin@example.com',
        password: TEST_PASSWORD
      }
    })

    t.assert.equal(response.statusCode, 200)
    t.assert.deepStrictEqual(response.json(), {
      user: {
        id: 2,
        username: 'Test Admin',
        email: 'admin@example.com',
        roles: ['admin', 'user']
      }
    })
    t.assert.match(
      response.headers['set-cookie'],
      /HttpOnly/
    )
    t.assert.match(
      response.headers['set-cookie'],
      /SameSite=Lax/
    )
    t.assert.doesNotMatch(
      response.headers['set-cookie'],
      /Secure/
    )
  })

  test(
    'rejects unknown users and incorrect passwords',
    async function (t: TestContext) {
      const app = createTestApp()
      t.after(() => app.close())

      for (const credentials of [
        {
          email: 'missing@example.com',
          password: TEST_PASSWORD
        },
        {
          email: 'user@example.com',
          password: 'Wrong-password1!'
        }
      ]) {
        const response = await app.inject({
          method: 'POST',
          url: '/login',
          payload: credentials
        })

        t.assert.equal(response.statusCode, 401)
        t.assert.deepStrictEqual(response.json(), {
          message: 'Invalid email or password.'
        })
      }
    }
  )

  test('validates the login password policy', async function (t: TestContext) {
    const app = createTestApp()
    t.after(() => app.close())

    for (const password of [
      'too-short',
      'lowercase-password1!',
      'UPPERCASE-PASSWORD1!',
      'Missing-number!',
      'MissingSymbol123',
      `Valid-password1!${'x'.repeat(113)}`
    ]) {
      const response = await app.inject({
        method: 'POST',
        url: '/login',
        payload: {
          email: 'user@example.com',
          password
        }
      })

      t.assert.equal(response.statusCode, 400)
    }
  })

  test(
    'loads and destroys the authenticated session',
    async function (t: TestContext) {
      const app = createTestApp()
      t.after(() => app.close())
      const cookie = await app.login()

      const currentUser = await app.inject({
        method: 'GET',
        url: '/me',
        headers: { cookie }
      })
      t.assert.equal(currentUser.statusCode, 200)
      t.assert.equal(
        currentUser.json().email,
        'user@example.com'
      )

      const logout = await app.inject({
        method: 'POST',
        url: '/logout',
        headers: { cookie }
      })
      t.assert.equal(logout.statusCode, 204)
      t.assert.match(
        logout.headers['set-cookie'],
        /Max-Age=0/
      )

      const afterLogout = await app.inject({
        method: 'GET',
        url: '/me',
        headers: { cookie }
      })
      t.assert.equal(afterLogout.statusCode, 401)
    }
  )

  test('shares sessions across instances', async function (t: TestContext) {
    const firstApp = createTestApp()
    const secondApp = createTestApp()
    t.after(() => Promise.all([
      firstApp.close(),
      secondApp.close()
    ]))

    // Finish both reset hooks before creating shared state.
    await firstApp.ready()
    await secondApp.ready()

    const cookie = await firstApp.login()
    const response = await secondApp.inject({
      method: 'GET',
      url: '/me',
      headers: { cookie }
    })

    t.assert.equal(response.statusCode, 200)
    t.assert.equal(
      response.json().email,
      'user@example.com'
    )
  })
})
```

## Update quote tests

The existing quote tests now need session cookies instead of teaching headers.
Change the helper to accept a cookie:

```ts
async function createQuote (
  app: FastifyInstance,
  cookie: string,
  text = 'New quote'
) {
  return app.inject({
    method: 'POST',
    url: '/quotes',
    headers: { cookie },
    payload: { text }
  })
}
```

In each authenticated test, log in before the first quote request:

```ts
const cookie = await app.login()
```

Pass `headers: { cookie }` to reads and updates. The missing-session case now
expects:

```ts
{
  message: 'You must be authenticated to access this route.'
}
```

For the delete policy test, create both sessions:

```ts
const userCookie = await app.login()
const adminCookie = await app.login('admin@example.com')
```

Use the regular cookie for the `403` request and the administrator cookie for
the `204` and `404` requests. These changes keep all existing CRUD assertions
while replacing only their authentication setup.

## Test the Redis wrapper

Create `test/plugins/infrastructure/redis.test.ts`:

```ts
import { randomUUID } from 'node:crypto'
import { test, type TestContext } from 'node:test'
import { createTestApp } from '../../app.ts'

test(
  'connects, reports errors, and closes Redis',
  async function (t: TestContext) {
    const app = createTestApp()
    const key = `quote-vault-test-${randomUUID()}`
    t.after(() => app.close())
    await app.ready()

    app.redis.emit(
      'error',
      new Error('Expected Redis test error')
    )
    await app.redis.set(key, 'available', {
      expiration: {
        type: 'EX',
        value: 10
      }
    })

    t.assert.equal(
      await app.redis.get(key),
      'available'
    )
    t.assert.equal(
      app.redis.options.name,
      'quote-vault'
    )
    await app.redis.del(key)

    await app.close()
    t.assert.equal(app.redis.isOpen, false)
  }
)

test('accepts explicit Redis options', async function (t: TestContext) {
  const app = createTestApp({
    redis: {
      name: 'quote-vault-test-override',
      socket: {
        host: '127.0.0.1',
        port: 6379,
        connectTimeout: 500
      }
    }
  })
  t.after(() => app.close())

  await app.ready()
  t.assert.equal(
    app.redis.options.name,
    'quote-vault-test-override'
  )
})
```

Run the suite:

```bash
npm test
```

The authentication, quote, and infrastructure tests must retain 100%
statement, branch, function, and line coverage. As established in the database
chapter, migration files remain outside application coverage and are verified
against the disposable PostgreSQL database.

## Summary

Quote Vault now verifies database-backed credentials, stores sessions in
Redis, and requires a valid session for quote routes. Several application
instances can read the same session state.

The next chapter will use the roles stored in those sessions to authorize
administrator operations.
