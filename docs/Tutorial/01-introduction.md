# Introduction

This tutorial builds a small Fastify REST API named *Quote Vault*. Users can
register, authenticate, and manage memorable quotes. Role-based authorization
reserves destructive operations for administrators.

We start with a single server and refine it incrementally. Each chapter adds a
Fastify concept or an application feature, updates the runnable demo, and
verifies the resulting behavior.

## Prerequisites

To follow the tutorial, you should have:

* a basic understanding of TypeScript, Node.js, and HTTP,
* Node.js 24 or later,
* npm,
* an HTTP client such as curl or Postman,
* Docker with Docker Compose for PostgreSQL and Redis,
* and basic familiarity with terminal commands.

## What we will cover

The first chapters introduce Fastify's core:

* creating a server and defining routes,
* decorating Fastify instances,
* validating input and serializing responses with JSON Schema,
* choosing and scoping lifecycle hooks,
* handling errors and unknown routes,
* using plugins and encapsulation,
* and testing with `node:test` through `borp`, `fastify.inject()`, and coverage.

We then organize the application around domain entry plugins. Routes, schemas,
services, repositories, and hook builders stay with the domain that owns them.
Infrastructure plugins manage shared integrations such as configuration,
PostgreSQL, Redis, sessions, CORS, and rate limiting.

Finally, we implement the application features:

* PostgreSQL persistence with Knex and explicit migrations,
* browser access through CORS,
* user registration and password hashing,
* Redis-backed cookie sessions,
* authentication and role-based authorization,
* shared rate limits for public and authenticated requests,
* and interactive OpenAPI documentation with Swagger UI.

The tutorial combines official Fastify plugins, independent libraries, and
application code written specifically for Quote Vault. Fastify provides the
plugin model and lifecycle; it does not restrict how application features are
implemented.

By the end, you will have a tested and documented Fastify application and a
practical model for deciding where routes, hooks, domain behavior, and
infrastructure belong.
