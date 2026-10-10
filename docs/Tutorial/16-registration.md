# Registration

Quote Vault still relies on the teaching tokens introduced in the plugins
chapter. Before replacing them with real authentication, we need real users.

In this chapter, we will:

* store users and roles in PostgreSQL,
* hash passwords with Node.js `scrypt`,
* and add a public `POST /register` route.

## Store users and roles

Create `migrations/002_create_auth_tables.ts`:

```ts
import type { Knex } from 'knex'

export async function up (knex: Knex) {
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

export async function down (knex: Knex) {
  await knex.schema.dropTableIfExists('user_roles')
  await knex.schema.dropTableIfExists('roles')
  await knex.schema.dropTableIfExists('users')
}
```

The join table lets a user have several roles without storing a comma-separated
list in the `users` table. Run the migration:

```bash
npm run db:migrate
```

## Build the password domain

The password domain owns its validation policy and hashing service.

### `plugins/app/passwords/schemas.ts`

```ts
import { Type } from 'typebox'

export const passwordProperty = Type.String({
  minLength: 12,
  maxLength: 128,
  pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s]).+$'
})
```

The pattern requires lowercase and uppercase letters, a digit, and a symbol.
The maximum also prevents extremely large password inputs.

### `plugins/app/passwords/password-manager.service.ts`

```ts
import fp from 'fastify-plugin'
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { BinaryLike, ScryptOptions } from 'node:crypto'

// Select scrypt's four-input overload and Buffer result without a type cast.
const scryptAsync = promisify<
  BinaryLike,
  BinaryLike,
  number,
  ScryptOptions,
  Buffer
>(scrypt)

// The cost, block-size, parallelization, and memory settings are a security and
// performance policy. Benchmark them on the deployment hardware, monitor login
// load, and plan how hashes will be upgraded when that policy changes.
const SCRYPT_KEY_LENGTH = 32
const SCRYPT_COST = 65536
const SCRYPT_BLOCK_SIZE = 8
const SCRYPT_PARALLELIZATION = 2
const SCRYPT_MAX_MEMORY = 128 * SCRYPT_COST * SCRYPT_BLOCK_SIZE * 2

async function deriveKey (value: string, salt: BinaryLike) {
  return scryptAsync(value, salt, SCRYPT_KEY_LENGTH, {
    cost: SCRYPT_COST,
    blockSize: SCRYPT_BLOCK_SIZE,
    parallelization: SCRYPT_PARALLELIZATION,
    maxmem: SCRYPT_MAX_MEMORY
  })
}

export async function hashPassword (value: string) {
  const salt = randomBytes(16)
  const key = await deriveKey(value, salt)
  return `${salt.toString('hex')}.${key.toString('hex')}`
}

async function comparePassword (value: string, storedHash: string) {
  const [saltHex, keyHex] = storedHash.split('.')
  const expected = Buffer.from(keyHex, 'hex')

  if (expected.length !== SCRYPT_KEY_LENGTH) return false

  const actual = await deriveKey(value, Buffer.from(saltHex, 'hex'))
  return timingSafeEqual(actual, expected)
}

// The seed script and registration service use the same `hashPassword`
// operation.
// Building a password-reset workflow is outside this chapter.
const passwordManager = {
  hashPassword,
  comparePassword
}

declare module 'fastify' {
  interface FastifyInstance {
    passwordManager: typeof passwordManager
  }
}

export const passwordManagerPlugin = fp(
  async function passwordManagerPlugin (app) {
    app.decorate('passwordManager', passwordManager)
  },
  { name: 'password-manager' }
)
```

Every password gets a random salt, so two users with the same password do not
receive the same stored value. The next chapter will use `comparePassword`.

## Build the users domain

The API and sessions must never expose the stored password. Put the safe user
schema in `plugins/app/users/schemas.ts`:

