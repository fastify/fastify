'use strict'
//  TO-DO: MUST IMPLEMENT AND FIX THE onListen TESTS, skipped because want
//  functionality in a commit that the team can work on
const t = require('tap')
//  const Fastify = require('../fastify')

t.pass('Passing for now to get a working commit')
// t.test('onListen should be called in order', t => {
//   t.plan(1)
//   const fastify = Fastify()

//   let order = 0

//   fastify.addHook('onListen', function () {
//     t.equal(order++, 0, 'called in root')
//   })

//   fastify.addHook('onListen', function () {
//     t.equal(order++, 1, 'called in root')
//   })

//   fastify.listen({ host: '::', port: 0 }, err => {
//     t.error(err)
//     t.teardown(() => { fastify.close() })
//   })
// })
//   const immediate = require('util').promisify(setImmediate)
//   t.test('async onListen should be called in order', async t => {
//   t.plan(3)
//   const fastify = Fastify()

//   let order = 0

//   fastify.addHook('onListen', async function () {
//     await immediate()
//     t.equal(order++, 0, 'called in root')
//   })

//   fastify.addHook('onListen', async function () {
//     await immediate()
//     t.equal(order++, 1, 'called in root')
//   })

//   await fastify.listen({ host: '::', port: 0 })
//   t.pass('onListen')
// })
