'use strict'

const { test } = require('node:test')

const { Warnings } = require('../../lib/warnings')

test('Warnings emits process warnings when enabled', t => {
  t.plan(2)

  const originalEmitWarning = process.emitWarning
  t.after(() => {
    process.emitWarning = originalEmitWarning
  })

  process.emitWarning = (message, name, code) => {
    t.assert.strictEqual(code, 'FSTWRN001')
  }

  const warnings = new Warnings({ withProcess: true })
  t.assert.strictEqual(warnings.emit('FSTWRN001', 'headers', 'GET', '/'), true)
})

test('Warnings disable process emission by default', t => {
  t.plan(2)

  const originalEmitWarning = process.emitWarning
  t.after(() => {
    process.emitWarning = originalEmitWarning
  })

  process.emitWarning = () => {
    t.assert.fail('process.emitWarning should not be called')
  }

  const warnings = new Warnings()
  warnings.on('FSTWRN003', (warning) => {
    t.assert.strictEqual(warning.code, 'FSTWRN003')
  })

  t.assert.strictEqual(warnings.emit('FSTWRN003', 'listen method'), true)
})

test('Warnings can remove warning definitions', t => {
  t.plan(3)

  const warnings = new Warnings()
  warnings.on('FSTSEC001', (warning) => {
    t.assert.fail('FSTSEC001 should not be emitted after removal')
  })
  t.assert.ok(warnings.has('FSTSEC001'))
  t.assert.strictEqual(warnings.remove('FSTSEC001').emit('FSTSEC001', 'text\\/plain'), false)
  t.assert.ok(!warnings.has('FSTSEC001'))
})

test('Warnings can add warning definitions', t => {
  t.plan(5)

  const warnings = new Warnings()
  warnings.add('FastifyWarning', 'FSTCUS001', 'Custom warning for %s')
  warnings.on('FSTCUS001', (warning) => {
    t.assert.strictEqual(warning.name, 'FastifyWarning')
    t.assert.strictEqual(warning.code, 'FSTCUS001')
    t.assert.strictEqual(warning.message, 'Custom warning for test')
  })

  t.assert.ok(warnings.has('FSTCUS001'))
  t.assert.strictEqual(warnings.emit('FSTCUS001', 'test'), true)
})

test('Warnings only emits non-unlimited warnings once', t => {
  t.plan(3)

  const warnings = new Warnings()
  warnings.add('FastifyWarning', 'FSTCUS002', 'One shot warning')

  let emitted = 0
  warnings.on('FSTCUS002', () => {
    emitted++
  })

  t.assert.strictEqual(warnings.emit('FSTCUS002'), true)
  t.assert.strictEqual(warnings.emit('FSTCUS002'), false)
  t.assert.strictEqual(emitted, 1)
})

test('Warnings can register multiple listeners for the same warning', t => {
  t.plan(3)

  const warnings = new Warnings()

  warnings.on('FSTSEC001', (warning) => {
    t.assert.strictEqual(warning.code, 'FSTSEC001')
  })

  warnings.on('FSTSEC001', (warning) => {
    t.assert.strictEqual(warning.name, 'FastifySecurity')
  })

  t.assert.strictEqual(warnings.emit('FSTSEC001', 'text\\/plain'), true)
})
