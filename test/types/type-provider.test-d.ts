import fastify, {
  FastifyTypeProvider,
  HookHandlerDoneFunction,
  FastifyRequest,
  FastifyReply,
  FastifyInstance
} from '../../fastify'
import { expectAssignable, expectError, expectType } from 'tsd'
import { IncomingHttpHeaders } from 'http'
import { Type, TSchema, Static } from '@sinclair/typebox'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'

const server = fastify()

// -------------------------------------------------------------------
// Default (unknown)
// -------------------------------------------------------------------

expectAssignable(server.get('/', (req) => expectType<unknown>(req.body)))

// -------------------------------------------------------------------
// Remapping
// -------------------------------------------------------------------

interface NumberProvider extends FastifyTypeProvider { output: number } // remap all schemas to numbers

expectAssignable(server.withTypeProvider<NumberProvider>().get(
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
    expectType<number & IncomingHttpHeaders>(req.headers)
    expectType<number>(req.body)
    expectType<number>(req.query)
    expectType<number>(req.params)
  }
))

// -------------------------------------------------------------------
// Override
// -------------------------------------------------------------------

interface OverriddenProvider extends FastifyTypeProvider { output: 'inferenced' }

expectAssignable(server.withTypeProvider<OverriddenProvider>().get<{ Body: 'override' }>(
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
    expectType<'override'>(req.body)
  }
))

// -------------------------------------------------------------------
// TypeBox
// -------------------------------------------------------------------

interface TypeBoxProvider extends FastifyTypeProvider { output: this['input'] extends TSchema ? Static<this['input']> : unknown }

expectAssignable(server.withTypeProvider<TypeBoxProvider>().get(
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
    expectType<number>(req.body.x)
    expectType<number>(req.body.y)
    expectType<number>(req.body.z)
  }
))

expectAssignable<FastifyInstance>(server.withTypeProvider<TypeBoxProvider>())

// -------------------------------------------------------------------
// JsonSchemaToTs
// -------------------------------------------------------------------

interface JsonSchemaToTsProvider extends FastifyTypeProvider { output: this['input'] extends JSONSchema ? FromSchema<this['input']> : unknown }

expectAssignable(server.withTypeProvider<JsonSchemaToTsProvider>().get(
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
    }
  },
  (req) => {
    expectType<number | undefined>(req.body.x)
    expectType<string | undefined>(req.body.y)
    expectType<boolean | undefined>(req.body.z)
  }
))

expectAssignable<FastifyInstance>(server.withTypeProvider<JsonSchemaToTsProvider>())

// -------------------------------------------------------------------
// Instance Type Remappable
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<TypeBoxProvider>().withTypeProvider<JsonSchemaToTsProvider>().get(
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
    }
  },
  (req) => {
    expectType<number | undefined>(req.body.x)
    expectType<string | undefined>(req.body.y)
    expectType<boolean | undefined>(req.body.z)
  }
))

// -------------------------------------------------------------------
// Request Hooks
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<TypeBoxProvider>().get(
  '/',
  {
    schema: {
      body: Type.Object({
        x: Type.Number(),
        y: Type.String(),
        z: Type.Boolean()
      })
    },
    preHandler: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    },
    preParsing: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    },
    preSerialization: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    },
    preValidation: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    },
    onError: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    },
    onRequest: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    },
    onResponse: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    },
    onTimeout: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    },
    onSend: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    }
  },
  req => {
    expectType<number>(req.body.x)
    expectType<string>(req.body.y)
    expectType<boolean>(req.body.z)
  }
))

// -------------------------------------------------------------------
// TypeBox Reply Type
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<TypeBoxProvider>().get(
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
  }
))

// -------------------------------------------------------------------
// TypeBox Reply Type (Different Content-types)
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<TypeBoxProvider>().get(
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
))

// -------------------------------------------------------------------
// TypeBox Reply Type: Non Assignable
// -------------------------------------------------------------------

expectError(server.withTypeProvider<TypeBoxProvider>().get(
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
    res.send(false)
  }
))

// -------------------------------------------------------------------
// TypeBox Reply Type: Non Assignable (Different Content-types)
// -------------------------------------------------------------------

expectError(server.withTypeProvider<TypeBoxProvider>().get(
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
    res.send(false)
  }
))

// -------------------------------------------------------------------
// TypeBox Reply Return Type
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<TypeBoxProvider>().get(
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
))

// -------------------------------------------------------------------
// TypeBox Reply Return Type (Different Content-types)
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<TypeBoxProvider>().get(
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
))

// -------------------------------------------------------------------
// TypeBox Reply Return Type: Non Assignable
// -------------------------------------------------------------------

expectError(server.withTypeProvider<TypeBoxProvider>().get(
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
    return false
  }
))

// -------------------------------------------------------------------
// TypeBox Reply Return Type: Non Assignable (Different Content-types)
// -------------------------------------------------------------------

