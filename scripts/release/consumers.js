'use strict'

// Each scenario is a throwaway downstream project, created outside the
// repository, which installs the packed tarball the way a user would.
/* c8 ignore start */

const fs = require('node:fs')
const path = require('node:path')
const { npm, run } = require('./run')

const root = path.join(__dirname, '..', '..')
const fixtures = path.join(__dirname, 'fixtures')
const readJson = (...parts) => JSON.parse(fs.readFileSync(path.join(...parts), 'utf8'))

// The package managers exercised in .github/workflows/package-manager-ci.yml.
const PNPM = 'pnpm@8'
const YARN = 'yarn@1.22.22'

// Tool versions come from the manifests this repository already maintains.
function devRange (name, ...manifest) {
  const range = readJson(root, ...manifest, 'package.json').devDependencies[name]
  return `${name}@${range}`
}

function createProject (context, name) {
  const dir = path.join(context.workDir, name)
  fs.mkdirSync(dir)
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: `consumer-${name}`, version: '1.0.0', private: true }))
  fs.copyFileSync(context.tarball, path.join(dir, 'fastify.tgz'))
  for (const file of fs.readdirSync(fixtures)) {
    fs.copyFileSync(path.join(fixtures, file), path.join(dir, file))
  }
  return dir
}

function npmInstall (dir, extra = []) {
  return npm(['install', '--ignore-scripts', '--no-audit', '--no-fund', './fastify.tgz', ...extra], { cwd: dir })
}

// Proves that what is about to be exercised is byte for byte the tarball, and
// that it was not resolved from somewhere else on this machine.
async function verifyInstalled (context, dir) {
  const resolved = (await run(process.execPath, ['-p', 'require.resolve("fastify/package.json")'], { cwd: dir })).trim()
  const installed = path.dirname(resolved)
  const relative = path.relative(fs.realpathSync(dir), fs.realpathSync(installed))
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`"fastify" resolved outside the consumer project: ${installed}`)
  }
  for (const [file, content] of context.files) {
    const target = path.join(installed, file)
    if (!fs.existsSync(target) || !fs.readFileSync(target).equals(content)) {
      throw new Error(`installed ${file} is not the one in the tarball (stale package manager cache?)`)
    }
  }
}

async function smoke (context, dir, files = ['smoke.cjs', 'smoke.mjs']) {
  for (const file of files) {
    await run(process.execPath, [file], { cwd: dir, env: { EXPECTED_VERSION: context.version } })
  }
}

async function npmScenario (context) {
  const dir = createProject(context, 'npm')
  await npmInstall(dir, ['--omit=dev'])
  await verifyInstalled(context, dir)
  await smoke(context, dir)
}

// A different node_modules layout (symlinked store) from npm and Yarn. Undeclared
// dependencies are caught by package-contents.js, not reliably by this layout.
async function pnpmScenario (context) {
  const dir = createProject(context, 'pnpm')
  await npm(['exec', '--yes', `--package=${PNPM}`, '--', 'pnpm', 'add', '--ignore-scripts', './fastify.tgz'], { cwd: dir })
  await verifyInstalled(context, dir)
  await smoke(context, dir)
}

async function yarnScenario (context) {
  const dir = createProject(context, 'yarn')
  // Yarn 1 caches local tarballs by name and version, so never share its cache.
  await npm(['exec', '--yes', `--package=${YARN}`, '--', 'yarn', 'add', 'file:./fastify.tgz',
    '--ignore-scripts', '--ignore-engines', '--non-interactive', '--cache-folder', path.join(dir, '.yarn-cache')], { cwd: dir })
  await verifyInstalled(context, dir)
  await smoke(context, dir)
}

// "dependencies" allows two pino majors; the npm scenario gets the newest one.
async function pino9Scenario (context) {
  const dir = createProject(context, 'pino9')
  await npmInstall(dir, ['pino@^9.14.0'])
  await verifyInstalled(context, dir)
  await run(process.execPath, ['-e', `
    const from = require('node:module').createRequire(require.resolve('fastify'))
    const { version } = require(from.resolve('pino/package.json'))
    if (!version.startsWith('9.')) throw new Error('fastify resolved pino ' + version + ', not 9.x')
  `], { cwd: dir })
  await smoke(context, dir)
}

