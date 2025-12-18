import type { IncomingHttpHeaders } from 'node:http'
import { Type, type TSchema, type Static } from '@sinclair/typebox'
import type { FromSchema, JSONSchema } from 'json-schema-to-ts'
import { expect } from 'tstyche'
import fastify, {
  type FastifyTypeProvider,
  type HookHandlerDoneFunction,
  type FastifyRequest,
  type FastifyReply,
  type FastifyInstance,
  type FastifyError,
  type SafePromiseLike
} from '../../fastify.js'

const server = fastify()

// -------------------------------------------------------------------
// Default (unknown)
// -------------------------------------------------------------------

server.get('/', (req) => expect(req.body).type.toBe<unknown>())

// -------------------------------------------------------------------
// Remapping
// -------------------------------------------------------------------

interface NumberProvider extends FastifyTypeProvider {
  validator: number
  serializer: number
} // remap all schemas to numbers

server.withTypeProvider<NumberProvider>().get(
  '/',
  {
    schema: {
      body: { type: 'string' },
      querystring: { type: 'string' },
      headers: { type: 'string' },
      params: { type: 'string' }
    }
  },
  (req) => {
    expect(req.headers).type.toBe<number & IncomingHttpHeaders>()
    expect(req.body).type.toBe<number>()
    expect(req.query).type.toBe<number>()
    expect(req.params).type.toBe<number>()
  }
)

// -------------------------------------------------------------------
// Override
// -------------------------------------------------------------------

interface OverriddenProvider extends FastifyTypeProvider { validator: 'inferenced' }

server.withTypeProvider<OverriddenProvider>().get<{ Body: 'override' }>(
  '/',
  {
    schema: {
      body: Type.Object({
        x: Type.Number(),
        y: Type.Number(),
        z: Type.Number()
      })
    }
  },
  (req) => {
    expect(req.body).type.toBe<'override'>()
  }
)

// -------------------------------------------------------------------
// TypeBox
// -------------------------------------------------------------------

interface TypeBoxProvider extends FastifyTypeProvider {
  validator: this['schema'] extends TSchema ? Static<this['schema']> : unknown
  serializer: this['schema'] extends TSchema ? Static<this['schema']> : unknown
}

server.withTypeProvider<TypeBoxProvider>().get(
  '/',
  {
    schema: {
      body: Type.Object({
        x: Type.Number(),
        y: Type.Number(),
        z: Type.Number()
      })
    },
    errorHandler: (error, request, reply) => {
      expect(error).type.toBe<FastifyError>()
      expect(request).type.toBeAssignableTo<FastifyRequest>()
      expect(request.body.x).type.toBe<number>()
      expect(request.body.y).type.toBe<number>()
      expect(request.body.z).type.toBe<number>()
      expect(reply).type.toBeAssignableTo<FastifyReply>()
    }
  },
  (req) => {
    expect(req.body.x).type.toBe<number>()
    expect(req.body.y).type.toBe<number>()
    expect(req.body.z).type.toBe<number>()
  }
)

expect(server.withTypeProvider<TypeBoxProvider>()).type.toBeAssignableTo<FastifyInstance>()

// -------------------------------------------------------------------
// JsonSchemaToTs
// -------------------------------------------------------------------

interface JsonSchemaToTsProvider extends FastifyTypeProvider {
  validator: this['schema'] extends JSONSchema ? FromSchema<this['schema']> : unknown
  serializer: this['schema'] extends JSONSchema ? FromSchema<this['schema']> : unknown
}

// explicitly setting schema `as const`

