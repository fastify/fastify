'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('decode uri must be applied right before routing test1', t => {
  t.plan(6)

  const fastify = Fastify()
  const serve = 'serve 1st file with space'
  const url = '/[...]/a .md'

  fastify.get(url, () => serve)

  fastify.inject({
    method: 'GET',
    url: '/[...]/a%20.md'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.body, serve)
  })

  fastify.inject({
    method: 'GET',
    url: encodeURI(url)
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.body, serve)
  })
})

test('decode uri must be applied right before routing test2', t => {
  t.plan(6)

  const fastify = Fastify()
  const serve = 'serve 2nd file with %'
  const url = '/[...]/a%20.md'
  fastify.get(url, () => serve)

  fastify.inject({
    method: 'GET',
    url: '/[...]/a%2520.md'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.body, serve)
  })

  fastify.inject({
    method: 'GET',
    url: encodeURI(url)
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.body, serve)
  })
})