```ts
import { Type } from 'typebox'
import type { Static } from 'typebox'

export const userSchema = Type.Object(
  {
    id: Type.Integer(),
    username: Type.String(),
    email: Type.String(),
    roles: Type.Array(Type.String())
  },
  { additionalProperties: false }
)

export type PublicUser = Static<typeof userSchema>

export interface StoredUser extends PublicUser {
  password: string
}

export interface CreateUser {
  username: string
  email: string
  password: string
}
```

Create `plugins/app/users/users.repository.ts`:

```ts
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import type { CreateUser, PublicUser } from './schemas.ts'

declare module 'fastify' {
  interface FastifyInstance {
    usersRepository: ReturnType<typeof createUsersRepository>
  }
}

function createUsersRepository (app: FastifyInstance) {
  return {
    async create (
      { username, email, password }: CreateUser
    ): Promise<PublicUser | null> {
      return app.knex.transaction(async function (trx) {
        const [user] = await trx('users')
          .insert({ username, email, password }, [
            'id',
            'username',
            'email'
          ])
          // Let the unique constraint resolve concurrent registrations safely.
          .onConflict('email')
          .ignore()

        if (user == null) return null

        const role = await trx('roles')
          .select('id', 'name')
          .where({ name: 'user' })
          .first()

        await trx('user_roles').insert({
          user_id: user.id,
          role_id: role.id
        })

        return { ...user, roles: [role.name] }
      })
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

The transaction makes user creation and role assignment one atomic operation.
`onConflict('email').ignore()` also handles concurrent attempts without a
check-then-insert race.

The repository expects the `user` role to exist. The seed script will create
the `user` and `admin` roles as application reference data.

## Build the registration domain

Create `plugins/app/registration/schemas.ts`. It imports `passwordProperty` so
the password policy has one owner:

```ts
import { Type } from 'typebox'
import type { Static } from 'typebox'
import { passwordProperty } from '../passwords/schemas.ts'
import { userSchema } from '../users/schemas.ts'

export const registrationBody = Type.Object(
  {
    username: Type.String({ minLength: 1, maxLength: 100 }),
    email: Type.String({ format: 'email' }),
    password: passwordProperty
  },
  { additionalProperties: false }
)

export const registrationError = Type.Object(
  {
    message: Type.String()
  },
  { additionalProperties: false }
)

export const registrationResponse = {
  201: Type.Object(
    {
      user: userSchema
    },
    { additionalProperties: false }
  ),
  409: registrationError
}

export type RegistrationBody = Static<typeof registrationBody>
```

The registration service owns normalization, hashing, and persistence.

### `plugins/app/registration/registration.service.ts`

```ts
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import type { RegistrationBody } from './schemas.ts'

declare module 'fastify' {
  interface FastifyInstance {
    registrationService: ReturnType<typeof createRegistrationService>
  }
}

function createRegistrationService (app: FastifyInstance) {
  return {
    async register ({ username, email, password }: RegistrationBody) {
      const passwordHash = await app.passwordManager.hashPassword(password)

      return app.usersRepository.create({
        username,
        email: email.toLowerCase(),
        password: passwordHash
      })
    }
  }
}

export const registrationServicePlugin = fp(
  async function registrationServicePlugin (app) {
    app.decorate('registrationService', createRegistrationService(app))
  },
  {
    name: 'registration-service',
    dependencies: ['password-manager', 'users-repository'],
    decorators: {
      fastify: ['passwordManager', 'usersRepository']
    }
  }
)
```

The route handles only HTTP validation, status codes, and serialization.

### `plugins/app/registration/registration.routes.ts`

```ts
import fp from 'fastify-plugin'
import type {
  FastifyPluginAsyncTypebox
} from '@fastify/type-provider-typebox'
import {
  registrationBody,
  registrationResponse
} from './schemas.ts'

const registrationRoutes: FastifyPluginAsyncTypebox =
  async function registrationRoutesPlugin (app) {
    app.post('/register', {
      schema: {
        body: registrationBody,
        response: registrationResponse
      }
    }, async function (request, reply) {
      const user = await this.registrationService.register(request.body)

      if (user == null) {
        reply.code(409)
        return { message: 'An account with this email already exists.' }
      }

      reply.code(201)
      return { user }
    })
  }

