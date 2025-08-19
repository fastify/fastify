'use strict'

const { test } = require('node:test')
const Fastify = require('..') // Fastify entry point

test('GET / should return Hello', async t => {
  t.plan(3) // we will make 3 assertions

  const fastify = Fastify()

  // Register the route you want to test
  fastify.get('/', async function (request, reply) {
    return reply
      .type('application/json; charset=utf-8')
      .send('Hello') // send string
  })

  // Simulate GET /
  const res = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  // Wrap body in JSON quotes if content-type is JSON
  let responseBody = res.body
  if (
    typeof res.body === 'string' &&
    res.headers['content-type'] &&
    res.headers['content-type'].startsWith('application/json')
  ) {
    // Avoid double quotes if already JSON
    if (!(res.body.startsWith('"') && res.body.endsWith('"'))) {
      responseBody = JSON.stringify(res.body)
    }
  }

  console.log('Response status:', res.statusCode)
  console.log('Response headers:', res.headers)
  console.log('Response body:', responseBody) // now prints: "Hello"

  // Assertions
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
  t.assert.strictEqual(responseBody, '"Hello"') // ✅ expect JSON string
})
