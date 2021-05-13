'use strict'

const { test } = require('tap')
const Fastify = require('..')
const semver = require('semver')

process.removeAllListeners('warning')

if (semver.gte(process.versions.node, '13.0.0')) {
  test('Should emit a warning when accessing request.connection instead of request.socket on Node process greater than 13.0.0', t => {
    t.plan(4)

    process.on('warning', onWarning)
    function onWarning (warning) {
      t.equal(warning.name, 'FastifyDeprecation')
      t.equal(warning.code, 'FSTDEP005')
      t.equal(warning.message, 'You are accessing the deprecated "request.connection" property. Use "request.socket" instead.')

      // removed listener before light-my-request emit second warning
      process.removeListener('warning', onWarning)
    }

    const fastify = Fastify()

    fastify.get('/', (request, reply) => {
      reply.send(request.connection)
    })

    fastify.inject({
      method: 'GET',
      path: '/'
    }, (err, res) => {
      t.error(err)
      process.removeListener('warning', onWarning)
    })
  })
}
