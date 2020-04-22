'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../fastify')

test('#2214 - wrong content-length', t => {
  const fastify = Fastify()

  fastify.get('/', async () => {
    const error = new Error('MY_ERROR_MESSAGE')
    error.headers = {
      'content-length': 2
    }
    throw error
  })

  fastify.inject({
    method: 'GET',
    path: '/'
  })
    .then(response => {
      t.strictEqual(response.headers['content-length'], '' + response.rawPayload.length)
      t.end()
    })
})
