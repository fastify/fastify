# Authentication and authorization

Quote Vault still uses the teaching tokens introduced in the plugins chapter.
Anyone can send `Bearer admin`, so they do not establish a real identity.

In this chapter, we will replace them with:

* users and roles stored in PostgreSQL,
* passwords hashed with Node.js `scrypt`,
* login sessions stored in Redis,
* authentication for the quote domain,
* and role-based authorization for quote deletion.

This feature also introduces several related concepts at once. It is a good
time to organize application plugins by domain.

## Organize application plugins by domain

Our current `plugins/app` directory is flat, while schemas and routes live in
separate top-level folders. That works for a small application, but a feature
becomes harder to follow as it gains routes, schemas, repositories, and other
services.

We will group code by the business concept it belongs to:

```
plugins/
  app/
    authentication/
      authentication.js
      schemas.js
    authorization/
      authorization.js
      schemas.js
    passwords/
      password-manager.js
      schemas.js
    quotes/
      quotes.js
      quotes-repository.js
      schemas.js
    users/
      users-repository.js
      schemas.js
  external/
    cors.js
    env.js
    knex.js
    redis.js
    session.js
```

On macOS and Linux, create the domain folders and files with:

```bash
mkdir -p plugins/app/{authentication,authorization,passwords,quotes,users}
touch plugins/app/authentication/{authentication,schemas}.js
touch plugins/app/authorization/{authorization,schemas}.js
touch plugins/app/passwords/{password-manager,schemas}.js
touch plugins/app/quotes/{quotes,quotes-repository,schemas}.js
touch plugins/app/users/{users-repository,schemas}.js
```

In Windows PowerShell:

```powershell
$files = @(
  'plugins/app/authentication/authentication.js',
  'plugins/app/authentication/schemas.js',
  'plugins/app/authorization/authorization.js',
  'plugins/app/authorization/schemas.js',
  'plugins/app/passwords/password-manager.js',
  'plugins/app/passwords/schemas.js',
  'plugins/app/quotes/quotes.js',
  'plugins/app/quotes/quotes-repository.js',
  'plugins/app/quotes/schemas.js',
  'plugins/app/users/users-repository.js',
  'plugins/app/users/schemas.js'
)

$files | ForEach-Object {
  New-Item -ItemType Directory -Force -Path (Split-Path $_) | Out-Null
  if (-not (Test-Path $_)) {
    New-Item -ItemType File -Path $_ | Out-Null
  }
}
```

## Authentication and authorization

**Authentication** establishes who is making a request. A user logs in with an
email and password, then a session identifies later requests.

**Authorization** decides what that authenticated user may do. Every logged-in
user may work with quotes, but only a user with the `admin` role may delete
one.

The corresponding HTTP responses are:

* `401 Unauthorized` when valid authentication is missing,
* `403 Forbidden` when an authenticated user lacks permission.

## How sessions work

After login, the server sends a random session identifier in a signed cookie.
The browser returns that cookie on later requests. User data remains in the
server-side session store; the cookie contains only the identifier.

Signing detects a modified identifier. It does not encrypt the cookie or
protect a stolen cookie, so production traffic must use HTTPS.

`@fastify/session` includes an in-process store, but its documentation warns
against using that store in production. It also does not work when
the application scales horizontally.

* **Vertical scaling** gives one server more CPU or memory.
* **Horizontal scaling** runs several application instances behind a load
  balancer.

With local sessions, a user can log in through instance A and then reach
instance B, which cannot see A's memory. Redis gives every instance access to
the same expiring session data. The next chapter will reuse the same Redis
client for rate-limit counters.

## Install the dependencies

Install the cookie and session plugins, the Redis session store, and the
official Redis client:

```bash
npm i @fastify/cookie @fastify/session connect-redis redis
```

Password hashing uses the built-in `node:crypto` module.

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

Add the new values to `.env`:

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
30-minute lifetime. Use a high-entropy secret supplied by secret management in
deployed environments. Local HTTP requires `SESSION_COOKIE_SECURE=false`; use
secure cookies with HTTPS.

Keep the example file synchronized so every required setting is discoverable.

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

POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_USER=your-postgres-user
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_DB=your-postgres-database
CAN_CREATE_DATABASE=0
CAN_DROP_DATABASE=0
CAN_SEED_DATABASE=0
```

Extend `plugins/external/env.js` in the required list and properties:

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

## Connect Fastify to Redis

Create one client and let Fastify own its lifecycle.

### `plugins/external/redis.js`

```js
import fp from 'fastify-plugin'
import { createClient } from 'redis'

