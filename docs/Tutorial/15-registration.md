# Registration

Quote Vault still relies on the teaching tokens introduced in the plugins
chapter. Before replacing them with real authentication, we need real users.

In this chapter, we will:

* store users and roles in PostgreSQL,
* hash passwords with Node.js `scrypt`,
* and add a public `POST /register` route.

## Store users and roles

Create `migrations/002_create_auth_tables.js`:

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

The join table lets a user have several roles without storing a comma-separated
list in the `users` table. Run the migration:

```bash
npm run db:migrate
```

## Build the password domain

The password domain owns its validation policy and hashing service.

### `plugins/app/passwords/schemas.js`

```js
export const passwordProperty = {
  type: 'string',
  minLength: 12,
  maxLength: 128,
  pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s]).+$'
}
```

The pattern requires lowercase and uppercase letters, a digit, and a symbol.
The maximum also prevents extremely large password inputs.

### `plugins/app/passwords/password-manager.service.js`

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

// The seed script and registration service use the same `hash` operation.
// Building a password-reset workflow is outside this chapter.
const passwordManager = {
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

Every password gets a random salt, so two users with the same password do not
receive the same stored value. The next chapter will use `compare`.

## Build the users domain

The API and sessions must never expose the stored password. Put the safe user
schema in `plugins/app/users/schemas.js`:

```js
import fp from 'fastify-plugin'

export const userSchema = {
  $id: 'user',
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

export const usersSchemasPlugin = fp(
  async function usersSchemasPlugin (app) {
    app.addSchema(userSchema)
  },
  {
    // Shared because registration and authentication both reference `user#`.
    name: 'users-schemas'
  }
)
```

Create `plugins/app/users/users.repository.js`:

```js
import fp from 'fastify-plugin'

function createUsersRepository (app) {
  return {
    async create ({ username, email, password }) {
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

Create `plugins/app/registration/schemas.js`. It imports `passwordProperty` so
the password policy has one owner:

```js
import { passwordProperty } from '../passwords/schemas.js'

export const registrationBody = {
  type: 'object',
  required: ['username', 'email', 'password'],
  additionalProperties: false,
  properties: {
    username: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    password: passwordProperty
  }
}

export const registrationError = {
  $id: 'registrationError',
  type: 'object',
  additionalProperties: false,
  required: ['message'],
  properties: {
    message: { type: 'string' }
  }
}

export const registrationResponse = {
  201: {
    type: 'object',
    additionalProperties: false,
    required: ['user'],
    properties: {
      user: { $ref: 'user#' }
    }
  },
  409: { $ref: 'registrationError#' }
}
```

The registration service owns normalization, hashing, and persistence.

### `plugins/app/registration/registration.service.js`

```js
import fp from 'fastify-plugin'

function createRegistrationService (app) {
  return {
    async register ({ username, email, password }) {
      const passwordHash = await app.passwordManager.hash(password)

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

### `plugins/app/registration/registration.routes.js`

```js
import fp from 'fastify-plugin'
import {
  registrationBody,
  registrationError,
  registrationResponse
} from './schemas.js'

export const registrationRoutesPlugin = fp(
  async function registrationRoutesPlugin (app) {
    app.addSchema(registrationError)

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
  },
  {
    name: 'registration-routes',
    encapsulate: true,
    dependencies: ['registration-service', 'users-schemas'],
    decorators: {
      fastify: ['registrationService']
    }
  }
)
```

The service can be reused outside HTTP. The route translates a duplicate email
into `409 Conflict` without knowing how users or passwords are stored.

## Compose the domain entry points

Keep the internal registration details out of `app.js`.

### `plugins/app/users/users.plugin.js`

```js
import fp from 'fastify-plugin'
import { usersSchemasPlugin } from './schemas.js'
import { usersRepositoryPlugin } from './users.repository.js'

export const usersPlugin = fp(
  async function usersPlugin (app) {
    app.register(usersSchemasPlugin)
    app.register(usersRepositoryPlugin)
  },
  {
    name: 'users',
    dependencies: ['knex']
  }
)
```

The repository stays inside the user domain. This entry point is not
encapsulated because registration and authentication need its schema and
repository.

Create the password entry point in `passwords/passwords.plugin.js`:

```js
import fp from 'fastify-plugin'
import { passwordManagerPlugin } from './password-manager.service.js'

export const passwordsPlugin = fp(
  async function passwordsPlugin (app) {
    app.register(passwordManagerPlugin)
  },
  { name: 'passwords' }
)
```

Then create `registration/registration.plugin.js`:

```js
import fp from 'fastify-plugin'
import {
  registrationRoutesPlugin
} from './registration.routes.js'
import {
  registrationServicePlugin
} from './registration.service.js'

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

Register only the domain entry points in the application scope:

```js
app.register(infrastructurePlugin, options)
app.register(errorsPlugin)

app.register(async function application (app) {
  app.register(usersPlugin)
  app.register(passwordsPlugin)
  // New for this chapter: user registration owns its service and route.
  app.register(registrationPlugin)
  app.register(authenticationPlugin)
  app.register(quotesPlugin)

  // Existing public routes.
})
```

## Seed and verify

Update the seed script to insert the `user` and `admin` roles and two sample
users. Hash both tutorial passwords before the transaction.

### `scripts/seed-database.js`

```js
import knex from 'knex'
import knexConfig from '../knexfile.js'
import {
  hashPassword
} from '../plugins/app/passwords/password-manager.service.js'

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

### `test/app.js`

```js
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

### `test/registration.test.js`

```js
import { describe, test } from 'node:test'
import { TEST_PASSWORD, createTestApp } from './app.js'

describe('registration', () => {
  test('registers a user with the default role', async (t) => {
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

    // Registration stores a verifiable hash, never the submitted password.
    const storedUser = await app.knex('users')
      .select('password')
      .where({ id: user.id })
      .first()

    t.assert.notEqual(storedUser.password, TEST_PASSWORD)
    t.assert.equal(
      await app.passwordManager.compare(TEST_PASSWORD, storedUser.password),
      true
    )
  })

  test('rejects registration with an existing email', async (t) => {
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

  test('validates the registration password policy', async (t) => {
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

Run the suite:

```bash
npm test
```

## Summary

Quote Vault now has database-backed users, hashed passwords, a default role,
and a public registration route backed by a separate registration service.

The next chapter will replace the teaching tokens with Redis-backed sessions
and real authentication.