const TYPE_SCENARIOS = [
  { name: 'nodenext', module: 'nodenext', moduleResolution: 'nodenext', files: ['consumer.mts', 'consumer.cts'] },
  { name: 'node16', module: 'node16', moduleResolution: 'node16', files: ['consumer.mts', 'consumer.cts'] },
  { name: 'bundler', module: 'esnext', moduleResolution: 'bundler', files: ['consumer.mts'] },
  { name: 'node10', module: 'commonjs', moduleResolution: 'node10', ignoreDeprecations: '6.0', files: ['legacy.ts'] }
]

async function typescriptScenario (context) {
  const dir = createProject(context, 'typescript')
  const nodeMajor = process.versions.node.split('.')[0]
  await npmInstall(dir, [devRange('typescript'), `@types/node@^${nodeMajor}`])
  await verifyInstalled(context, dir)
  fs.copyFileSync(path.join(dir, 'consumer.cts'), path.join(dir, 'legacy.ts'))

  for (const { name, files, ...options } of TYPE_SCENARIOS) {
    const config = `tsconfig.${name}.json`
    fs.writeFileSync(path.join(dir, config), JSON.stringify({
      compilerOptions: { ...options, target: 'es2022', strict: true, noEmit: true, skipLibCheck: false, types: ['node'] },
      files
    }))
    try {
      await run(process.execPath, [path.join('node_modules', 'typescript', 'bin', 'tsc'), '-p', config], { cwd: dir })
    } catch (error) {
      throw new Error(`moduleResolution "${options.moduleResolution}" failed to type check\n${error.message}`)
    }
  }
}

// A bundle is run from an empty directory so that it cannot lean on node_modules.
async function runBundles (context, dir, bundles) {
  const isolated = path.join(dir, '..', `${path.basename(dir)}-output`)
  fs.mkdirSync(isolated)
  for (const bundle of bundles) {
    fs.copyFileSync(path.join(dir, 'dist', bundle), path.join(isolated, bundle))
  }
  await smoke(context, isolated, bundles)
}

async function esbuildScenario (context) {
  const dir = createProject(context, 'esbuild')
  await npmInstall(dir, [devRange('esbuild', 'test', 'bundler', 'esbuild')])
  await verifyInstalled(context, dir)
  for (const entry of ['cjs', 'mjs']) {
    await run(process.execPath, [path.join('node_modules', 'esbuild', 'bin', 'esbuild'), `smoke.${entry}`,
      '--bundle', '--platform=node', '--format=cjs', `--outfile=dist/${entry}.js`], { cwd: dir })
  }
  await runBundles(context, dir, ['cjs.js', 'mjs.js'])
}

async function webpackScenario (context) {
  const dir = createProject(context, 'webpack')
  await npmInstall(dir, ['webpack', 'webpack-cli'].map((name) => devRange(name, 'test', 'bundler', 'webpack')))
  await verifyInstalled(context, dir)
  fs.writeFileSync(path.join(dir, 'webpack.config.js'), `module.exports = {
    mode: 'development',
    devtool: false,
    target: 'node',
    entry: { cjs: './smoke.cjs', mjs: './smoke.mjs' },
    output: { path: require('node:path').resolve(__dirname, 'dist'), filename: '[name].js' }
  }\n`)
  await run(process.execPath, [path.join('node_modules', 'webpack-cli', 'bin', 'cli.js')], { cwd: dir })
  await runBundles(context, dir, ['cjs.js', 'mjs.js'])
}

module.exports = {
  npm: npmScenario,
  pnpm: pnpmScenario,
  yarn: yarnScenario,
  pino9: pino9Scenario,
  typescript: typescriptScenario,
  esbuild: esbuildScenario,
  webpack: webpackScenario
}
/* c8 ignore stop */
