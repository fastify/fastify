'use strict'

/* c8 ignore start */

// Usage: node bundle.js <esbuild|webpack> <toolsDir> <consumerDir> <outDir>
// Bundles the consumer's CommonJS and ESM entry points.

const path = require('node:path')
const { createRequire } = require('node:module')

const [bundler, toolsDir, project, outDir] = process.argv.slice(2)
const load = createRequire(path.join(toolsDir, 'package.json'))
const entries = ['consumer.cjs', 'consumer.mjs']

async function main () {
  if (bundler === 'esbuild') {
    await load('esbuild').build({
      absWorkingDir: project,
      entryPoints: entries.map(entry => ({ in: entry, out: `${entry}` })),
      outdir: outDir,
      bundle: true,
      platform: 'node',
      format: 'cjs',
      logLevel: 'warning'
    })
    return
  }
  const compiler = load('webpack')({
    context: project,
    mode: 'production',
    target: 'node',
    devtool: false,
    entry: Object.fromEntries(entries.map(entry => [entry, `./${entry}`])),
    output: { path: outDir, filename: '[name].js' },
    optimization: { minimize: false }
  })
  const stats = await new Promise((resolve, reject) => {
    compiler.run((error, result) => error ? reject(error) : compiler.close(() => resolve(result)))
  })
  if (stats.hasErrors()) throw new Error(stats.toString('errors-only'))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
