function colorize (type, text) {
  if (type === 'pass') {
    const blackText = `\x1b[30m${text}`
    const boldblackText = `\x1b[1m${blackText}`
    // Green background with black text
    return `\x1b[42m${boldblackText}\x1b[0m`
  }

  if (type === 'fail') {
    const whiteText = `\x1b[37m${text}`
    const boldWhiteText = `\x1b[1m${whiteText}`
    // Red background with white text
    return `\x1b[41m${boldWhiteText}\x1b[0m`
  }

  return text
}

function formatDiagnosticStr (str) {
  return str.replace(/^(\w+)(\s*\d*)/i, (_, firstWord, rest) => {
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase() + ':' + rest
  })
}

async function * reporter (source) {
  const failed = new Set()
  const diagnostics = new Set()

  for await (const event of source) {
    switch (event.type) {
      case 'test:pass': {
        yield `${colorize('pass', 'PASSED')}: ${event.data.file || event.data.name}\n`
        break
      }

      case 'test:fail': {
        failed.add(event.data.name || event.data.file)
        yield `${colorize('fail', 'FAILED')}: ${event.data.file || event.data.name}\n`
        break
      }

      case 'test:diagnostic': {
        diagnostics.add(`${formatDiagnosticStr(event.data.message)}\n`)
        break
      }

      default: {
        yield ''
      }
    }
  }

  if (failed.size > 0) {
    yield `\n\n${colorize('fail', 'Failed tests:')}\n`
    for (const file of failed) {
      yield `${file}\n`
    }
  }

  yield '\n'

  for (const diagnostic of diagnostics) {
    yield `${diagnostic}`
  }
  yield '\n'
}

export default reporter