server.withTypeProvider<JsonSchemaToTsProvider>().get(
  '/',
  {
    schema: {
      body: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'string' },
          z: { type: 'boolean' }
        }
      } as const
    },
    errorHandler: (error, request, reply) => {
      expect(error).type.toBe<FastifyError>()
      expect(request).type.toBeAssignableTo<FastifyRequest>()
      expect(request.body.x).type.toBe<number | undefined>()
      expect(request.body.y).type.toBe<string | undefined>()
      expect(request.body.z).type.toBe<boolean | undefined>()
      expect(reply).type.toBeAssignableTo<FastifyReply>()
    }
  },
  (req) => {
    expect(req.body.x).type.toBe<number | undefined>()
    expect(req.body.y).type.toBe<string | undefined>()
    expect(req.body.z).type.toBe<boolean | undefined>()
  }
)

server.withTypeProvider<JsonSchemaToTsProvider>().route({
  url: '/',
  method: 'POST',
  schema: {
    body: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'string' },
        z: { type: 'boolean' }
      }
    }
  } as const,
  errorHandler: (error, request, reply) => {
    expect(error).type.toBe<FastifyError>()
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(request.body.x).type.toBe<number | undefined>()
    expect(request.body.y).type.toBe<string | undefined>()
    expect(request.body.z).type.toBe<boolean | undefined>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
  },
  handler: (req) => {
    expect(req.body.x).type.toBe<number | undefined>()
    expect(req.body.y).type.toBe<string | undefined>()
    expect(req.body.z).type.toBe<boolean | undefined>()
  }
})

// inferring schema `as const`

server.withTypeProvider<JsonSchemaToTsProvider>().get(
  '/',
  {
    schema: {
      body: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'string' },
          z: { type: 'boolean' }
        }
      }
    },
    errorHandler: (error, request, reply) => {
      expect(error).type.toBe<FastifyError>()
      expect(request).type.toBeAssignableTo<FastifyRequest>()
      expect(request.body.x).type.toBe<number | undefined>()
      expect(request.body.y).type.toBe<string | undefined>()
      expect(request.body.z).type.toBe<boolean | undefined>()
      expect(reply).type.toBeAssignableTo<FastifyReply>()
    }
  },
  (req) => {
    expect(req.body.x).type.toBe<number | undefined>()
    expect(req.body.y).type.toBe<string | undefined>()
    expect(req.body.z).type.toBe<boolean | undefined>()
  }
)

server.withTypeProvider<JsonSchemaToTsProvider>().route({
  url: '/',
  method: 'POST',
  schema: {
    body: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'string' },
        z: { type: 'boolean' }
      }
    }
  },
  errorHandler: (error, request, reply) => {
    expect(error).type.toBe<FastifyError>()
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(request.body.x).type.toBe<number | undefined>()
    expect(request.body.y).type.toBe<string | undefined>()
    expect(request.body.z).type.toBe<boolean | undefined>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
  },
  handler: (req) => {
    expect(req.body.x).type.toBe<number | undefined>()
    expect(req.body.y).type.toBe<string | undefined>()
    expect(req.body.z).type.toBe<boolean | undefined>()
  }
})

expect(server.withTypeProvider<JsonSchemaToTsProvider>()).type.toBeAssignableTo<FastifyInstance>()

// -------------------------------------------------------------------
// Instance Type Remappable
// -------------------------------------------------------------------

server.withTypeProvider<TypeBoxProvider>().withTypeProvider<JsonSchemaToTsProvider>().get(
  '/',
  {
    schema: {
      body: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'string' },
          z: { type: 'boolean' }
        }
      } as const
    },
    errorHandler: (error, request, reply) => {
      expect(error).type.toBe<FastifyError>()
      expect(request).type.toBeAssignableTo<FastifyRequest>()
      expect(request.body.x).type.toBe<number | undefined>()
      expect(request.body.y).type.toBe<string | undefined>()
      expect(request.body.z).type.toBe<boolean | undefined>()
      expect(reply).type.toBeAssignableTo<FastifyReply>()
    }
  },
  (req) => {
    expect(req.body.x).type.toBe<number | undefined>()
    expect(req.body.y).type.toBe<string | undefined>()
    expect(req.body.z).type.toBe<boolean | undefined>()
  }
)

