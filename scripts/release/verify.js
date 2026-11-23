'use strict'

/* c8 ignore start */

// Consumes a packed artifact the way downstream projects do: installed into
// fresh projects outside the repository, by each package manager, then
// required, imported, type checked and bundled.

const fs = require('node:fs')
const path = require('node:path')
const policy = require('./policy')
const { readTarball } = require('./inspect')
const {
  ReleaseError, ROOT, cleanEnv, listFiles, makeTempDir, npm, readJson, run, withNodeOnPath
} = require('./util')

const FIXTURES = path.join(__dirname, 'fixtures')
const INSTALL_FLAGS = ['--ignore-scripts', '--no-audit', '--no-fund']

function toolRanges (nodeMajor) {
  const dev = readJson(path.join(ROOT, 'package.json')).devDependencies
  const bundler = name => readJson(path.join(ROOT, 'test', 'bundler', name, 'package.json')).devDependencies
  return {
    typescript: dev.typescript,
    typesNode: `^${nodeMajor}`,
    fastifyPlugin: dev['fastify-plugin'],
    esbuild: bundler('esbuild').esbuild,
    webpack: bundler('webpack').webpack
  }
}

function typeScriptFixtureApplies (file, mode) {
  // node10 predates the .mts/.cts module formats.
  if (mode === 'node10') return file.endsWith('.ts')
  // Bundlers consume ES modules; `import x = require()` is not valid there.
  if (mode === 'bundler') return !file.endsWith('.cts')
  return true
}

function writeProject (dir, manifest) {
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'package.json'),
    `${JSON.stringify({ name: 'fastify-consumer', version: '0.0.0', private: true, ...manifest }, null, 2)}\n`)
}

// Package managers and bundlers live apart from the consumer projects, so their
// own dependencies can never satisfy a dependency Fastify forgot to declare.
async function installTools (dir) {
  const ranges = toolRanges(0)
  const split = spec => [spec.slice(0, spec.lastIndexOf('@')), spec.slice(spec.lastIndexOf('@') + 1)]
  writeProject(dir, {
    dependencies: {
      esbuild: ranges.esbuild,
      webpack: ranges.webpack,
      ...Object.fromEntries(Object.values(policy.PACKAGE_MANAGERS).map(split))
    }
  })
  await npm(['install', ...INSTALL_FLAGS], { cwd: dir })
}

// The installed files must be byte-for-byte those of the artifact.
function assertInstalledArtifact (project, files) {
  const installed = fs.realpathSync(path.join(project, 'node_modules', 'fastify'))
  if (!installed.startsWith(project + path.sep)) {
    throw new ReleaseError(`fastify resolved outside the consumer project: ${installed}`)
  }
  const found = listFiles(installed)
  const expected = [...files.keys()].sort()
  if (found.join('\n') !== expected.join('\n')) {
    const missing = expected.filter(file => !found.includes(file))
    const extra = found.filter(file => !expected.includes(file))
    throw new ReleaseError(`installed package differs from the artifact; missing: [${missing}] extra: [${extra}]`)
  }
  for (const [file, content] of files) {
    if (!fs.readFileSync(path.join(installed, file)).equals(content)) {
      throw new ReleaseError(`installed ${file} differs from the artifact`)
    }
  }
}

