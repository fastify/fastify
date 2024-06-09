'use strict'

const path = require('node:path')
const fs = require('node:fs')
const readline = require('node:readline')

const basePathEcosystemDocFile = path.join('docs', 'Guides', 'Ecosystem.md')
const ecosystemDocFile = path.join(__dirname, '..', '..', basePathEcosystemDocFile)
const failureTypes = {
  improperFormat: 'improperFormat',
  outOfOrderItem: 'outOfOrderItem'
}

module.exports = async function ({ core }) {
  const results = await runCheck()
  await handleResults({ core }, results)
}

async function runCheck () {
  const stream = await fs.createReadStream(ecosystemDocFile)
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  })

  const failures = []
  const successes = []
  const moduleNameRegex = /^- \[`(.+)`\]/
  let lineNumber = 0
  let modules = []
  let grouping = 'core'

  for await (const line of rl) {
    lineNumber += 1
    if (line.startsWith('#### [Community]')) {
      grouping = 'community'
      modules = []
    }

    if (line.startsWith('#### [Community Tools]')) {
      grouping = 'community-tools'
      modules = []
    }

    if (line.startsWith('- [') !== true) {
      continue
    }

    const moduleNameTest = moduleNameRegex.exec(line)

    if (moduleNameTest === null) {
      failures.push({
        lineNumber,
        grouping,
        moduleName: 'unknown',
        type: failureTypes.improperFormat
      })
      continue
    }

    const moduleName = moduleNameTest[1]
    if (modules.length > 0) {
      if (compare(moduleName, modules.at(-1)) > 0) {
        failures.push({
          lineNumber,
          moduleName,
          grouping,
          type: failureTypes.outOfOrderItem
        })
      } else {
        successes.push({ moduleName, lineNumber, grouping })
      }
    } else {
      // We have to push the first item found or we are missing items from the list
      successes.push({ moduleName, lineNumber, grouping })
    }
    modules.push(moduleName)
  }

  return { failures, successes }
}

async function handleResults (scriptLibs, results) {
  const { core } = scriptLibs
  const { failures, successes } = results
  const isError = !!failures.length

  await core.summary
    .addHeading(isError ? `❌ Ecosystem.md Lint (${failures.length} error${failures.length === 1 ? '' : 's'})` : '✅ Ecosystem Lint (no errors found)')
    .addTable([
      [
        { data: 'Status', header: true },
        { data: 'Section', header: true },
        { data: 'Module', header: true },
        { data: 'Details', header: true }],
      ...failures.map((failure) => [
        '❌',
        failure.grouping,
        failure.moduleName,
        `Line Number: ${failure.lineNumber.toString()} - ${failure.type}`
      ]),
      ...successes.map((success) => [
        '✅',
        success.grouping,
        success.moduleName,
        '-'
      ])
    ])
    .write()

  if (isError) {
    failures.forEach((failure) => {
      if (failure.type === failureTypes.improperFormat) {
        core.error('The module name should be enclosed with backticks', {
          title: 'Improper format',
          file: basePathEcosystemDocFile,
          startLine: failure.lineNumber
        })
      } else if (failure.type === failureTypes.outOfOrderItem) {
        core.error(`${failure.moduleName} not listed in alphabetical order`, {
          title: 'Out of Order',
          file: basePathEcosystemDocFile,
          startLine: failure.lineNumber
        })
      } else {
        core.error('Unknown error')
      }
    })

    core.setFailed('Failed when linting Ecosystem.md')
  }
}

function compare (current, previous) {
  return previous.localeCompare(
    current,
    'en',
    { sensitivity: 'base' }
  )
}
