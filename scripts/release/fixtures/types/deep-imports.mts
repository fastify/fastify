// Every declaration file stays importable on its own.
import type * as ContentTypeParser from 'fastify/types/content-type-parser.js'
import type * as Context from 'fastify/types/context.js'
import type * as Errors from 'fastify/types/errors.js'
import type * as Hooks from 'fastify/types/hooks.js'
import type * as Instance from 'fastify/types/instance.js'
import type * as Logger from 'fastify/types/logger.js'
import type * as Plugin from 'fastify/types/plugin.js'
import type * as Register from 'fastify/types/register.js'
import type * as Reply from 'fastify/types/reply.js'
import type * as Request from 'fastify/types/request.js'
import type * as Route from 'fastify/types/route.js'
import type * as Schema from 'fastify/types/schema.js'
import type * as ServerFactory from 'fastify/types/server-factory.js'
import type * as TypeProvider from 'fastify/types/type-provider.js'
import type * as Utils from 'fastify/types/utils.js'

export type DeepImports = [
  typeof import('fastify/types/content-type-parser.js'),
  typeof import('fastify/types/context.js'),
  typeof import('fastify/types/errors.js'),
  typeof import('fastify/types/hooks.js'),
  typeof import('fastify/types/instance.js'),
  typeof import('fastify/types/logger.js'),
  typeof import('fastify/types/plugin.js'),
  typeof import('fastify/types/register.js'),
  typeof import('fastify/types/reply.js'),
  typeof import('fastify/types/request.js'),
  typeof import('fastify/types/route.js'),
  typeof import('fastify/types/schema.js'),
  typeof import('fastify/types/server-factory.js'),
  typeof import('fastify/types/type-provider.js'),
  typeof import('fastify/types/utils.js')
]
