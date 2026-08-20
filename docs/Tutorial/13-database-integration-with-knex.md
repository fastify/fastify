# Database Integration With Knex

Right now, all quotes disappear when the server stops.

In this chapter, we are going to add a real persistence layer.

We will:

* connect Quote Vault to PostgreSQL with Knex,
* run PostgreSQL with Docker Compose,
* define a Knex migration for the `quotes` table,
* add small database management scripts,
* keep the integration inside Fastify plugins,
* and adapt our tests so they still stay isolated.

## Why Knex

Knex gives us a small and consistent interface for:

* creating a database client,
* running SQL queries,
* handling connection pools,
* and changing database backends later without rewriting our whole app shape.

Fastify does not prescribe one database library.

For PostgreSQL specifically, you could use
[`@fastify/postgres`](https://github.com/fastify/fastify-postgres) directly.
You can also use, or create, a Fastify plugin around any ORM or database
library.

## Install the dependencies

We will use PostgreSQL as the database and `pg` as the driver used by Knex.
Knex already ships with its migration CLI, so we do not need another migration
library to get started.

```bash
npm i knex pg
```

## Start PostgreSQL with Docker Compose

Rather than asking readers to install PostgreSQL manually, we can provide a
local containerized database.
This makes the tutorial easier to reproduce.

If you do not have Docker yet, use the official installation guides:

* [Docker Desktop](https://docs.docker.com/desktop/) for macOS, Windows, or Linux.
* [Docker Engine](https://docs.docker.com/engine/install/) for a native Linux installation.

If you prefer to install PostgreSQL directly instead of using Docker, the
official download page is here:

* [PostgreSQL Downloads](https://www.postgresql.org/download/)

### `docker-compose.yml`

```yaml
services:
  db:
    # Use the official PostgreSQL image.
    image: postgres:17-alpine
    environment:
      # These values initialize the database the first time the container starts.
      POSTGRES_DB: quote_vault
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      # Expose PostgreSQL on the local machine as localhost:5432.
      - 5432:5432
    healthcheck:
      # Wait until PostgreSQL is ready to accept connections.
      test: ["CMD-SHELL", "pg_isready -U postgres -d quote_vault"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      # Persist database files so data survives container restarts.
      - db_data:/var/lib/postgresql/data

volumes:
  # Named Docker volume used by the PostgreSQL container.
  db_data:
```

Start it with:

```bash
docker compose up -d
```

At this point, we have a PostgreSQL instance listening on `127.0.0.1:5432`.

## Extend the configuration

The previous chapter introduced validated configuration with `@fastify/env`.
Now we extend that configuration so the app knows how to reach PostgreSQL.
For this chapter, we want these database settings to be explicit, so we will
require them from a `.env` file instead of silently defaulting them.

Add the values to `.env` and keep `.env.example` synchronized:

```dotenv
HOST=127.0.0.1
PORT=3000
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=quote_vault
CAN_CREATE_DATABASE=0
CAN_DROP_DATABASE=0
CAN_SEED_DATABASE=0
```

### `plugins/infrastructure/env.ts`

```ts
import fp from 'fastify-plugin'
import fastifyEnv from '@fastify/env'

export interface AppConfig {
  HOST: string
  PORT: number
  POSTGRES_HOST: string
  POSTGRES_PORT: number
  POSTGRES_USER: string
  POSTGRES_PASSWORD: string
  POSTGRES_DB: string
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
  required: [
    'HOST',
    'PORT',
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB'
  ],
  properties: {
    HOST: { type: 'string', default: '0.0.0.0' },
    PORT: { type: 'integer', default: 3000 },
    POSTGRES_HOST: { type: 'string' },
    POSTGRES_PORT: { type: 'integer' },
    POSTGRES_USER: { type: 'string' },
    POSTGRES_PASSWORD: { type: 'string' },
    POSTGRES_DB: { type: 'string' }
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

This changes the startup contract:

* `HOST` and `PORT` still have sensible defaults.
* The PostgreSQL settings are required.
* If one of them is missing, the application fails during boot instead of
  guessing what database to use.

That makes the database dependency explicit, which is what we want now that the
application depends on real persistence.

The `CAN_*` flags are small safety guards for destructive or state-changing
scripts:

* `CAN_CREATE_DATABASE=1` allows creating the database.
* `CAN_DROP_DATABASE=1` allows dropping the database.
* `CAN_SEED_DATABASE=1` allows seeding the database.

They default to `0` so these scripts do not run accidentally.

These flags are only one layer of protection.
In a real deployment, another good safeguard is to avoid deploying these
scripts at all.
Many cloud platforms and PaaS setups let you exclude files from deployment,
which reduces the chance of running a destructive database command in the wrong
environment.

And independently of that, database backups should be configured at the
infrastructure level.

## Wrap Knex in an infrastructure plugin

The Knex client manages a database connection pool, so it belongs in
`plugins/infrastructure`.

### `plugins/infrastructure/knex.ts`

```ts
import fp from 'fastify-plugin'
import knex from 'knex'
import type { FastifyInstance } from 'fastify'
import type { Knex } from 'knex'

declare module 'fastify' {
  interface FastifyInstance {
    knex: Knex
  }
}

interface KnexPluginOptions {
  override?: Knex.Config
}

function buildKnexConfig (app: FastifyInstance): Knex.Config {
  return {
    // Use the PostgreSQL driver for this tutorial.
    client: 'pg',
    connection: {
      // Build the connection from validated Fastify configuration.
      host: app.config.POSTGRES_HOST,
      port: app.config.POSTGRES_PORT,
      user: app.config.POSTGRES_USER,
      password: app.config.POSTGRES_PASSWORD,
      database: app.config.POSTGRES_DB
    },
    pool: { min: 2, max: 10 }
  }
}

export const knexPlugin = fp<KnexPluginOptions>(
  async function knexPlugin (app, options) {
    const config = options.override ?? buildKnexConfig(app)

    // Expose the Knex client to the rest of the application.
    app.decorate('knex', knex(config))

    app.addHook('onClose', async function (instance) {
      // Close the connection pool during shutdown.
      await instance.knex.destroy()
    })
  },
  {
    name: 'knex',
    dependencies: ['env']
  }
)
```

This is the same integration idea we have used in earlier chapters:
one plugin owns the infrastructure setup, and the rest of the app consumes a
stable decorator.

Add Knex to the infrastructure entry point:

```ts
import fp from 'fastify-plugin'
import { envPlugin } from './env.ts'
import { knexPlugin } from './knex.ts'
import type { Knex } from 'knex'
import type { AppConfigInput } from './env.ts'

export interface InfrastructureOptions {
  env?: AppConfigInput
  knex?: Knex.Config
}

export const infrastructurePlugin = fp<InfrastructureOptions>(
  async function infrastructurePlugin (app, options) {
    app.register(envPlugin, { override: options.env })
    // New for this chapter: expose the shared database client.
    app.register(knexPlugin, { override: options.knex })
  },
  { name: 'infrastructure' }
)
```

## Add a Knex migration

Now that Knex is in place, we can define the database schema as a migration.

### `migrations/001_create_quotes_table.ts`

```ts
import type { Knex } from 'knex'

export async function up (knex: Knex) {
  await knex.schema.createTable('quotes', function (table) {
    table.increments('id').primary()
    table.text('text').notNullable()
  })
}

export async function down (knex: Knex) {
  await knex.schema.dropTableIfExists('quotes')
}
```

This gives us an explicit schema change history:

* `up` applies the migration,
* `down` rolls it back,
* and the migration becomes a real file in the project instead of hidden boot
  logic.

## Add a Knex migration command

Knex can read a dedicated `knexfile` to know how to connect and where the
migrations live.

### `knexfile.ts`

```ts
import { fileURLToPath } from 'node:url'

const migrationsDirectory = fileURLToPath(
  new URL('./migrations', import.meta.url)
)

export default {
  client: 'pg',
  connection: {
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB
  },
  migrations: {
    directory: migrationsDirectory
  }
}
```

Then we can add a script for applying migrations.

### `package.json`

```json
{
  "scripts": {
    "db:create": "node --env-file=.env ./scripts/create-database.ts",
    "db:drop": "node --env-file=.env ./scripts/drop-database.ts",
    "db:migrate": "node --env-file=.env ./scripts/migrate-database.ts",
    "db:seed": "node --env-file=.env ./scripts/seed-database.ts"
  }
}
```

We can now support the full local database lifecycle:

* `npm run db:create`
* `npm run db:migrate`
* `npm run db:seed`
* `npm run db:drop`

Let’s keep those helper scripts as small as possible.

### `scripts/migrate-database.ts`

```ts
import knex from 'knex'
import knexConfig from '../knexfile.ts'

const db = knex(knexConfig)

async function migrateDatabase () {
  try {
    const [, migrations] = await db.migrate.latest()

    if (migrations.length === 0) {
      console.log('Database is already up to date.')
      return
    }

    console.log(`Applied ${migrations.length} migration(s).`)
  } finally {
    await db.destroy()
  }
}

migrateDatabase().catch((err) => {
  console.error('Error applying migrations:', err)
  process.exit(1)
})
```

Calling Knex programmatically lets Node load the migration entry point and
the `.ts` migration files with its built-in type stripping. No TypeScript
loader or compiler is involved.

### `scripts/create-database.ts`

```ts
import { Client } from 'pg'

// This flag makes the operation opt-in instead of allowing it by default.
// It is one guardrail against accidental changes to a real database.
if (Number(process.env.CAN_CREATE_DATABASE) !== 1) {
  throw new Error("You can't create the database. Set `CAN_CREATE_DATABASE=1` environment variable to allow this operation.")
}

const databaseName = process.env.POSTGRES_DB

if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(databaseName)) {
  throw new Error('POSTGRES_DB must be a valid PostgreSQL identifier.')
}

const client = new Client({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: 'postgres'
})

await client.connect()

try {
  // pg_database is PostgreSQL's catalog of databases. We only select a
  // constant because we need to know whether a matching row exists.
  const exists = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [databaseName]
  )

  if ((exists.rowCount ?? 0) === 0) {
    await client.query(`CREATE DATABASE "${databaseName}"`)
  }
} finally {
  await client.end()
}
```

This connects to PostgreSQL’s default `postgres` database and creates our
application database only when it does not already exist. PostgreSQL does not
allow a database identifier to be passed as a query parameter, so the script
validates `POSTGRES_DB` before interpolating it into `CREATE DATABASE`. The drop
script applies the same check.

### `scripts/seed-database.ts`

```ts
import knex from 'knex'
import knexConfig from '../knexfile.ts'

if (Number(process.env.CAN_SEED_DATABASE) !== 1) {
  throw new Error("You can't seed the database. Set `CAN_SEED_DATABASE=1` environment variable to allow this operation.")
}

const db = knex(knexConfig)

try {
  await db.migrate.latest()

  await db('quotes').truncate()
  await db('quotes').insert([
    { text: 'Fastify keeps things focused.' },
    { text: 'Good defaults are only the beginning.' },
    { text: 'Persistence makes the demo feel real.' }
  ])
} finally {
  await db.destroy()
}
```

This is intentionally simple:

* apply migrations,
* clear the table,
* insert a few sample rows.

### `scripts/drop-database.ts`

```ts
import { Client } from 'pg'

if (Number(process.env.CAN_DROP_DATABASE) !== 1) {
  throw new Error("You can't drop the database. Set `CAN_DROP_DATABASE=1` environment variable to allow this operation.")
}

const databaseName = process.env.POSTGRES_DB

if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(databaseName)) {
  throw new Error('POSTGRES_DB must be a valid PostgreSQL identifier.')
}

const client = new Client({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: 'postgres'
})

await client.connect()

try {
  // PostgreSQL refuses to drop a database while clients are using it.
  // pg_stat_activity lists current connections, so this disconnects only
  // clients connected to our target database, never clients of other databases.
  // Excluding pg_backend_pid() also prevents this script from terminating its
  // own connection if the maintenance and target database names ever coincide.
  await client.query(
    `SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [databaseName]
  )

  await client.query(`DROP DATABASE IF EXISTS "${databaseName}"`)
} finally {
  await client.end()
}
```

Run the migration step with:

```bash
npm run db:migrate
```

Or run the whole local flow:

```bash
CAN_CREATE_DATABASE=1 npm run db:create
npm run db:migrate
CAN_SEED_DATABASE=1 npm run db:seed
```

When you really want to remove the database:

```bash
CAN_DROP_DATABASE=1 npm run db:drop
```

## Run migrations outside the application

At this point, we remove the in-memory
`plugins/app/quotes/quotes-database.service.ts`.
The application itself should not run migrations for us.
Migrations are an operational step that should be handled by the developers of
the project, locally or in CI, before the server starts.

Remove `quotesDatabaseServicePlugin` from `quotes.plugin.ts`. The quote domain
will keep its repository; only the resource it uses changes from an in-memory
decoration to the inherited `app.knex` client.

Delete
`test/plugins/app/quotes/quotes-database.service.test.ts`
as well. It tests the in-memory resource that we just removed; the Knex plugin
test later in this chapter replaces that lifecycle coverage.

## Rewrite the repository with SQL queries

The routes should not care whether data comes from a `Map` or from PostgreSQL.
That is the reason the repository abstraction exists.

### `plugins/app/quotes/quotes.repository.ts`

```ts
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import type { Quote } from './schemas.ts'

declare module 'fastify' {
  interface FastifyInstance {
    quotesRepository: ReturnType<typeof createQuotesRepository>
  }
}

function createQuotesRepository (app: FastifyInstance) {
  const repository = {
    async list (limit: number): Promise<Quote[]> {
      return app.knex<Quote>('quotes')
        .select('id', 'text')
        .orderBy('id')
        .limit(limit)
    },

    async get (id: number): Promise<Quote | null> {
      const quote = await app.knex<Quote>('quotes')
        .select('id', 'text')
        .where({ id })
        .first()

      return quote ?? null
    },

    async create (text: string): Promise<Quote> {
      const [quote] = await app.knex<Quote>('quotes')
        .insert({ text }, ['id', 'text'])
      return quote
    },

    async update (id: number, text: string): Promise<Quote | null> {
      const affectedRows = await app.knex<Quote>('quotes')
        .where({ id })
        .update({ text })

      if (affectedRows === 0) {
        return null
      }

      return repository.get(id)
    },

    async remove (id: number): Promise<boolean> {
      const affectedRows = await app.knex<Quote>('quotes')
        .where({ id })
        .delete()

      return affectedRows > 0
    }
  }

  return repository
}

export const quotesRepositoryPlugin = fp(
  async function quotesRepositoryPlugin (app) {
    app.decorate('quotesRepository', createQuotesRepository(app))
  },
  {
    name: 'quotes-repository',
    decorators: { fastify: ['knex'] }
  }
)
```

The repository API is still the same.
Only the implementation changed.
That is exactly the kind of refactoring boundary we want.

## Register the new plugin chain

The root composition does not import Knex or the repository directly. Their
entry plugins own that detail.

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

The dependency chain is now:

1. configuration,
2. Knex,
3. the quote domain,
4. its repository,
5. its routes.

## Await The Repository Calls

The repository now talks to PostgreSQL, so its methods return promises.
The route handlers can stay in the same shape, but they now need to `await`
repository calls.

For example:

```ts
app.get(
  '/quotes/:id',
  {
    schema: {
      params: idParam,
      response: singleQuoteResponse
    }
  },
  async function (request, reply) {
    const quote = await this.quotesRepository.get(request.params.id)
    if (!quote) {
      reply.code(404)
      return { message: 'Quote not found' }
    }
    return quote
  }
)
```

Apply the same change to every repository call in `quotes.routes.ts`:

* `await this.quotesRepository.list(limit)`
* `await this.quotesRepository.create(request.body.text)`
* `await this.quotesRepository.update(request.params.id, request.body.text)`
* `await this.quotesRepository.remove(request.params.id)`

The route structure and response handling stay unchanged.

## Keep the tests isolated

Tests should use the real PostgreSQL integration too, but they still need clean
state.
Since the app now talks to a shared database container, the easiest approach is
to run migrations in the test helper and then clear the `quotes` table whenever
a fresh test app boots.

### `test/app.ts`

```ts
import { createApp } from '../app.ts'
import { fileURLToPath } from 'node:url'
import type { AppOptions } from '../app.ts'

const migrationsDirectory = fileURLToPath(
  new URL('../migrations', import.meta.url)
)

export function createTestApp (options: AppOptions = {}) {
  const app = createApp({
    ...options,
    logger: options.logger ?? false,
    env: {
      HOST: '127.0.0.1',
      PORT: 3000,
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

This keeps the tests deterministic:
every fresh test app starts from the same migrated and empty database state.

> **Warning:** The test helper truncates the configured local tables. Running
> `npm test` can therefore remove quotes and users created during manual checks.
> If the application later appears to have inconsistent data after a test run,
> restore the tutorial fixtures:
>
> ```bash
> CAN_SEED_DATABASE=1 npm run db:seed
> ```

Because those tests now share one PostgreSQL database, we should also run them
serially for now.
Update the test script:

### `package.json`

```json
{
  "scripts": {
    "test": "borp --coverage --check-coverage --coverage-exclude \"migrations/**\" --coverage-exclude \"test/**\" --concurrency=1"
  }
}
```

You might not notice a problem immediately with a small test suite.
But as more features are added, more tests start creating records, and more test
files run at the same time, concurrent execution can trigger race conditions:
one test truncates tables while another test is still using them, or two tests
assume they are starting from an empty database.

Running with `--concurrency=1` avoids those issues until the test setup grows
into something more isolated, such as one database per worker or one schema per
test process.

Migration files are excluded from application coverage. Their contract is the
change they make to a real database, which you verify by applying them to the
disposable PostgreSQL database later in this chapter. A unit test built around
a hand-written Knex mock would mostly test that mock rather than the migration.
The explicit `test/**` exclusion preserves Borp’s usual behavior of leaving
test files and helpers out of application coverage.

The configuration and database plugin are now executable application code, so
they must be covered. Remove the
`builds the application when options are omitted` test from
`test/app.test.ts`; it does not assert useful application behavior. Remove the
now-unused `createApp` import from that file as well. The environment plugin
test continues to exercise the explicit configuration contract owned by our
wrapper. Reading `process.env` when `data` is omitted is behavior provided by
`@fastify/env` itself.

Replace `test/plugins/infrastructure/env.test.ts` with:

```ts
import { describe, test, type TestContext } from 'node:test'
import { createTestApp } from '../../app.ts'

describe('env plugin', function () {
  test('loads validated configuration', async function (t: TestContext) {
    const app = createTestApp({
      env: {
        HOST: '127.0.0.1',
        PORT: '4321'
      }
    })
    t.after(() => app.close())

    await app.ready()

    t.assert.deepStrictEqual(app.config, {
      HOST: '127.0.0.1',
      PORT: 4321,
      POSTGRES_HOST: '127.0.0.1',
      POSTGRES_PORT: 5432,
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_DB: 'quote_vault'
    })
  })
})
```

Add `test/plugins/infrastructure/knex.test.ts` to prove that the explicit
infrastructure override is selected and can establish a database connection:

```ts
import { test, type TestContext } from 'node:test'
import { createApp } from '../../../app.ts'

test('accepts an explicit Knex configuration', async function (t: TestContext) {
  const app = createApp({
    env: {
      HOST: '127.0.0.1',
      PORT: 3000,
      POSTGRES_HOST: '127.0.0.1',
      POSTGRES_PORT: 5432,
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_DB: 'quote_vault'
    },
    knex: {
      client: 'pg',
      connection: {
        host: '127.0.0.1',
        port: 5432,
        user: 'postgres',
        password: 'postgres',
        database: 'quote_vault'
      },
      pool: { min: 0, max: 1 }
    }
  })
  t.after(() => app.close())

  await app.ready()

  t.assert.deepStrictEqual(
    app.knex.client.config.pool,
    { min: 0, max: 1 }
  )

  const result = await app.knex.raw(
    'SELECT 1 AS connection_test'
  )
  t.assert.equal(
    Number(result.rows[0].connection_test),
    1
  )
})
```

Run `npm test` after PostgreSQL is healthy. The suite should remain at 100% for
all four coverage metrics.

## Manual verification

Start PostgreSQL:

```bash
docker compose up -d
```

Create the database:

```bash
CAN_CREATE_DATABASE=1 npm run db:create
```

Apply the migrations:

```bash
npm run db:migrate
```

Optionally seed it:

```bash
CAN_SEED_DATABASE=1 npm run db:seed
```

Then start the server:

```bash
npm run dev
```

Create a quote:

```bash
curl -X POST http://127.0.0.1:3000/quotes \
  -H 'authorization: Bearer admin' \
  -H 'content-type: application/json' \
  -d '{"text":"Persistence matters"}'
```

Read it back:

```bash
curl http://127.0.0.1:3000/quotes/1 \
  -H 'authorization: Bearer user'
```

Stop the server, start it again, and repeat the `GET`.
If the quote is still there, the application is now persisting data in
PostgreSQL.

## Summary

Quote Vault now has a real database layer:

* PostgreSQL runs in Docker Compose,
* configuration provides the connection settings,
* guarded helper scripts manage create, seed, and drop operations,
* Knex is wrapped in an infrastructure plugin,
* Knex migrations define the schema,
* the repository now issues SQL queries,
* and the test helper prepares a clean migrated database when needed.

At this point, the application no longer just looks structured.
It stores data through the same kind of integration pattern used in real
services.