// -------------------------------------------------------------------
// Request Hooks
// -------------------------------------------------------------------

// Sync handlers

server.withTypeProvider<TypeBoxProvider>().get(
  '/',
  {
    schema: {
      body: Type.Object({
        x: Type.Number(),
        y: Type.String(),
        z: Type.Boolean()
      })
    },
    preHandler: (req, reply, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    },
    preParsing: (req, reply, payload, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    },
    preSerialization: (req, reply, payload, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    },
    preValidation: (req, reply, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    },
    onError: (req, reply, error, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    },
    onRequest: (req, reply, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    },
    onResponse: (req, reply, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    },
    onTimeout: (req, reply, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    },
    onSend: (req, reply, payload, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    }
  },
  req => {
    expect(req.body.x).type.toBe<number>()
    expect(req.body.y).type.toBe<string>()
    expect(req.body.z).type.toBe<boolean>()
  }
)

// Async handlers

server.withTypeProvider<TypeBoxProvider>().get(
  '/',
  {
    schema: {
      body: Type.Object({
        x: Type.Number(),
        y: Type.String(),
        z: Type.Boolean()
      })
    },
    preHandler: async (req, reply, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    },
    preParsing: async (req, reply, payload, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    },
    preSerialization: async (req, reply, payload, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    },
    preValidation: async (req, reply, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    },
    onError: async (req, reply, error, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    },
    onRequest: async (req, reply, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    },
    onResponse: async (req, reply, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    },
    onTimeout: async (req, reply, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    },
    onSend: async (req, reply, payload, done) => {
      expect(req.body.x).type.toBe<number>()
      expect(req.body.y).type.toBe<string>()
      expect(req.body.z).type.toBe<boolean>()
    }
  },
  req => {
    expect(req.body.x).type.toBe<number>()
    expect(req.body.y).type.toBe<string>()
    expect(req.body.z).type.toBe<boolean>()
  }
)

// -------------------------------------------------------------------
// Request headers
// -------------------------------------------------------------------

// JsonSchemaToTsProvider
server.withTypeProvider<JsonSchemaToTsProvider>().get(
  '/',
  {
    schema: {
      headers: {
        type: 'object',
        properties: {
          lowercase: { type: 'string' },
          UPPERCASE: { type: 'number' },
          camelCase: { type: 'boolean' },
          'KEBAB-case': { type: 'boolean' },
          PRESERVE_OPTIONAL: { type: 'number' }
        },
        required: ['lowercase', 'UPPERCASE', 'camelCase', 'KEBAB-case']
      } as const
    }
  },
  (req) => {
    expect(req.headers.lowercase).type.toBe<string>()
    expect(req.headers.UPPERCASE).type.toBe<string | string[] | undefined>()
    expect(req.headers.uppercase).type.toBe<number>()
    expect(req.headers.camelcase).type.toBe<boolean>()
    expect(req.headers['kebab-case']).type.toBe<boolean>()
    expect(req.headers.preserve_optional).type.toBe<number | undefined>()
  }
)

// TypeBoxProvider
server.withTypeProvider<TypeBoxProvider>().get(
  '/',
  {
    schema: {
      headers: Type.Object({
        lowercase: Type.String(),
        UPPERCASE: Type.Number(),
        camelCase: Type.Boolean(),
        'KEBAB-case': Type.Boolean(),
        PRESERVE_OPTIONAL: Type.Optional(Type.Number())
      })
    }
  },
  (req) => {
    expect(req.headers.lowercase).type.toBe<string>()
    expect(req.headers.UPPERCASE).type.toBe<string | string[] | undefined>()
    expect(req.headers.uppercase).type.toBe<number>()
    expect(req.headers.camelcase).type.toBe<boolean>()
    expect(req.headers['kebab-case']).type.toBe<boolean>()
    expect(req.headers.preserve_optional).type.toBe<number | undefined>()
  }
)