export const REDIS_CONNECTION_NAME = 'quote-vault'

export function buildRedisOptions (app) {
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
    redis.on('error', app.log.error.bind(app.log))
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

### `plugins/external/session.js`

```js
import fastifyCookie from '@fastify/cookie'
import fastifySession from '@fastify/session'
import { RedisStore } from 'connect-redis'
import fp from 'fastify-plugin'

export const SESSION_KEY_PREFIX = 'quote-vault-session:'

export function buildSessionOptions (app) {
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
The prefix keeps session keys separate from other Redis data.

`httpOnly`, `sameSite`, and `secure` reduce cookie exposure.
`saveUninitialized: false` avoids storing sessions for visitors who never log
in, and `rolling: true` renews active sessions.

`SameSite` is one browser-enforced layer, not a complete CSRF strategy. A
cross-site deployment may require `SameSite=None`, `Secure`, and an explicit
CSRF defense.

## Store users and roles

Create `migrations/002_create_auth_tables.js` with three tables:

```js
export async function up (knex) {
  await knex.schema.createTable('users', function (table) {
    table.increments('id').primary()
    table.string('username').notNullable()
    table.string('email').notNullable().unique()
    table.string('password').notNullable()
  })

  await knex.schema.createTable('roles', function (table) {
    table.increments('id').primary()
    table.string('name').notNullable().unique()
  })

  await knex.schema.createTable('user_roles', function (table) {
    table.integer('user_id')
      .notNullable()
      .references('id').inTable('users').onDelete('CASCADE')
    table.integer('role_id')
      .notNullable()
      .references('id').inTable('roles').onDelete('CASCADE')
    table.primary(['user_id', 'role_id'])
  })
}

export async function down (knex) {
  await knex.schema.dropTableIfExists('user_roles')
  await knex.schema.dropTableIfExists('roles')
  await knex.schema.dropTableIfExists('users')
}
```

Run migrations explicitly:

```bash
npm run db:migrate
```

## Build the password domain

The password domain owns its reusable schema, hashing service, and Fastify
decorator.

### `plugins/app/passwords/schemas.js`

```js
export const passwordProperty = {
  type: 'string',
  minLength: 1
}
```

### `plugins/app/passwords/password-manager.js`

```js
import fp from 'fastify-plugin'
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

// The cost, block-size, parallelization, and memory settings are a security and
// performance policy. Benchmark them on the deployment hardware, monitor login
// load, and plan how hashes will be upgraded when that policy changes.
const SCRYPT_KEY_LENGTH = 32
const SCRYPT_COST = 65536
const SCRYPT_BLOCK_SIZE = 8
const SCRYPT_PARALLELIZATION = 2
const SCRYPT_MAX_MEMORY = 128 * SCRYPT_COST * SCRYPT_BLOCK_SIZE * 2

async function deriveKey (value, salt) {
  return scryptAsync(value, salt, SCRYPT_KEY_LENGTH, {
    cost: SCRYPT_COST,
    blockSize: SCRYPT_BLOCK_SIZE,
    parallelization: SCRYPT_PARALLELIZATION,
    maxmem: SCRYPT_MAX_MEMORY
  })
}

export async function hashPassword (value) {
  const salt = randomBytes(16)
  const key = await deriveKey(value, salt)
  return `${salt.toString('hex')}.${key.toString('hex')}`
}

export async function comparePassword (value, storedHash) {
  const [saltHex, keyHex] = storedHash.split('.')
  const expected = Buffer.from(keyHex, 'hex')

  if (expected.length !== SCRYPT_KEY_LENGTH) return false

  const actual = await deriveKey(value, Buffer.from(saltHex, 'hex'))
  return timingSafeEqual(actual, expected)
}

// The seed script hashes two tutorial passwords before inserting the sample
// users. A registration or password-reset workflow would call the same `hash`
// operation; building those workflows is outside this chapter.
export const passwordManager = {
  hash: hashPassword,
  compare: comparePassword
}

export const passwordManagerPlugin = fp(
  async function passwordManagerPlugin (app) {
    app.decorate('passwordManager', passwordManager)
  },
  { name: 'password-manager' }
)
```

## Build the users domain

`plugins/app/users/schemas.js` owns the safe user representation returned by
the API and stored in a session:

```js
export const authenticatedUser = {
  $id: 'authenticatedUser',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'username', 'email', 'roles'],
  properties: {
    id: { type: 'integer' },
    username: { type: 'string' },
    email: { type: 'string' },
    roles: { type: 'array', items: { type: 'string' } }
  }
}
```

Move the user queries to `plugins/app/users/users-repository.js`. Its main
operation finds the user, then loads their roles:

```js
import fp from 'fastify-plugin'

