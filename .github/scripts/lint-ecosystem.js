'use strict'

const path = require('node:path')
const fs = require('node:fs')
const readline = require('node:readline')

const basePathEcosystemDocFile = path.join('docs', 'Guides', 'Ecosystem.md')
const ecosystemDocFile = path.join(__dirname, '..', '..', basePathEcosystemDocFile)
const failureTypes = {
  improperFormat: 'improperFormat',
  outOfOrderItem: 'outOfOrderItem',
  invalidTags: 'invalidTags'
}
const listItemRegex = /^- \[`(.+)`\]/
const tablePluginCellRegex = /^\[`([^`]+)`\]\(.+\)$/
const tagListRegex = /^[a-z0-9-]+(?:, [a-z0-9-]+)*$/

async function lintEcosystem ({ core }) {
  const results = await runCheck()
  await handleResults({ core }, results)
}

async function runCheck () {
  const stream = await fs.createReadStream(ecosystemDocFile)
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  })

  const lines = []
  for await (const line of rl) {
    lines.push(line)
  }

  return lintEcosystemLines(lines)
}

function lintEcosystemLines (lines) {
  const failures = []
  const successes = []
  let modules = []
  let grouping = 'core'

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].replace(/\r$/, '')
    const lineNumber = index + 1

    // Community Tools starts with the Community prefix, so the second
    // assignment is what selects that section.
    if (line.startsWith('#### [Community]')) {
      grouping = 'community'
      modules = []
    }

    if (line.startsWith('#### [Community Tools]')) {
      grouping = 'community-tools'
      modules = []
    }

    const entry = parseEntry(line)
    if (entry === null) {
      continue
    }

    if (entry.moduleName === null) {
      failures.push({
        lineNumber,
        grouping,
        moduleName: 'unknown',
        type: failureTypes.improperFormat
      })
      continue
    }

    if (modules.length > 0 && compare(entry.moduleName, modules.at(-1)) > 0) {
      failures.push({
        lineNumber,
        moduleName: entry.moduleName,
        grouping,
        type: failureTypes.outOfOrderItem
      })
    } else if (entry.tagError !== true) {
      successes.push({ moduleName: entry.moduleName, lineNumber, grouping })
    }

    if (entry.tagError === true) {
      failures.push({
        lineNumber,
        moduleName: entry.moduleName,
        grouping,
        type: failureTypes.invalidTags
      })
    }

    modules.push(entry.moduleName)
  }

  return { failures, successes }
}

function parseEntry (line) {
  if (line.startsWith('- [')) {
    const moduleNameTest = listItemRegex.exec(line)
    if (moduleNameTest === null) {
      return { moduleName: null }
    }

    return { moduleName: moduleNameTest[1], tagError: false }
  }

  if (line.startsWith('| [')) {
    return parseTableEntry(line)
  }

  return null
}

function parseTableEntry (line) {
  const cells = splitTableRow(line)
  if (cells.length !== 3) {
    return { moduleName: null }
  }

  const pluginMatch = tablePluginCellRegex.exec(cells[0])
  if (pluginMatch === null) {
    return { moduleName: null }
  }

  return {
    moduleName: pluginMatch[1],
    tagError: isValidTagList(cells[2]) !== true
  }
}

function splitTableRow (line) {
  const trimmed = line.trim()
  if (trimmed.startsWith('|') !== true || trimmed.endsWith('|') !== true) {
    return []
  }

  return trimmed.slice(1, -1).split('|').map((cell) => cell.trim())
}

function isValidTagList (tags) {
  if (tagListRegex.test(tags) !== true) {
    return false
  }

  const parts = tags.split(', ')
  const sorted = [...parts].sort((left, right) => {
    return left.localeCompare(right, 'en', { sensitivity: 'base' })
  })

  return parts.every((part, index) => part === sorted[index])
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
      } else if (failure.type === failureTypes.invalidTags) {
        core.error('Tags must be lowercase, comma-separated, and in alphabetical order', {
          title: 'Invalid tags',
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

module.exports = lintEcosystem
module.exports.lintEcosystemLines = lintEcosystemLines
module.exports.failureTypes = failureTypes
