'use strict'

const path = require('path')
const fs = require('fs')
const readline = require('readline')

const ecosystemDocFile = path.join(__dirname, '..', '..', 'docs', 'Guides', 'Ecosystem.md')

module.exports = async function ({ core }) {
  const stream = await fs.createReadStream(ecosystemDocFile)
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  const moduleNameRegex = /^\- \[\`(.+)\`\]/
  let hasOutOfOrderItem = false
  let lineNumber = 0
  let inCommmunitySection = false
  let modules = []

  for await (const line of rl) {
    lineNumber += 1
    if (line.startsWith('#### [Community]')) {
      inCommmunitySection = true
    }
    if (line.startsWith('#### [Community Tools]')) {
      inCommmunitySection = false
    }
    if (inCommmunitySection === false) {
      continue
    }

    if (line.startsWith('- [`') !== true) {
      continue
    }

    const moduleName = moduleNameRegex.exec(line)[1]
    if (modules.length > 0) {
      if (compare(moduleName, modules.at(-1)) > 0) {
        core.error(`line ${lineNumber}: ${moduleName} not listed in alphabetical order`)
        hasOutOfOrderItem = true
      }
    }
    modules.push(moduleName)
  }

  if (hasOutOfOrderItem === true) {
    core.setFailed('Some ecosystem modules are not in alphabetical order.')
  }
}

function compare(current, previous) {
  return previous.localeCompare(
    current,
    'en',
    {sensitivity: 'base'}
  )
}