// -------------------------------------------------------------------
// TypeBox Reply Type
// -------------------------------------------------------------------

server.withTypeProvider<TypeBoxProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: Type.String(),
        400: Type.Number(),
        500: Type.Object({
          error: Type.String()
        })
      }
    }
  },
  async (_, res) => {
    res.send('hello')
    res.send(42)
    res.send({ error: 'error' })
    expect(res.code(200).send).type.toBe<(payload?: string) => typeof res>()
    expect(res.code(400).send).type.toBe<(payload?: number) => typeof res>()
    expect(res.code(500).send).type.toBe<(payload?: { error: string }) => typeof res>()
  }
)

// -------------------------------------------------------------------
// TypeBox Reply Type (Different Content-types)
// -------------------------------------------------------------------

server.withTypeProvider<TypeBoxProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: {
          content: {
            'text/string': {
              schema: Type.String()
            },
            'application/json': {
              schema: Type.Object({
                msg: Type.String()
              })
            }
          }
        },
        500: Type.Object({
          error: Type.String()
        })
      }
    }
  },
  async (_, res) => {
    res.send('hello')
    res.send({ msg: 'hello' })
    res.send({ error: 'error' })
  }
)

// -------------------------------------------------------------------
// TypeBox Reply Type: Non Assignable
// -------------------------------------------------------------------

server.withTypeProvider<TypeBoxProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: Type.String(),
        400: Type.Number(),
        500: Type.Object({
          error: Type.String()
        })
      }
    }
  },
  async (_, res) => {
    expect(res.send).type.not.toBeCallableWith(false)
  }
)

// -------------------------------------------------------------------
// TypeBox Reply Type: Non Assignable (Different Content-types)
// -------------------------------------------------------------------

server.withTypeProvider<TypeBoxProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: {
          content: {
            'text/string': {
              schema: Type.String()
            },
            'application/json': {
              schema: Type.Object({
                msg: Type.String()
              })
            }
          }
        },
        500: Type.Object({
          error: Type.String()
        })
      }
    }
  },
  async (_, res) => {
    expect(res.send).type.not.toBeCallableWith(false)
  }
)

// -------------------------------------------------------------------
// TypeBox Reply Return Type
// -------------------------------------------------------------------

server.withTypeProvider<TypeBoxProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: Type.String(),
        400: Type.Number(),
        500: Type.Object({
          error: Type.String()
        })
      }
    }
  },
  async (_, res) => {
    const option = 1 as 1 | 2 | 3
    switch (option) {
      case 1: return 'hello'
      case 2: return 42
      case 3: return { error: 'error' }
    }
  }
)

// -------------------------------------------------------------------
// TypeBox Reply Return Type (Different Content-types)
// -------------------------------------------------------------------

server.withTypeProvider<TypeBoxProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: {
          content: {
            'text/string': {
              schema: Type.String()
            },
            'application/json': {
              schema: Type.Object({
                msg: Type.String()
              })
            }
          }
        },
        500: Type.Object({
          error: Type.String()
        })
      }
    }
  },
  async (_, res) => {
    const option = 1 as 1 | 2 | 3
    switch (option) {
      case 1: return 'hello'
      case 2: return { msg: 'hello' }
      case 3: return { error: 'error' }
    }
  }
)

// -------------------------------------------------------------------
// TypeBox Reply Return Type: Non Assignable
// -------------------------------------------------------------------

expect(server.withTypeProvider<TypeBoxProvider>().get).type.not.toBeCallableWith(
  '/',
  {
    schema: {
      response: {
        200: Type.String(),
        400: Type.Number(),
        500: Type.Object({
          error: Type.String()
        })
      }
    }
  },
  async () => {
    return false
  }
)

// -------------------------------------------------------------------
// TypeBox Reply Return Type: Non Assignable (Different Content-types)
// -------------------------------------------------------------------

