'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const {
  lintEcosystemLines,
  failureTypes
} = require('../../.github/scripts/lint-ecosystem')

function failureTypesOf (result) {
  return result.failures.map((failure) => failure.type)
}

describe('lintEcosystemLines', () => {
  it('keeps alphabetical list items and starts each section over', () => {
    const result = lintEcosystemLines([
      '- [`alpha`](https://example.com/alpha) first',
      '- [`beta`](https://example.com/beta) second',
      '#### [Community](#community)',
      '- [`zeta`](https://example.com/zeta) later section'
    ])

    assert.deepStrictEqual(failureTypesOf(result), [])
    assert.deepStrictEqual(
      result.successes.map((success) => [success.grouping, success.moduleName]),
      [
        ['core', 'alpha'],
        ['core', 'beta'],
        ['community', 'zeta']
      ]
    )
  })

  it('flags a list item that is out of order or missing backticks', () => {
    const result = lintEcosystemLines([
      '- [`beta`](https://example.com/beta) second',
      '- [`alpha`](https://example.com/alpha) first',
      '- [gamma](https://example.com/gamma) plain'
    ])

    assert.deepStrictEqual(failureTypesOf(result), [
      failureTypes.outOfOrderItem,
      failureTypes.improperFormat
    ])
    assert.strictEqual(result.failures[0].moduleName, 'alpha')
    assert.strictEqual(result.failures[1].moduleName, 'unknown')
  })

  it('reads a tags table without treating the header as a plugin', () => {
    const result = lintEcosystemLines([
      '#### [Community Tools](#community-tools)',
      'Plugins in this section stay in alphabetical order.',
      '| Plugin | Description | Tags |',
      '| ------ | ----------- | ---- |',
      '| [`fast-maker`](https://example.com/fast-maker) | generates routes. | codegen, tooling |',
      '| [`fastify-flux`](https://example.com/fastify-flux) | builds APIs. | codegen, schema, tooling |'
    ])

    assert.deepStrictEqual(failureTypesOf(result), [])
    assert.deepStrictEqual(
      result.successes.map((success) => success.moduleName),
      ['fast-maker', 'fastify-flux']
    )
    assert.ok(result.successes.every((success) => success.grouping === 'community-tools'))
  })

  it('flags an out-of-order table row and tags that are not normalized', () => {
    const result = lintEcosystemLines([
      '#### [Community Tools](#community-tools)',
      '| [`beta`](https://example.com/beta) | second. | Tooling |',
      '| [`alpha`](https://example.com/alpha) | first. | tooling, codegen |',
      '| [`gamma`](https://example.com/gamma) | third. | codegen, tooling |'
    ])

    assert.deepStrictEqual(failureTypesOf(result), [
      failureTypes.invalidTags,
      failureTypes.outOfOrderItem,
      failureTypes.invalidTags
    ])
    assert.strictEqual(result.failures[0].moduleName, 'beta')
    assert.strictEqual(result.failures[1].moduleName, 'alpha')
    assert.strictEqual(result.failures[2].moduleName, 'alpha')
  })

  it('flags a table row whose plugin cell has no backticks', () => {
    const result = lintEcosystemLines([
      '| [fast-maker](https://example.com/fast-maker) | generates routes. | tooling |'
    ])

    assert.deepStrictEqual(failureTypesOf(result), [failureTypes.improperFormat])
  })

  it('accepts the checked-in Ecosystem guide', () => {
    const content = fs.readFileSync(
      path.join(__dirname, '../../docs/Guides/Ecosystem.md'),
      'utf8'
    )
    const result = lintEcosystemLines(content.split('\n'))
    const tools = result.successes.filter((success) => success.grouping === 'community-tools')

    assert.deepStrictEqual(failureTypesOf(result), [])
    assert.deepStrictEqual(tools.map((success) => success.moduleName), [
      'fast-maker',
      'fastify-flux',
      'fastify-intlayer',
      'jeasx',
      'simple-tjscli',
      'vite-plugin-fastify',
      'vite-plugin-fastify-routes'
    ])
  })
})