export function createUsersRepository (app) {
  return {
    async findByEmail (email) {
      const user = await app.knex('users')
        .select('id', 'username', 'email', 'password')
        .where({ email })
        .first()

      if (user == null) return null

      const roles = await app.knex('roles')
        .select('roles.name')
        .join('user_roles', 'roles.id', 'user_roles.role_id')
        .where('user_roles.user_id', user.id)
        .orderBy('roles.name')

      return { ...user, roles: roles.map(({ name }) => name) }
    }
  }
}

export const usersRepositoryPlugin = fp(
  async function usersRepositoryPlugin (app) {
    app.decorate('usersRepository', createUsersRepository(app))
  },
  {
    name: 'users-repository',
    decorators: { fastify: ['knex'] }
  }
)
```

The plugin exposes the repository as `app.usersRepository` and requires the
`knex` decorator.

## Build the authentication domain

`plugins/app/authentication/schemas.js` imports the password property and
defines the credentials and login responses. Keeping the password schema in
its own domain lets registration and password-reset routes reuse it later.

The authentication plugin owns `/login`, `/me`, `/logout`, and the
`authenticate` hook.

### `plugins/app/authentication/authentication.js`

```js
import fp from 'fastify-plugin'
import { authenticatedUser } from '../users/schemas.js'
import {
  authenticationError,
  credentialsBody,
  loginResponse
} from './schemas.js'

const DUMMY_PASSWORD_HASH = '00112233445566778899aabbccddeeff.745fa59b7f1a240c5831b6e4178500966400fdab1f7727e7ebfc43de46297907'

export const authenticationPlugin = fp(
  async function authenticationPlugin (app) {
    app.decorate('authenticate', async function (request, reply) {
      if (request.session.user == null) {
        return reply.code(401).send({
          message: 'You must be authenticated to access this route.'
        })
      }
    })

    app.addSchema(authenticatedUser)
    app.addSchema(authenticationError)

    app.post('/login', { schema: {
      body: credentialsBody,
      response: loginResponse
    } }, async function (request, reply) {
      const { email, password } = request.body
      const user = await this.usersRepository.findByEmail(email)
      const passwordMatches = await this.passwordManager.compare(
        password,
        user?.password ?? DUMMY_PASSWORD_HASH
      )

      if (user == null || !passwordMatches) {
        reply.code(401)
        return { message: 'Invalid email or password.' }
      }

      const sessionUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles
      }

      // Issue a new identifier when privilege changes at login.
      await request.session.regenerate()
      request.session.user = sessionUser
      await request.session.save()

      return { user: sessionUser }
    })

    app.get('/me', { preHandler: app.authenticate }, async function (request) {
      return request.session.user
    })

    app.post('/logout', { preHandler: app.authenticate },
      async function (request, reply) {
        await request.session.destroy()
        reply.clearCookie(app.config.SESSION_COOKIE_NAME, { path: '/' })
        return reply.code(204).send()
      })
  },
  {
    name: 'authentication',
    dependencies: ['session', 'password-manager', 'users-repository']
  }
)
```

The generic error and dummy hash reduce account-enumeration clues. Regenerating
the session ID at login prevents a pre-login identifier from keeping its
identity after the privilege change. Password hashes never enter the session
or response.

Roles are a snapshot taken at login. Revoke or refresh sessions when a user's
roles change, or load current roles on each request when immediate updates are
required.

## Build the authorization domain

`plugins/app/authorization/schemas.js` contains the `403` response schema.
The authorization plugin provides a reusable role check.

### `plugins/app/authorization/authorization.js`

```js
import fp from 'fastify-plugin'

