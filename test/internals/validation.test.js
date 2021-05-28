'use strict'

const t = require('tap')
const test = t.test

const Ajv = require('ajv')
const ajv = new Ajv({ coerceTypes: true })

const validation = require('../../lib/validation')
const { normalizeSchema } = require('../../lib/schemas')
const symbols = require('../../lib/validation').symbols
const { kSchemaVisited } = require('../../lib/symbols')

test('Symbols', t => {
  t.plan(5)
  t.equal(typeof symbols.responseSchema, 'symbol')
  t.equal(typeof symbols.bodySchema, 'symbol')
  t.equal(typeof symbols.querystringSchema, 'symbol')
  t.equal(typeof symbols.paramsSchema, 'symbol')
  t.equal(typeof symbols.headersSchema, 'symbol')
})

;['compileSchemasForValidation',
  'compileSchemasForSerialization'].forEach(func => {
  test(`${func} schema - missing schema`, t => {
    t.plan(2)
    const context = {}
    validation[func](context)
    t.equal(typeof context[symbols.bodySchema], 'undefined')
    t.equal(typeof context[symbols.responseSchema], 'undefined')
  })

  test(`${func} schema - missing output schema`, t => {
    t.plan(1)
    const context = { schema: {} }
    validation[func](context, null)
    t.equal(typeof context[symbols.responseSchema], 'undefined')
  })
})

test('build schema - output schema', t => {
  t.plan(2)
  const opts = {
    schema: {
      response: {
        '2xx': {
          type: 'object',
          properties: {
            hello: { type: 'string' }
          }
        },
        201: {
          type: 'object',
          properties: {
            hello: { type: 'number' }
          }
        }
      }
    }
  }
  validation.compileSchemasForSerialization(opts, ({ schema, method, url, httpPart }) => ajv.compile(schema))
  t.equal(typeof opts[symbols.responseSchema]['2xx'], 'function')
  t.equal(typeof opts[symbols.responseSchema]['201'], 'function')
})

test('build schema - payload schema', t => {
  t.plan(1)
  const opts = {
    schema: {
      body: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  }
  validation.compileSchemasForValidation(opts, ({ schema, method, url, httpPart }) => ajv.compile(schema))
  t.equal(typeof opts[symbols.bodySchema], 'function')
})

test('build schema - avoid repeated normalize schema', t => {
  t.plan(3)
  const serverConfig = {
    jsonShorthand: true
  }
  const opts = {
    schema: {
      query: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  }
  opts.schema = normalizeSchema(opts.schema, serverConfig)
  t.not(kSchemaVisited, undefined)
  t.equal(opts.schema[kSchemaVisited], true)
  t.equal(opts.schema, normalizeSchema(opts.schema, serverConfig))
})

test('build schema - query schema', t => {
  t.plan(2)
  const serverConfig = {
    jsonShorthand: true
  }
  const opts = {
    schema: {
      query: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  }
  opts.schema = normalizeSchema(opts.schema, serverConfig)
  validation.compileSchemasForValidation(opts, ({ schema, method, url, httpPart }) => ajv.compile(schema))
  t.type(opts[symbols.querystringSchema].schema.type, 'string')
  t.equal(typeof opts[symbols.querystringSchema], 'function')
})

test('build schema - query schema abbreviated', t => {
  t.plan(2)
  const serverConfig = {
    jsonShorthand: true
  }
  const opts = {
    schema: {
      query: {
        hello: { type: 'string' }
      }
    }
  }
  opts.schema = normalizeSchema(opts.schema, serverConfig)
  validation.compileSchemasForValidation(opts, ({ schema, method, url, httpPart }) => ajv.compile(schema))
  t.type(opts[symbols.querystringSchema].schema.type, 'string')
  t.equal(typeof opts[symbols.querystringSchema], 'function')
})

test('build schema - querystring schema', t => {
  t.plan(2)
  const opts = {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  }
  validation.compileSchemasForValidation(opts, ({ schema, method, url, httpPart }) => ajv.compile(schema))
  t.type(opts[symbols.querystringSchema].schema.type, 'string')
  t.equal(typeof opts[symbols.querystringSchema], 'function')
})

test('build schema - querystring schema abbreviated', t => {
  t.plan(2)
  const serverConfig = {
    jsonShorthand: true
  }
  const opts = {
    schema: {
      querystring: {
        hello: { type: 'string' }
      }
    }
  }
  opts.schema = normalizeSchema(opts.schema, serverConfig)
  validation.compileSchemasForValidation(opts, ({ schema, method, url, httpPart }) => ajv.compile(schema))
  t.type(opts[symbols.querystringSchema].schema.type, 'string')
  t.equal(typeof opts[symbols.querystringSchema], 'function')
})

test('build schema - must throw if querystring and query schema exist', t => {
  t.plan(2)
  try {
    const serverConfig = {
      jsonShorthand: true
    }
    const opts = {
      schema: {
        query: {
          type: 'object',
          properties: {
            hello: { type: 'string' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            hello: { type: 'string' }
          }
        }
      }
    }
    opts.schema = normalizeSchema(opts.schema, serverConfig)
  } catch (err) {
    t.equal(err.code, 'FST_ERR_SCH_DUPLICATE')
    t.equal(err.message, 'Schema with \'querystring\' already present!')
  }
})

test('build schema - params schema', t => {
  t.plan(1)
  const opts = {
    schema: {
      params: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  }
  validation.compileSchemasForValidation(opts, ({ schema, method, url, httpPart }) => ajv.compile(schema))
  t.equal(typeof opts[symbols.paramsSchema], 'function')
})

test('build schema - headers schema', t => {
  t.plan(1)
  const opts = {
    schema: {
      headers: {
        type: 'object',
        properties: {
          'content-type': { type: 'string' }
        }
      }
    }
  }
  validation.compileSchemasForValidation(opts, ({ schema, method, url, httpPart }) => ajv.compile(schema))
  t.equal(typeof opts[symbols.headersSchema], 'function')
})

test('build schema - headers are lowercase', t => {
  t.plan(1)
  const opts = {
    schema: {
      headers: {
        type: 'object',
        properties: {
          'Content-Type': { type: 'string' }
        }
      }
    }
  }
  validation.compileSchemasForValidation(opts, ({ schema, method, url, httpPart }) => {
    t.ok(schema.properties['content-type'], 'lowercase content-type exists')
    return () => {}
  })
})

test('build schema - headers are not lowercased in case of custom object', t => {
  t.plan(1)

  class Headers {}
  const opts = {
    schema: {
      headers: new Headers()
    }
  }
  validation.compileSchemasForValidation(opts, ({ schema, method, url, httpPart }) => {
    t.type(schema, Headers)
    return () => {}
  })
})

test('build schema - uppercased headers are not included', t => {
  t.plan(1)
  const opts = {
    schema: {
      headers: {
        type: 'object',
        properties: {
          'Content-Type': { type: 'string' }
        }
      }
    }
  }
  validation.compileSchemasForValidation(opts, ({ schema, method, url, httpPart }) => {
    t.notOk('Content-Type' in schema.properties, 'uppercase does not exist')
    return () => {}
  })
})