expectError(server.withTypeProvider<TypeBoxProvider>().get(
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
    return false
  }
))

// -------------------------------------------------------------------
// JsonSchemaToTs Reply Type
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<JsonSchemaToTsProvider>().get(
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
  }
))

// -------------------------------------------------------------------
// JsonSchemaToTs Reply Type (Different Content-types)
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<JsonSchemaToTsProvider>().get(
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
))

// -------------------------------------------------------------------
// JsonSchemaToTs Reply Type: Non Assignable
// -------------------------------------------------------------------

expectError(server.withTypeProvider<JsonSchemaToTsProvider>().get(
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
    res.send(false)
  }
))

// -------------------------------------------------------------------
// JsonSchemaToTs Reply Type: Non Assignable (Different Content-types)
// -------------------------------------------------------------------

expectError(server.withTypeProvider<JsonSchemaToTsProvider>().get(
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
    res.send(false)
  }
))

// -------------------------------------------------------------------
// JsonSchemaToTs Reply Type Return
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<JsonSchemaToTsProvider>().get(
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
))

// -------------------------------------------------------------------
// JsonSchemaToTs Reply Type Return (Different Content-types)
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<JsonSchemaToTsProvider>().get(
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
))

// -------------------------------------------------------------------
// JsonSchemaToTs Reply Type Return: Non Assignable
// -------------------------------------------------------------------

expectError(server.withTypeProvider<JsonSchemaToTsProvider>().get(
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
    return false
  }
))

// https://github.com/fastify/fastify/issues/4088
expectError(server.withTypeProvider<JsonSchemaToTsProvider>().get('/', {
  schema: {
    response: {
      200: { type: 'string' }
    }
  } as const
}, (_, res) => {
  return { foo: 555 }
}))

// -------------------------------------------------------------------
// JsonSchemaToTs Reply Type Return: Non Assignable (Different Content-types)
// -------------------------------------------------------------------

expectError(server.withTypeProvider<JsonSchemaToTsProvider>().get(
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
    return false
  }
))

// -------------------------------------------------------------------
// Reply Type Override
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<JsonSchemaToTsProvider>().get<{Reply: boolean}>(
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
))

// -------------------------------------------------------------------
// Reply Type Override (Different Content-types)
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<JsonSchemaToTsProvider>().get<{Reply: boolean}>(
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
))

// -------------------------------------------------------------------
// Reply Type Return Override
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<JsonSchemaToTsProvider>().get<{Reply: boolean}>(
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
))

// -------------------------------------------------------------------
// Reply Type Return Override (Different Content-types)
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<JsonSchemaToTsProvider>().get<{Reply: boolean}>(
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
))

// -------------------------------------------------------------------
// FastifyPlugin: Auxiliary
// -------------------------------------------------------------------

interface AuxiliaryPluginProvider extends FastifyTypeProvider { output: 'plugin-auxiliary' }

// Auxiliary plugins may have varying server types per application. Recommendation would be to explicitly remap instance provider context within plugin if required.
function plugin<T extends FastifyInstance> (instance: T) {
  expectAssignable(instance.withTypeProvider<AuxiliaryPluginProvider>().get(
    '/',
    {
      schema: { body: null }
    },
    (req) => {
      expectType<'plugin-auxiliary'>(req.body)
    }
  ))
}

expectAssignable(server.withTypeProvider<AuxiliaryPluginProvider>().register(plugin).get(
  '/',
  {
    schema: { body: null }
  },
  (req) => {
    expectType<'plugin-auxiliary'>(req.body)
  }
))

// -------------------------------------------------------------------
// Handlers: Inline
// -------------------------------------------------------------------

interface InlineHandlerProvider extends FastifyTypeProvider { output: 'handler-inline' }

// Inline handlers should infer for the request parameters (non-shared)
expectAssignable(server.withTypeProvider<InlineHandlerProvider>().get(
  '/',
  {
    onRequest: (req, res) => {
      expectType<'handler-inline'>(req.body)
    },
    schema: { body: null }
  },
  (req) => {
    expectType<'handler-inline'>(req.body)
  }
))

// -------------------------------------------------------------------
// Handlers: Auxiliary
// -------------------------------------------------------------------

interface AuxiliaryHandlerProvider extends FastifyTypeProvider { output: 'handler-auxiliary' }

// Auxiliary handlers are likely shared for multiple routes and thus should infer as unknown due to potential varying parameters
function auxiliaryHandler (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction): void {
  expectType<unknown>(request.body)
}

expectAssignable(server.withTypeProvider<AuxiliaryHandlerProvider>().get(
  '/',
  {
    onRequest: auxiliaryHandler,
    schema: { body: null }
  },
  (req) => {
    expectType<'handler-auxiliary'>(req.body)
  }
))
