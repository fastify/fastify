/* c8 ignore start */
import assert from 'node:assert'
// Separate statements on purpose: each is a form consumers write.
/* eslint-disable import-x/no-duplicates */
import defaultExport from 'fastify'
import { fastify, errorCodes, LogController } from 'fastify'
import * as namespace from 'fastify'
import exercise from './exercise.cjs'

assert.strictEqual(defaultExport, fastify)
assert.strictEqual(namespace.default, fastify)
assert.strictEqual(namespace.errorCodes, errorCodes)

// No top-level await: bundlers must be able to emit this as CommonJS.
async function main () {
  const dynamic = await import('fastify')
  assert.strictEqual(dynamic.default, fastify)
  await exercise({ fastify: defaultExport, errorCodes, LogController })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