expect(server.withTypeProvider<TypeBoxProvider>().get).type.not.toBeCallableWith(
  '/',
  {
    schema: {
      response: {
        200: {
          content: {
            'text/string': {
              schema: Type.String()
            },
            'application/json': {
              schema: Type.Object({
                msg: Type.String()
              })
            }
          }
        },
        500: Type.Object({
          error: Type.String()
        })
      }
    }
  },
  async () => {
    return false
  }
)

// -------------------------------------------------------------------
// JsonSchemaToTs Reply Type
// -------------------------------------------------------------------

server.withTypeProvider<JsonSchemaToTsProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: { type: 'string' },
        400: { type: 'number' },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  (_, res) => {
    res.send('hello')
    res.send(42)
    res.send({ error: 'error' })
    expect(res.code(200).send).type.toBe<(payload?: string) => typeof res>()
    expect(res.code(400).send).type.toBe<(payload?: number) => typeof res>()
    expect(res.code(500).send).type.toBe<(payload?: { [x: string]: unknown; error?: string }) => typeof res>()
  }
)

// -------------------------------------------------------------------
// JsonSchemaToTs Reply Type (Different Content-types)
// -------------------------------------------------------------------

server.withTypeProvider<JsonSchemaToTsProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: {
          content: {
            'text/string': {
              schema: { type: 'string' }
            },
            'application/json': {
              schema: { type: 'object', properties: { msg: { type: 'string' } } }
            }
          }
        },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  (_, res) => {
    res.send('hello')
    res.send({ msg: 'hello' })
    res.send({ error: 'error' })
  }
)

// -------------------------------------------------------------------
// JsonSchemaToTs Reply Type: Non Assignable
// -------------------------------------------------------------------

server.withTypeProvider<JsonSchemaToTsProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: { type: 'string' },
        400: { type: 'number' },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  async (_, res) => {
    expect(res.send).type.not.toBeCallableWith(false)
  }
)

// -------------------------------------------------------------------
// JsonSchemaToTs Reply Type: Non Assignable (Different Content-types)
// -------------------------------------------------------------------

server.withTypeProvider<JsonSchemaToTsProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: {
          content: {
            'text/string': {
              schema: { type: 'string' }
            },
            'application/json': {
              schema: { type: 'object', properties: { msg: { type: 'string' } } }
            }
          }
        },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  async (_, res) => {
    expect(res.send).type.not.toBeCallableWith(false)
  }
)

// -------------------------------------------------------------------
// JsonSchemaToTs Reply Type Return
// -------------------------------------------------------------------

server.withTypeProvider<JsonSchemaToTsProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: { type: 'string' },
        400: { type: 'number' },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  async (_, res) => {
    const option = 1 as 1 | 2 | 3
    switch (option) {
      case 1: return 'hello'
      case 2: return 42
      case 3: return { error: 'error' }
    }
  }
)

// -------------------------------------------------------------------
// JsonSchemaToTs Reply Type Return (Different Content-types)
// -------------------------------------------------------------------

server.withTypeProvider<JsonSchemaToTsProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: {
          content: {
            'text/string': {
              schema: { type: 'string' }
            },
            'application/json': {
              schema: { type: 'object', properties: { msg: { type: 'string' } } }
            }
          }
        },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  async (_, res) => {
    const option = 1 as 1 | 2 | 3
    switch (option) {
      case 1: return 'hello'
      case 2: return { msg: 'hello' }
      case 3: return { error: 'error' }
    }
  }
)

// -------------------------------------------------------------------
// JsonSchemaToTs Reply Type Return: Non Assignable
// -------------------------------------------------------------------