async function verify (artifact, { node, toolsDir, keep = false, log = line => process.stdout.write(`${line}\n`) }) {
  const files = readTarball(artifact.buffer)
  const work = makeTempDir(`consumer-node${node.major}`, { keep })
  const env = {
    ...withNodeOnPath(cleanEnv(), node.binary),
    FASTIFY_EXPECTED_VERSION: artifact.version,
    FASTIFY_EXPECTED_FILES: JSON.stringify(artifact.files)
  }
  const passed = []
  const failures = []
  const skipped = []

  async function scenario (name, requires, body) {
    const label = `[node ${node.version}] ${name}`
    if (requires && !passed.includes(requires)) {
      skipped.push(name)
      log(`  skip ${label} (needs ${requires})`)
      return
    }
    const started = Date.now()
    try {
      await body()
      passed.push(name)
      log(`  ok   ${label} (${((Date.now() - started) / 1000).toFixed(1)}s)`)
    } catch (error) {
      failures.push({ name, message: error.message })
      log(`  FAIL ${label}\n${error.message.replace(/^/gm, '         ')}`)
    }
  }

  const ranges = toolRanges(node.major)
  const dependencies = {
    fastify: `file:./${artifact.filename}`,
    'fastify-plugin': ranges.fastifyPlugin
  }
  const devDependencies = { typescript: ranges.typescript, '@types/node': ranges.typesNode }
  const tool = (...parts) => path.join(toolsDir, 'node_modules', ...parts)
  const exec = (args, cwd) => run(node.binary, args, { cwd, env })

  // Caches that are keyed by file name rather than content must not survive a
  // run, or an older tarball of the same version could be installed.
  const installers = {
    npm: cwd => npm(['install', ...INSTALL_FLAGS, '--package-lock=false'], { cwd, env, node: node.binary }),
    pnpm: cwd => exec([tool('pnpm', 'bin', 'pnpm.cjs'), 'install', '--ignore-scripts', '--no-lockfile',
      '--store-dir', path.join(work, 'pnpm-store')], cwd),
    yarn: cwd => exec([tool('yarn', 'bin', 'yarn.js'), 'install', '--ignore-scripts', '--ignore-engines',
      '--no-lockfile', '--non-interactive', '--cache-folder', path.join(work, 'yarn-cache')], cwd)
  }

  async function createConsumer (dir, manager, manifest) {
    writeProject(dir, manifest)
    fs.copyFileSync(artifact.tarball, path.join(dir, artifact.filename))
    await installers[manager](dir)
    assertInstalledArtifact(dir, files)
  }

  // Type checking needs dev dependencies, which must stay out of the project the
  // runtime scenarios use.
  async function typecheck (project, mode) {
    const config = `tsconfig.${mode}.json`
    fs.writeFileSync(path.join(project, config), JSON.stringify({
      compilerOptions: {
        ...policy.TYPESCRIPT_MODES[mode],
        target: 'es2022',
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        esModuleInterop: true,
        types: ['node']
      },
      files: fs.readdirSync(path.join(FIXTURES, 'types'))
        .filter(file => typeScriptFixtureApplies(file, mode))
    }, null, 2))
    await exec([path.join(project, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', config], project)
  }

  for (const manager of ['npm', ...Object.keys(policy.PACKAGE_MANAGERS)]) {
    const runtime = path.join(work, manager)
    const typed = path.join(work, `${manager}-types`)
    await scenario(`${manager}:install`, null, async () => {
      await createConsumer(runtime, manager, { dependencies })
      await createConsumer(typed, manager, { dependencies, devDependencies })
      fs.cpSync(path.join(FIXTURES, 'runtime'), runtime, { recursive: true })
      fs.cpSync(path.join(FIXTURES, 'types'), typed, { recursive: true })
    })
    await scenario(`${manager}:commonjs`, `${manager}:install`, async () => {
      await exec(['modules.cjs'], runtime)
      await exec(['consumer.cjs'], runtime)
    })
    await scenario(`${manager}:esm`, `${manager}:install`, () => exec(['consumer.mjs'], runtime))
    const modes = manager === 'npm' ? Object.keys(policy.TYPESCRIPT_MODES) : ['nodenext']
    for (const mode of modes) {
      await scenario(`${manager}:types:${mode}`, `${manager}:install`, () => typecheck(typed, mode))
    }
  }

  for (const bundler of policy.BUNDLERS) {
    await scenario(`bundle:${bundler}`, 'npm:install', async () => {
      const out = path.join(work, `bundle-${bundler}`)
      await exec([path.join(FIXTURES, 'bundle.js'), bundler, toolsDir, path.join(work, 'npm'), out], work)
      // `out` has no node_modules, so each bundle has to be self-contained.
      for (const entry of ['consumer.cjs.js', 'consumer.mjs.js']) {
        await exec([path.join(out, entry)], out)
      }
    })
  }

  return {
    integrity: artifact.integrity,
    node: node.version,
    platform: process.platform,
    passed,
    failures,
    skipped
  }
}

module.exports = { installTools, verify, assertInstalledArtifact }