export const registrationRoutesPlugin = fp(
  registrationRoutes,
  {
    name: 'registration-routes',
    encapsulate: true,
    dependencies: ['registration-service'],
    decorators: {
      fastify: ['registrationService']
    }
  }
)
```

The service can be reused outside HTTP. The route translates a duplicate email
into `409 Conflict` without knowing how users or passwords are stored.

## Compose the domain entry points

Keep the internal registration details out of `app.ts`.

### `plugins/app/users/users.plugin.ts`

```ts
import fp from 'fastify-plugin'
import { usersRepositoryPlugin } from './users.repository.ts'

export const usersPlugin = fp(
  async function usersPlugin (app) {
    app.register(usersRepositoryPlugin)
  },
  {
    name: 'users',
    dependencies: ['knex']
  }
)
```

The repository stays inside the user domain. This entry point is not
encapsulated because registration and authentication need its repository.
The user schema is a regular TypeBox value, so schema modules can import and
compose it directly.

Create the password entry point in `passwords/passwords.plugin.ts`:

```ts
import fp from 'fastify-plugin'
import { passwordManagerPlugin } from './password-manager.service.ts'

export const passwordsPlugin = fp(
  async function passwordsPlugin (app) {
    app.register(passwordManagerPlugin)
  },
  { name: 'passwords' }
)
```

Then create `registration/registration.plugin.ts`:

```ts
import fp from 'fastify-plugin'
import {
  registrationRoutesPlugin
} from './registration.routes.ts'
import {
  registrationServicePlugin
} from './registration.service.ts'

export const registrationPlugin = fp(
  async function registrationPlugin (app) {
    app.register(registrationServicePlugin)
    app.register(registrationRoutesPlugin)
  },
  {
    name: 'registration',
    encapsulate: true,
    dependencies: ['passwords', 'users']
  }
)
```

Registration can remain encapsulated because no other domain consumes its
service.

The teaching authentication hook currently requires a token for every route in
the application scope. Registration is public, so update
`plugins/app/authentication/authentication.hooks.ts` with an explicit
public-route policy before composing the new domains:

```ts
import fp from 'fastify-plugin'
import type { FastifyRequest } from 'fastify'

const publicRoutes = new Set([
  'GET /not-protected',
  'GET /throw',
  'POST /register'
])

function isPublicRequest (request: FastifyRequest) {
  const [path] = request.url.split('?', 1)
  return publicRoutes.has(`${request.method} ${path}`)
}

export const authenticationHooksPlugin = fp(
  async function authenticationHooksPlugin (app) {
    app.decorateRequest('user', null)

    app.addHook(
      'onRequest',
      async function authenticationHook (request, reply) {
        if (isPublicRequest(request)) return

        const auth = request.headers.authorization

        if (auth === 'Bearer admin') {
          request.user = { role: 'admin' }
        } else if (auth === 'Bearer user') {
          request.user = { role: 'user' }
        } else if (auth == null) {
          return reply.code(401).send({
            message: 'Missing Authorization'
          })
        } else {
          return reply.code(401).send({
            message: 'Invalid token'
          })
        }
      }
    )
  },
  {
    name: 'authentication-hooks'
  }
)
```

Matching both the HTTP method and path avoids accidentally making every method
on `/register` public. Removing the query string keeps a request such as
`/not-protected?source=tutorial` public.

Now register all application domains in the existing application scope:

```ts
app.register(infrastructurePlugin, options)
app.register(errorsPlugin)