expect(server.withTypeProvider<JsonSchemaToTsProvider>().get).type.not.toBeCallableWith(
  '/',
  {
    schema: {
      response: {
        200: { type: 'string' },
        400: { type: 'number' },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  async () => {
    return false
  }
)

// https://github.com/fastify/fastify/issues/4088
expect(server.withTypeProvider<JsonSchemaToTsProvider>().get).type.not.toBeCallableWith('/', {
  schema: {
    response: {
      200: { type: 'string' }
    }
  } as const
}, () => {
  return { foo: 555 }
})

// -------------------------------------------------------------------
// JsonSchemaToTs Reply Type Return: Non Assignable (Different Content-types)
// -------------------------------------------------------------------

expect(server.withTypeProvider<JsonSchemaToTsProvider>().get).type.not.toBeCallableWith(
  '/',
  {
    schema: {
      response: {
        200: {
          content: {
            'text/string': {
              schema: { type: 'string' }
            },
            'application/json': {
              schema: { type: 'object', properties: { msg: { type: 'string' } } }
            }
          }
        },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  async () => {
    return false
  }
)

// -------------------------------------------------------------------
// Reply Type Override
// -------------------------------------------------------------------

server.withTypeProvider<JsonSchemaToTsProvider>().get<{ Reply: boolean }>(
  '/',
  {
    schema: {
      response: {
        200: { type: 'string' },
        400: { type: 'number' },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  async (_, res) => {
    res.send(true)
  }
)

// -------------------------------------------------------------------
// Reply Type Override (Different Content-types)
// -------------------------------------------------------------------

server.withTypeProvider<JsonSchemaToTsProvider>().get<{ Reply: boolean }>(
  '/',
  {
    schema: {
      response: {
        200: {
          content: {
            'text/string': {
              schema: { type: 'string' }
            },
            'application/json': {
              schema: { type: 'object', properties: { msg: { type: 'string' } } }
            }
          }
        },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  async (_, res) => {
    res.send(true)
  }
)

// -------------------------------------------------------------------
// Reply Type Return Override
// -------------------------------------------------------------------

server.withTypeProvider<JsonSchemaToTsProvider>().get<{ Reply: boolean }>(
  '/',
  {
    schema: {
      response: {
        200: { type: 'string' },
        400: { type: 'number' },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  async (_, res) => {
    return true
  }
)

// -------------------------------------------------------------------
// Reply Type Return Override (Different Content-types)
// -------------------------------------------------------------------

server.withTypeProvider<JsonSchemaToTsProvider>().get<{ Reply: boolean }>(
  '/',
  {
    schema: {
      response: {
        200: {
          content: {
            'text/string': {
              schema: { type: 'string' }
            },
            'application/json': {
              schema: { type: 'object', properties: { msg: { type: 'string' } } }
            }
          }
        },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  async (_, res) => {
    return true
  }
)

// -------------------------------------------------------------------
// Reply Status Code (Different Status Codes)
// -------------------------------------------------------------------

server.withTypeProvider<JsonSchemaToTsProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: {
          content: {
            'text/string': {
              schema: { type: 'string' }
            },
            'application/json': {
              schema: { type: 'object', properties: { msg: { type: 'string' } } }
            }
          }
        },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  async (_, res) => {
    res.code(200)
    res.code(500)
    expect(res.code).type.not.toBeCallableWith(201)
    expect(res.code).type.not.toBeCallableWith(400)
  }
)

// -------------------------------------------------------------------
// RouteGeneric Reply Type Return (Different Status Codes)
// -------------------------------------------------------------------

server.get<{
  Reply: {
    200: string | { msg: string }
    400: number
    '5xx': { error: string }
  }
}>(
  '/',
  async (_, res) => {
    const option = 1 as 1 | 2 | 3 | 4
    switch (option) {
      case 1: return 'hello'
      case 2: return { msg: 'hello' }
      case 3: return 400
      case 4: return { error: 'error' }
    }
  }
)

// -------------------------------------------------------------------
// RouteGeneric Status Code (Different Status Codes)
// -------------------------------------------------------------------

server.get<{
  Reply: {
    200: string | { msg: string }
    400: number
    '5xx': { error: string }
  }
}>(
  '/',
  async (_, res) => {
    res.code(200)
    res.code(400)
    res.code(500)
    res.code(502)
    expect(res.code).type.not.toBeCallableWith(201)
    expect(res.code).type.not.toBeCallableWith(300)
    expect(res.code).type.not.toBeCallableWith(404)
    return 'hello'
  }
)

// -------------------------------------------------------------------
// RouteGeneric Reply Type Return: Non Assignable (Different Status Codes)
// -------------------------------------------------------------------

expect(server.get<{
  Reply: {
    200: string | { msg: string }
    400: number
    '5xx': { error: string }
  }
}>).type.not.toBeCallableWith(
  '/',
  async () => {
    return true
  }
)

// -------------------------------------------------------------------
// FastifyPlugin: Auxiliary
// -------------------------------------------------------------------

interface AuxiliaryPluginProvider extends FastifyTypeProvider { validator: 'plugin-auxiliary' }

// Auxiliary plugins may have varying server types per application. Recommendation would be to explicitly remap instance provider context within plugin if required.
function plugin<T extends FastifyInstance> (instance: T) {
  instance.withTypeProvider<AuxiliaryPluginProvider>().get(
    '/',
    {
      schema: { body: null }
    },
    (req) => {
      expect(req.body).type.toBe<'plugin-auxiliary'>()
    }
  )
}

server.withTypeProvider<AuxiliaryPluginProvider>().register(plugin).get(
  '/',
  {
    schema: { body: null }
  },
  (req) => {
    expect(req.body).type.toBe<'plugin-auxiliary'>()
  }
)

// -------------------------------------------------------------------
// Handlers: Inline
// -------------------------------------------------------------------

interface InlineHandlerProvider extends FastifyTypeProvider { validator: 'handler-inline' }

// Inline handlers should infer for the request parameters (non-shared)
server.withTypeProvider<InlineHandlerProvider>().get(
  '/',
  {
    onRequest: (req, res, done) => {
      expect(req.body).type.toBe<'handler-inline'>()
    },
    schema: { body: null }
  },
  (req) => {
    expect(req.body).type.toBe<'handler-inline'>()
  }
)

// -------------------------------------------------------------------
// Handlers: Auxiliary
// -------------------------------------------------------------------

interface AuxiliaryHandlerProvider extends FastifyTypeProvider { validator: 'handler-auxiliary' }

// Auxiliary handlers are likely shared for multiple routes and thus should infer as unknown due to potential varying parameters
function auxiliaryHandler (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction): void {
  expect(request.body).type.toBe<unknown>()
}

server.withTypeProvider<AuxiliaryHandlerProvider>().get(
  '/',
  {
    onRequest: auxiliaryHandler,
    schema: { body: 'handler-auxiliary' }
  },
  (req) => {
    expect(req.body).type.toBe<'handler-auxiliary'>()
  }
)

// -------------------------------------------------------------------
// SafePromiseLike
// -------------------------------------------------------------------
const safePromiseLike = {
  then: new Promise<string>(resolve => resolve('')).then,
  __linterBrands: 'SafePromiseLike' as const
}
expect(safePromiseLike).type.toBeAssignableTo<SafePromiseLike<string>>()
expect(safePromiseLike).type.toBeAssignableTo<PromiseLike<string>>()
expect(safePromiseLike).type.not.toBeAssignableTo<Promise<string>>()

// -------------------------------------------------------------------
// Separate Providers
// -------------------------------------------------------------------

interface SeparateProvider extends FastifyTypeProvider {
  validator: string
  serializer: Date
}

server.withTypeProvider<SeparateProvider>().get(
  '/',
  {
    schema: {
      body: null,
      response: {
        200: { type: 'string' }
      }
    }
  },
  (req, res) => {
    expect(req.body).type.toBe<string>()

    res.send(new Date())
  }
)