export const authorizationPlugin = fp(
  async function authorizationPlugin (app) {
    app.decorate('authorize', function authorize (...allowedRoles) {
      return async function verifyRole (request, reply) {
        const authorized = allowedRoles.some((role) => {
          return request.session.user.roles.includes(role)
        })

        if (!authorized) {
          return reply.code(403).send({
            message: 'You are not authorized to access this resource.'
          })
        }
      }
    })
  },
  {
    name: 'authorization',
    dependencies: ['authentication']
  }
)
```

## Move the quote domain

Move the existing quote schemas and repository into:

* `plugins/app/quotes/schemas.js`,
* `plugins/app/quotes/quotes-repository.js`.

The `plugins/app/quotes/quotes.js` plugin decorates its own encapsulated
instance, registers the
schemas, protects all quote routes, and declares those routes:

```js
export const quotesPlugin = fp(
  async function quotesPlugin (app) {
    app.decorate('quotesRepository', createQuotesRepository(app))
    app.addSchema(idParam)
    app.addSchema(quoteResponse)
    app.addSchema(quoteError)

    // Authentication applies to the complete quote domain.
    app.addHook('onRequest', app.authenticate)

    // Move the existing GET, POST, PUT, and DELETE routes here.

    app.delete('/quotes/:id', {
      schema: {
        params: { $ref: 'idParam#' },
        response: deleteQuoteResponse
      },
      // Deleting a quote requires the administrator role.
      preHandler: app.authorize('admin')
    }, async function (request, reply) {
      const deleted = await this.quotesRepository.remove(request.params.id)
      if (!deleted) {
        reply.code(404)
        return { message: 'Quote not found' }
      }
      reply.code(204).send()
    })
  },
  {
    name: 'quotes',
    encapsulate: true,
    dependencies: ['authentication', 'authorization'],
    decorators: {
      fastify: ['authenticate', 'authorize', 'knex']
    }
  }
)
```

Encapsulation keeps the authentication hook and repository inside the quote
domain. Public authentication routes are unaffected.

## Allow the browser to send the cookie

Update the existing CORS options:

```js
export function buildCorsOptions (app) {
  return {
    origin: app.config.CORS_ORIGIN,
    // New for this chapter: allow the browser to send the session cookie.
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
  }
}
```

The frontend must also use `credentials: 'include'`. Credentialed CORS must use
a specific trusted origin, not an unrestricted one.

## Register the domains

Update `app.js` to register infrastructure and service domains first. The
application scope then loads the route-owning domains:

```js
app.register(envPlugin, { override: options.env })
app.register(corsPlugin, { override: options.cors })

// New for this chapter: shared Redis-backed cookie sessions.
app.register(redisPlugin, { override: options.redis })
app.register(sessionPlugin, { override: options.session })
app.register(knexPlugin, { override: options.knex })

app.register(passwordManagerPlugin)
app.register(usersRepositoryPlugin)

app.register(async function application (app) {
  // New for this chapter: domain plugins own routes, schemas, and services.
  app.register(authenticationPlugin)
  app.register(authorizationPlugin)
  app.register(quotesPlugin)

  configureErrorHandlers(app)

  // Existing public routes.
})
```

The plugin metadata makes the relationships explicit: authentication needs
sessions, the password manager, and the users repository; authorization needs
authentication; quotes need authentication, authorization, and Knex.

## Seed and verify

Update the seed script to hash two tutorial passwords and insert users and
roles. Seeding remains destructive and opt-in:

```bash
CAN_SEED_DATABASE=1 npm run db:seed
```

Start the application, then use a cookie jar for login and later requests:

```bash
curl -i \
  -c cookies.txt \
  -H 'content-type: application/json' \
  -d '{"email":"user@example.com","password":"user-password"}' \
  http://127.0.0.1:3000/login

curl -i -b cookies.txt http://127.0.0.1:3000/me

curl -i \
  -b cookies.txt \
  -X DELETE \
  http://127.0.0.1:3000/quotes/1
```

The regular user receives `403`. The seeded administrator uses
`admin@example.com` and `admin-password`.

## Test shared sessions and permissions

The test helper inserts users and roles and resets the disposable Redis test
database before each test. `FLUSHDB` must never target shared or production
infrastructure.

The key distributed-session test logs in through one instance and uses the
cookie on another:

```js
await firstApp.ready()
await secondApp.ready()

const cookie = await login(firstApp)
const response = await secondApp.inject({
  method: 'GET',
  url: '/me',
  headers: { cookie }
})

t.assert.equal(response.statusCode, 200)
```

The quote tests also verify `401` without a session, `403` for a regular user,
and successful deletion for an administrator.

Run the suite:

```bash
npm test
```

## Summary

Quote Vault now authenticates database-backed users, stores sessions in Redis,
and applies role-based authorization. Application code is organized by domain,
so routes, schemas, repositories, and services evolve together.

The next chapter will reuse Redis for distributed rate-limit counters and use
the authenticated user ID as the client key.
