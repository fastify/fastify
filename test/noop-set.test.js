'use strict'

const tap = require('tap')
const noopSet = require('../lib/noop-set')

tap.test('does a lot of nothing', async t => {
  const aSet = noopSet()
  t.type(aSet, 'object')

  const item = {}
  aSet.add(item)
  aSet.add({ another: 'item' })
  aSet.delete(item)
  t.equal(aSet.has(item), true)

  for (const i of aSet) {
    t.fail('should not have any items', i)
  }
})
