'use strict'

const { test } = require('tap')
const fastify = require('..')

test('same shape on requet', async (t) => {
  t.plan(1)

  const app = fastify()

  let request;

  app.decorateRequest('user')

  app.addHook('preHandler', (req, reply, done) => {
    if (request) {
      req.user = 'User';
    }
    done();
  });

  app.get('/', (req, reply) => {
    if (request) {
      t.equal(%HaveSameMap(request, req), true)
    }

    request = req;

    return 'hello world'
  });

  await app.inject('/')
  await app.inject('/')
})
