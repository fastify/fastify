'use strict'

const assert = require('node:assert')
const { Bench } = require('tinybench')

const typeNameReg = /^[\w!#$%&'*+.^`|~-]+$/
const subtypeNameReg = /^[\w!#$%&'*+.^`|~-]+\s*$/
const oldKeyValuePairsReg = /([\w!#$%&'*+.^`|~-]+)=([^;]*)/gm
const newKeyValuePairsReg = /(^|;)\s*([\w!#$%&'*+.^`|~-]+)=([^;]*)/gm

const basicMediaType = 'application/json'
const paramsMediaType = 'application/json; charset=utf-8; foo="bar"'

function parseOld (input, kvReg, keyIdx, valIdx) {
  let sepIdx = input.indexOf(';')
  if (sepIdx === -1) {
    sepIdx = input.indexOf('/')
    if (sepIdx === -1) return {}
    const type = input.slice(0, sepIdx).trimStart().toLowerCase()
    const subtype = input.slice(sepIdx + 1).trimEnd().toLowerCase()
    if (typeNameReg.test(type) === true && subtypeNameReg.test(subtype) === true) {
      return { type, subtype, parameters: new Map() }
    }
    return {}
  }

  const mediaType = input.slice(0, sepIdx).toLowerCase()
  const paramsList = input.slice(sepIdx + 1).trim()

  sepIdx = mediaType.indexOf('/')
  if (sepIdx === -1) return {}
  const type = mediaType.slice(0, sepIdx).trimStart()
  const subtype = mediaType.slice(sepIdx + 1).trimEnd()

  if (typeNameReg.test(type) === false || subtypeNameReg.test(subtype) === false) {
    return {}
  }

  const parameters = new Map()
  let matches = kvReg.exec(paramsList)
  while (matches) {
    const key = matches[keyIdx]
    const value = matches[valIdx]
    if (value[0] === '"') {
      if (value.at(-1) !== '"') {
        parameters.set(key, 'invalid quoted string')
        matches = kvReg.exec(paramsList)
        continue
      }
      parameters.set(key, value.slice(1, value.length - 1))
    } else {
      parameters.set(key, value)
    }
    matches = kvReg.exec(paramsList)
  }
  return { type, subtype, parameters }
}

const bench = new Bench({ warmupIterations: 1000 })

bench
  .add('old regex (basic)', () => {
    const r = parseOld(basicMediaType, oldKeyValuePairsReg, 1, 2)
    assert.equal(r.type, 'application')
    assert.equal(r.subtype, 'json')
  })
  .add('new regex (basic)', () => {
    const r = parseOld(basicMediaType, newKeyValuePairsReg, 2, 3)
    assert.equal(r.type, 'application')
    assert.equal(r.subtype, 'json')
  })
  .add('old regex (params)', () => {
    const r = parseOld(paramsMediaType, oldKeyValuePairsReg, 1, 2)
    assert.equal(r.parameters.size, 2)
  })
  .add('new regex (params)', () => {
    const r = parseOld(paramsMediaType, newKeyValuePairsReg, 2, 3)
    assert.equal(r.parameters.size, 2)
  })

bench.run().then(() => {
  console.table(bench.table())
})
