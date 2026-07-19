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

Create a `.env` file:

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

You can also keep a `.env.example` file as a template for other developers, but
it should contain dummy values rather than real credentials.

### `plugins/external/env.js`

```js
import fp from 'fastify-plugin'
import fastifyEnv from '@fastify/env'

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

## Wrap Knex in an external plugin

Knex is a third-party dependency, so it belongs in `plugins/external`.

### `plugins/external/knex.js`

```js
import fp from 'fastify-plugin'
import knex from 'knex'

export function buildKnexConfig (app) {
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

export const knexPlugin = fp(
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

## Add a Knex migration

Now that Knex is in place, we can define the database schema as a migration.

### `migrations/001_create_quotes_table.js`

```js
export async function up (knex) {
  await knex.schema.createTable('quotes', function (table) {
    table.increments('id').primary()
    table.text('text').notNullable()
  })
}

export async function down (knex) {
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

### `knexfile.js`

```js
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
    "db:create": "node --env-file=.env ./scripts/create-database.js",
    "db:drop": "node --env-file=.env ./scripts/drop-database.js",
    "db:migrate": "node --env-file=.env ./node_modules/knex/bin/cli.js migrate:latest --knexfile knexfile.js",
    "db:seed": "node --env-file=.env ./scripts/seed-database.js"
  }
}
```

We can now support the full local database lifecycle:

* `npm run db:create`
* `npm run db:migrate`
* `npm run db:seed`
* `npm run db:drop`

Let’s keep those helper scripts as small as possible.

### `scripts/create-database.js`

```js
import { Client } from 'pg'

// This flag makes the operation opt-in instead of allowing it by default.
// It is one guardrail against accidental changes to a real database.
if (Number(process.env.CAN_CREATE_DATABASE) !== 1) {
  throw new Error("You can't create the database. Set `CAN_CREATE_DATABASE=1` environment variable to allow this operation.")
}

const databaseName = process.env.POSTGRES_DB

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

  if (exists.rowCount === 0) {
    await client.query(`CREATE DATABASE "${databaseName}"`)
  }
} finally {
  await client.end()
}
```

This connects to PostgreSQL’s default `postgres` database and creates our
application database only when it does not already exist.

### `scripts/seed-database.js`

```js
import knex from 'knex'
import knexConfig from '../knexfile.js'

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

### `scripts/drop-database.js`

```js
import { Client } from 'pg'

if (Number(process.env.CAN_DROP_DATABASE) !== 1) {
  throw new Error("You can't drop the database. Set `CAN_DROP_DATABASE=1` environment variable to allow this operation.")
}

const databaseName = process.env.POSTGRES_DB

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

This script is a little more careful because PostgreSQL will not drop a
database while clients are still connected to it.
So it first terminates active connections, then drops the database.

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

At this point, we deliberately drop the `plugins/app/db.js` migration plugin
approach.
The application itself should not run migrations for us.
Migrations are an operational step that should be handled by the developers of
the project, locally or in CI, before the server starts.

## Rewrite the repository with SQL queries

The routes should not care whether data comes from a `Map` or from PostgreSQL.
That is the reason the repository abstraction exists.

### `plugins/app/quotes-repo.js`

```js
import fp from 'fastify-plugin'

export function createQuotesRepository (app) {
  const repository = {
    async list (limit) {
      return app.knex('quotes')
        .select('id', 'text')
        .orderBy('id')
        .limit(limit)
    },

    async get (id) {
      const quote = await app.knex('quotes')
        .select('id', 'text')
        .where({ id })
        .first()

      return quote ?? null
    },

    async create (text) {
      const [id] = await app.knex('quotes').insert({ text }, ['id'])
      return repository.get(id.id)
    },

    async update (id, text) {
      const affectedRows = await app.knex('quotes')
        .where({ id })
        .update({ text })

      if (affectedRows === 0) {
        return null
      }

      return repository.get(id)
    },

    async remove (id) {
      const affectedRows = await app.knex('quotes')
        .where({ id })
        .delete()

      return affectedRows > 0
    }
  }

  return repository
}

export const quotesRepositoryPlugin = fp(
  async function quotesRepo (app) {
    app.decorate('quotesRepository', createQuotesRepository(app))
  },
  {
    name: 'quotes-repo',
    decorators: { fastify: ['knex'] }
  }
)
```

The repository API is still the same.
Only the implementation changed.
That is exactly the kind of refactoring boundary we want.

## Register the new plugin chain

Now the application assembly needs one extra step: create the Knex client
before the repository.

### `app.js`

```js
import fastify from 'fastify'
import { idParam } from './schemas.js'
import configureErrorHandlers from './error-handlers.js'
import { quotesRepositoryPlugin } from './plugins/app/quotes-repo.js'
import { envPlugin } from './plugins/external/env.js'
import { knexPlugin } from './plugins/external/knex.js'
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
  app.register(knexPlugin, { override: options.knex })
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

The dependency chain is now:

1. configuration,
2. Knex,
3. repository,
4. routes.

## Await The Repository Calls

The repository now talks to PostgreSQL, so its methods return promises.
The route handlers can stay in the same shape, but they now need to `await`
repository calls.

For example:

```js
app.get(
  '/quotes/:id',
  {
    schema: {
      params: { $ref: 'idParam#' },
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

The rest of the file changes in the same way:
the route structure stays the same, we just `await` the repository methods.

## Keep the tests isolated

Tests should use the real PostgreSQL integration too, but they still need clean
state.
Since the app now talks to a shared database container, the easiest approach is
to run migrations in the test helper and then clear the `quotes` table whenever
a fresh test app boots.

### `test/app.js`

```js
import { createApp } from '../app.js'
import { fileURLToPath } from 'node:url'

const migrationsDirectory = fileURLToPath(
  new URL('../migrations', import.meta.url)
)

export function createTestApp (options = {}) {
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

Because those tests now share one PostgreSQL database, we should also run them
serially for now.
Update the test script:

### `package.json`

```json
{
  "scripts": {
    "test": "borp --coverage --check-coverage --concurrency=1"
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

If one day you need to persist data across several test app instances, you can
always extend the helper with an explicit opt-out.
For now, always cleaning the table keeps the tutorial simpler and the test
suite easier to reason about.

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
* Knex is wrapped in an external plugin,
* Knex migrations define the schema,
* the repository now issues SQL queries,
* and the test helper prepares a clean migrated database when needed.

At this point, the application no longer just looks structured.
It stores data through the same kind of integration pattern used in real
services.
