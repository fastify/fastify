'use strict'

/* c8 ignore start */

// Not bundled: these checks inspect the installed package on disk.

const assert = require('node:assert')
const path = require('node:path')

// Every published module must load with only the declared dependencies,
// including those that the requests in exercise.cjs happen not to reach.
const root = path.dirname(require.resolve('fastify/package.json'))
assert.ok(root.startsWith(__dirname + path.sep), `fastify was loaded from ${root}`)
for (const file of JSON.parse(process.env.FASTIFY_EXPECTED_FILES)) {
  if (file.endsWith('.js')) require(path.join(root, file))
}
assert.strictEqual(require('fastify/package.json').version, process.env.FASTIFY_EXPECTED_VERSION)

// Deep imports that plugins rely on.
assert.strictEqual(typeof require('fastify/lib/symbols').kReply, 'symbol')
assert.strictEqual(typeof require('fastify/lib/errors.js').FST_ERR_NOT_FOUND, 'function')