app.register(async function application (app) {
  app.register(usersPlugin)
  app.register(passwordsPlugin)
  app.register(authenticationPlugin)
  // New for this chapter: registration is allowed by the public-route policy.
  app.register(registrationPlugin)
  app.register(quotesPlugin)

  app.get('/throw', async function () {
    throw new Error('💥 Kaboom!')
  })

  app.get('/not-protected', async function () {
    return { ok: true }
  })
})
```

The users and passwords domains expose services to their sibling domains
without leaking them onto the root instance returned by `createApp()`.
Authentication is registered before all route domains governed by its hook.
The next chapter replaces its teaching-token checks with session
authentication while retaining the public-route policy.

The existing application behavior test now verifies an allowlisted route,
rather than a route outside authentication. In `test/app.test.ts`, rename that
test to `allows public routes and preserves not-found handling`, and add a query
string to its public request:

```ts
const publicRoute = await app.inject(
  '/not-protected?source=test'
)
```

The existing `200` and `404` assertions remain unchanged. The public response
also covers the query-string handling in `isPublicRequest()`.

## Seed and verify

Update the seed script to insert the `user` and `admin` roles and two sample
users. Hash both tutorial passwords before the transaction.

### `scripts/seed-database.ts`

```ts
import knex from 'knex'
import knexConfig from '../knexfile.ts'
import {
  hashPassword
} from '../plugins/app/passwords/password-manager.service.ts'

if (Number(process.env.CAN_SEED_DATABASE) !== 1) {
  throw new Error("You can't seed the database. Set `CAN_SEED_DATABASE=1` environment variable to allow this operation.")
}

const db = knex(knexConfig)

async function seedDatabase () {
  try {
    await db.migrate.latest()

    // New for registration: store hashes instead of tutorial passwords.
    const [userPassword, adminPassword] = await Promise.all([
      hashPassword('User-password1!'),
      hashPassword('Admin-password1!')
    ])

    await db.transaction(async function (trx) {
      await trx.raw(
        'TRUNCATE TABLE user_roles, users, roles, quotes RESTART IDENTITY'
      )

      await trx('quotes').insert([
        { text: 'Fastify keeps things focused.' },
        { text: 'Good defaults are only the beginning.' },
        { text: 'Persistence makes the demo feel real.' }
      ])

      const [userRole, adminRole] = await trx('roles')
        .insert([{ name: 'user' }, { name: 'admin' }], ['id', 'name'])

      const [user, admin] = await trx('users').insert([
        {
          username: 'quote-reader',
          email: 'user@example.com',
          password: userPassword
        },
        {
          username: 'quote-admin',
          email: 'admin@example.com',
          password: adminPassword
        }
      ], ['id', 'email'])

      await trx('user_roles').insert([
        { user_id: user.id, role_id: userRole.id },
        { user_id: admin.id, role_id: userRole.id },
        { user_id: admin.id, role_id: adminRole.id }
      ])
    })

    console.log('Database has been seeded successfully.')
    console.log('User login: user@example.com / User-password1!')
    console.log('Admin login: admin@example.com / Admin-password1!')
  } finally {
    await db.destroy()
  }
}

seedDatabase().catch((err) => {
  console.error('Error seeding database:', err)
  process.exit(1)
})
```

The transaction resets and inserts quotes, users, roles, and their
relationships together. If any insert fails, PostgreSQL rolls back the entire
seed.

Seeding remains destructive and opt-in:

```bash
CAN_SEED_DATABASE=1 npm run db:seed
```

Register another user:

```bash
curl -i \
  -H 'content-type: application/json' \
  -d '{"username":"new-user","email":"new@example.com","password":"New-user-password1!"}' \
  http://127.0.0.1:3000/register
```

The response has status `201`, contains the `user` role, and never contains the
password hash. Repeating the email returns `409`.

## Test registration

The repository expects the default roles to exist. Update the existing test
helper to reset the authentication tables and insert those roles before each
test:

### `test/app.ts`

```ts
export const TEST_PASSWORD = 'Test-password1!'

// Existing createTestApp setup.

