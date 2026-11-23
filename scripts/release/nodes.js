'use strict'

/* c8 ignore start */

const fs = require('node:fs')
const path = require('node:path')
const { ReleaseError, npm, run } = require('./util')

async function nodeVersion (binary) {
  const output = await run(binary, ['--version'])
  const match = /^v((\d+)\.\d+\.\d+\S*)/.exec(output.trim())
  if (!match) throw new ReleaseError(`${binary} --version printed unexpected output: ${output}`)
  return { binary, version: match[1], major: Number(match[2]) }
}

function nodePackage (major) {
  const platform = process.platform === 'win32' ? 'win' : process.platform
  // The Apple silicon builds are published under a different prefix.
  const prefix = platform === 'darwin' && process.arch === 'arm64' ? 'node-bin' : 'node'
  return `${prefix}-${platform}-${process.arch}@${major}`
}

// Finds a binary per major: --node-path first, then the running Node.js, and
// otherwise the official build as repackaged on the npm registry.
async function resolveNodes (majors, { nodePaths = [], toolsDir }) {
  const available = new Map()
  for (const binary of nodePaths) {
    const node = await nodeVersion(path.resolve(binary))
    available.set(node.major, node)
  }
  const current = await nodeVersion(process.execPath)
  if (!available.has(current.major)) available.set(current.major, current)

  const nodes = []
  for (const major of majors) {
    if (!available.has(major)) {
      const spec = nodePackage(major)
      const dir = path.join(toolsDir, `node-${major}`)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'package.json'), '{"private":true}\n')
      process.stdout.write(`fetching Node.js ${major} (${spec})\n`)
      try {
        await npm(['install', spec, '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: dir })
      } catch (error) {
        throw new ReleaseError(`could not obtain Node.js ${major}; install it and pass ` +
          `--node-path <binary>\n${error.message}`)
      }
      const binary = path.join(dir, 'node_modules', spec.slice(0, spec.lastIndexOf('@')), 'bin',
        process.platform === 'win32' ? 'node.exe' : 'node')
      const node = await nodeVersion(binary)
      if (node.major !== major) {
        throw new ReleaseError(`${spec} provided Node.js ${node.version}`)
      }
      available.set(major, node)
    }
    nodes.push(available.get(major))
  }
  return nodes
}

module.exports = { nodeVersion, resolveNodes }
