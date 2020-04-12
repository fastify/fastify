'use strict'

const benchmark = require('benchmark')
const suite = new benchmark.Suite()

const S = require('fluent-schema')
const Fastify = require('../fastify')

let lastSchema = null
const typeGen = getSchemaType()
const handler = async () => 'hello'

const suiteBuilder = [
  { routes: 1 },
  { routes: 100 },
  { routes: 1000 }
]

suiteBuilder.forEach(({ routes }) => {
  const f = Fastify()

  for (let i = 0; i < routes; i++) {
    f.post(`/${i}`, { schema: genSchema(), handler })
  }

  suite.add(`instance with ${routes} routes`, function (deferred) {
    f.ready(() => {
      deferred.resolve()
    })
  }, { defer: true })
})

suite.on('cycle', cycle)

suite.run()

function cycle (e) {
  console.log(e.target.toString())
}

function genSchema (fields = ['body', 'response'], prop = 6, keepOld = false) {
  if (keepOld && lastSchema) {
    return lastSchema
  }

  const schema = S.object()
  while (prop-- > 0) {
    schema.prop(`random-${prop}-${Math.round(Math.random() * 1000)}`, typeGen.next().value)
  }

  const built = schema.valueOf()
  const schemaConfig = fields.reduce((schema, field) => {
    if (field === 'response') {
      schema[field] = { 200: built }
    } else {
      schema[field] = built
    }
    return schema
  }, {})

  lastSchema = schemaConfig
  return lastSchema
}

function * getSchemaType () {
  while (true) {
    yield S.string()
    yield S.integer()
    yield S.object()
      .prop('created', S.string().format('date-time'))
      .prop('updated', S.string().format('date-time'))
    yield S.array().items(S.object().prop('id', S.string()))
  }
}
