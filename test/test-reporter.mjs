function colorize (type, text) {
  if (type === 'pass') {
    const whiteText = `\x1b[30m${text}`
    // Green background with black text
    return `\x1b[42m${whiteText}\x1b[0m`
  }

  if (type === 'fail') {
    const blackText = `\x1b[37m${text}`
    // Red background with white text
    return `\x1b[41m${blackText}\x1b[0m`
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
  diagnostics.add('\n\n')

  for await (const event of source) {
    switch (event.type) {
      case 'test:pass': {
        yield `${colorize('pass', 'PASSED')}: ${event.data.file}\n`
        break
      }

      case 'test:fail': {
        failed.add(event.data.file)
        yield `${colorize('fail', 'FAILED')}: ${event.data.file}\n`
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

  diagnostics.add('\n')

  for (const diagnostic of diagnostics) {
    yield `${diagnostic}`
  }
}

export default reporter
