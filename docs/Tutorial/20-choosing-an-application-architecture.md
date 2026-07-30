# Architecture tools

Quote Vault already has an application architecture. Domain entry plugins own
their routes, services, repositories, and hooks, while infrastructure plugins
configure shared integrations. `app.ts` composes those boundaries explicitly.

Fastify provides the plugin model, encapsulation, lifecycle, and decorator API,
but it does not prescribe a project structure or dependency injection system.
This chapter briefly presents tools that can help as an application grows.

## Reduce registration with `@fastify/autoload`

[`@fastify/autoload`](https://github.com/fastify/fastify-autoload) discovers
Fastify plugins in a directory and registers them automatically. It can also
derive route prefixes from directory names and apply encapsulated hooks through
`autohooks` files.

## Add dependency injection with `@fastify/awilix`

[`@fastify/awilix`](https://github.com/fastify/fastify-awilix) integrates the
[Awilix](https://github.com/jeffijoe/awilix) dependency injection container
with Fastify.

## Use Fastify through NestJS

[NestJS](https://docs.nestjs.com/) is a complete application framework with
modules, controllers, providers, dependency injection, guards, pipes, and
interceptors.

Nest uses Express by default, but its
[`FastifyAdapter`](https://docs.nestjs.com/techniques/performance) can use
Fastify as the HTTP provider. Nest owns the application architecture while
Fastify supplies the HTTP server, routing, and request pipeline.

## Use Fastify through Stratify

[`Stratify`](https://stratifyjs.github.io/) is an architectural framework built
on Fastify that introduces clear structural boundaries and a robust dependency
injection system. Applications are defined through modules, providers,
controllers, hooks, installers, and adapters while maintaining Fastify's
performance and encapsulation model.

Stratify remains fully compatible with the Fastify ecosystem.
