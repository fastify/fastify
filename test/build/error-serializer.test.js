'use strict'

const t = require('tap')
const test = t.test
const fs = require('fs')
const path = require('path')

const { code } = require('../../build/build-error-serializer')

function unifyLineBreak (str) {
  return str.toString().replace(/\r\n/g, '\n')
}

test('check generated code syntax', async (t) => {
  t.plan(1)

  // standard is a esm, we import it like this
  const { default: standard } = await import('standard')
  const result = await standard.lintText(code)

  // if there are any invalid syntax
  // fatal count will be greater than 0
  t.equal(result[0].fatalErrorCount, 0)
})

test('ensure the current error serializer is latest', async (t) => {
  t.plan(1)

  const current = await fs.promises.readFile(path.resolve('lib/error-serializer.js'))

  // line break should not be a problem depends on system
  t.equal(unifyLineBreak(current), unifyLineBreak(code))
})
