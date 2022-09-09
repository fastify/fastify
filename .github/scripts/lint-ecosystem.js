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
  let modules = []
  let hasImproperFormat = false

  for await (const line of rl) {
    lineNumber += 1
    if (line.startsWith('#### [Community]')) {
      modules = []
    }

    if (line.startsWith('#### [Community Tools]')) {
      modules = []
    }

    if (line.startsWith('- [') !== true) {
      continue
    }

    const moduleNameTest = moduleNameRegex.exec(line)
    
    if (moduleNameTest === null)
    {
      core.error(`line ${lineNumber}: improper pattern, module name should be enclosed with backticks`)
      hasImproperFormat = true
      continue
    }

    const moduleName = moduleNameTest[1]
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

  if (hasImproperFormat === true) {
    core.setFailed('Some ecosystem modules are improperly formatted.')
  }
}

function compare(current, previous) {
  return previous.localeCompare(
    current,
    'en',
    {sensitivity: 'base'}
  )
}
