const { test } = require('node:test')
const assert = require('node:assert')
const fastify = require('../fastify')({ logger: false })

test('clear routes', () => {
  fastify.get('/', x => x)
  assert.equal(fastify.printRoutes(), '└── / (GET, HEAD)\n')
  fastify.clearRoutes()
  assert.equal(fastify.printRoutes(), '(empty tree)')
})
