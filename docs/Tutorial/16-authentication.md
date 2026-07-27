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

Extend the schema in `plugins/infrastructure/env.js`:

```js
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

Create `plugins/infrastructure/redis.js`:

```js
import fp from 'fastify-plugin'
import { createClient } from 'redis'

const REDIS_CONNECTION_NAME = 'quote-vault'

function buildRedisOptions (app) {
  return {
    name: REDIS_CONNECTION_NAME,
    socket: {
      host: app.config.REDIS_HOST,
      port: app.config.REDIS_PORT,
      connectTimeout: 500
    }
  }
}

export const redisPlugin = fp(
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

Create `plugins/infrastructure/session.js`:

```js
import fastifyCookie from '@fastify/cookie'
import fastifySession from '@fastify/session'
import { RedisStore } from 'connect-redis'
import fp from 'fastify-plugin'

const SESSION_KEY_PREFIX = 'quote-vault-session:'

function buildSessionOptions (app) {
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

export const sessionPlugin = fp(
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

Add Redis and sessions to `infrastructure.plugin.js`:

```js
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
`findByEmail`:

```js
async findByEmail (email) {
  return app.knex('users')
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

Create `plugins/app/authentication/schemas.js`:

```js
import { passwordProperty } from '../passwords/schemas.js'

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

### `plugins/app/authentication/authentication.service.js`

```js
import fp from 'fastify-plugin'

// Compare a valid precomputed hash when the email is unknown so that both
// login paths do similar work, reducing account discovery through timing.
const DUMMY_PASSWORD_HASH = '00112233445566778899aabbccddeeff.745fa59b7f1a240c5831b6e4178500966400fdab1f7727e7ebfc43de46297907'

function createAuthenticationService (app) {
  return {
    async authenticate ({ email, password }) {
      const user = await app.usersRepository.findByEmail(email.toLowerCase())
      const passwordMatches = await app.passwordManager.compare(
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

Keep the reusable session check in a hook module.

### `plugins/app/authentication/authentication.hooks.js`

```js
import fp from 'fastify-plugin'

// This plugin deliberately exposes the `authenticate` decorator to sibling
// domains. It does not install a lifecycle hook globally: each route or domain
// must opt in with `onRequest` or `addHook`. Reassess this visibility whenever
// the authentication policy changes.
export const authenticationHooksPlugin = fp(
  async function authenticationHooksPlugin (app) {
    app.decorate('authenticate', async function authenticate (request, reply) {
      if (request.session.user == null) {
        return reply.code(401).send({
          message: 'You must be authenticated to access this route.'
        })
      }
    })
  },
  {
    name: 'authentication-hooks',
    dependencies: ['session']
  }
)
```

Session authentication needs only the user loaded by the session plugin. We
therefore run it in `onRequest`, before Fastify parses a body or validates
input. An unauthorized request is rejected without doing that unnecessary
work. A policy that needs parsed or validated request data must use a later
hook instead.

Finally, the route module translates HTTP input into service calls and manages
the session lifecycle.

### `plugins/app/authentication/authentication.routes.js`

```js
import fp from 'fastify-plugin'
import {
  authenticationError,
  credentialsBody,
  loginResponse
} from './schemas.js'

export const authenticationRoutesPlugin = fp(
  async function authenticationRoutesPlugin (app) {
    app.addSchema(authenticationError)

    app.post('/login', {
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
      onRequest: app.authenticate,
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
      onRequest: app.authenticate,
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
      'authentication-hooks',
      'authentication-service',
      'users-schemas'
    ],
    decorators: {
      fastify: ['authenticate', 'authenticationService']
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

### `plugins/app/authentication/authentication.plugin.js`

```js
import fp from 'fastify-plugin'
import {
  authenticationHooksPlugin
} from './authentication.hooks.js'
import {
  authenticationRoutesPlugin
} from './authentication.routes.js'
import {
  authenticationServicePlugin
} from './authentication.service.js'

export const authenticationPlugin = fp(
  async function authenticationPlugin (app) {
    app.register(authenticationServicePlugin)
    app.register(authenticationHooksPlugin)
    app.register(authenticationRoutesPlugin)
  },
  {
    name: 'authentication',
    // Shared so quote and authorization domains can use `app.authenticate`.
    // Keep the route plugin itself encapsulated.
    dependencies: ['passwords', 'session', 'users']
  }
)
```

Authentication is shared because the quote and authorization domains will use
its `authenticate` decorator. Its entry point still keeps the service, hook,
and routes together.

## Protect the quote domain

The quote route module already owns the complete HTTP domain. Replace the
teaching token dependency with the new session hook:

```js
export const quotesRoutesPlugin = fp(
  async function quotesRoutesPlugin (app) {
    app.addSchema(idParam)
    app.addSchema(quoteResponse)
    app.addSchema(quoteError)

    // Authentication applies to every route in this domain.
    app.addHook('onRequest', app.authenticate)

    // Move the existing GET, POST, PUT, and DELETE routes here.
  },
  {
    name: 'quotes-routes',
    encapsulate: true,
    dependencies: ['authentication-hooks', 'quotes-repository'],
    decorators: {
      fastify: ['authenticate', 'quotesRepository']
    }
  }
)
```

Encapsulation keeps the hook inside the quote domain. `/register`, `/login`,
and other public routes are unaffected.

## Allow the browser to send the cookie

Update the existing CORS options:

```js
function buildCorsOptions (app) {
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

`app.js` still composes only infrastructure and domain entry points:

```js
app.register(infrastructurePlugin, options)
app.register(errorsPlugin)

app.register(async function application (app) {
  app.register(usersPlugin)
  app.register(passwordsPlugin)
  app.register(registrationPlugin)
  // New for this chapter: credential verification and session routes.
  app.register(authenticationPlugin)
  app.register(quotesPlugin)
})
```

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

Tests also need to log in repeatedly. Add a test-only helper to
`createTestApp()` after creating the application:

```js
app.decorate('login', async function login (
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
    throw new Error(`Test login failed with status ${response.statusCode}`)
  }

  return response.headers['set-cookie'].split(';', 1)[0]
})
```

The decorator keeps login setup attached to the application instance it uses.
It returns only the cookie header needed by later injected requests.

The key distributed-session test logs in through one application instance and
uses the cookie on another:

```js
await firstApp.ready()
await secondApp.ready()

const cookie = await firstApp.login()
const response = await secondApp.inject({
  method: 'GET',
  url: '/me',
  headers: { cookie }
})

t.assert.equal(response.statusCode, 200)
```

The test helper resets a dedicated disposable Redis database. Never use
`FLUSHDB` against shared or production infrastructure.

Run the suite:

```bash
npm test
```

## Summary

Quote Vault now verifies database-backed credentials, stores sessions in
Redis, and requires a valid session for quote routes. Several application
instances can read the same session state.

The next chapter will use the roles stored in those sessions to authorize
administrator operations.