app.addHook('onReady', async function () {
  await this.knex.migrate.latest({
    directory: migrationsDirectory
  })

  await this.knex.raw(
    'TRUNCATE TABLE user_roles, users, roles, quotes RESTART IDENTITY'
  )

  await this.knex('roles').insert([
    { name: 'user' },
    { name: 'admin' }
  ])
})
```

Now create the registration tests:

### `test/plugins/app/registration/registration.test.ts`

```ts
import { describe, test, type TestContext } from 'node:test'
import {
  TEST_PASSWORD,
  createTestApp
} from '../../../app.ts'

describe('registration', () => {
  test('registers a user with the default role', async (t: TestContext) => {
    const app = createTestApp()
    t.after(() => app.close())

    const registration = await app.inject({
      method: 'POST',
      url: '/register',
      payload: {
        username: 'New User',
        email: 'NEW-USER@example.com',
        password: TEST_PASSWORD
      }
    })

    t.assert.equal(registration.statusCode, 201)

    const { user } = registration.json()
    t.assert.equal(user.username, 'New User')
    t.assert.equal(user.email, 'new-user@example.com')
    t.assert.deepStrictEqual(user.roles, ['user'])

    // Registration stores a scrypt hash, never the submitted password.
    const storedUser = await app.knex('users')
      .select('password')
      .where({ id: user.id })
      .first()

    t.assert.notEqual(storedUser.password, TEST_PASSWORD)
    t.assert.match(storedUser.password, /^[a-f0-9]{32}\.[a-f0-9]{64}$/)
  })

  test('rejects registration with an existing email', async (t: TestContext) => {
    const app = createTestApp()
    t.after(() => app.close())

    const firstResponse = await app.inject({
      method: 'POST',
      url: '/register',
      payload: {
        username: 'User',
        email: 'duplicate@example.com',
        password: TEST_PASSWORD
      }
    })
    t.assert.equal(firstResponse.statusCode, 201)

    const response = await app.inject({
      method: 'POST',
      url: '/register',
      payload: {
        username: 'User 2',
        email: 'DUPLICATE@example.com',
        password: TEST_PASSWORD
      }
    })

    t.assert.equal(response.statusCode, 409)
    t.assert.deepStrictEqual(response.json(), {
      message: 'An account with this email already exists.'
    })
  })

  test('validates the registration password policy', async (t: TestContext) => {
    const app = createTestApp()
    t.after(() => app.close())

    const response = await app.inject({
      method: 'POST',
      url: '/register',
      payload: {
        username: 'New User',
        email: 'new-user@example.com',
        password: 'too-short'
      }
    })

    t.assert.equal(response.statusCode, 400)
  })
})
```

This test checks the registration outcome: the database contains the expected
salt-and-key representation instead of the submitted password. Password
verification is a separate responsibility, so test that contract directly
through the password manager in
`test/plugins/app/passwords/password-manager.test.ts`:

```ts
import fastify from 'fastify'
import { test, type TestContext } from 'node:test'
import {
  passwordsPlugin
} from '../../../../plugins/app/passwords/passwords.plugin.ts'

test('hashes and verifies passwords', async function (t: TestContext) {
  const app = fastify()
  app.register(passwordsPlugin)
  t.after(() => app.close())
  await app.ready()

  const hash = await app.passwordManager.hashPassword(
    'correct horse battery staple'
  )

  t.assert.equal(
    await app.passwordManager.comparePassword(
      'correct horse battery staple',
      hash
    ),
    true
  )
  t.assert.equal(
    await app.passwordManager.comparePassword(
      'incorrect',
      hash
    ),
    false
  )
  t.assert.equal(
    await app.passwordManager.comparePassword(
      'anything',
      'invalid.hash'
    ),
    false
  )
})
```

The malformed hash case exercises the length check before
`timingSafeEqual()`, which requires equal-sized buffers.

Run the suite:

```bash
npm test
```

All four coverage metrics must remain at 100%.

## Summary

Quote Vault now has database-backed users, hashed passwords, a default role,
and a public registration route backed by a separate registration service.

The next chapter will replace the teaching tokens with Redis-backed sessions
and real authentication.
