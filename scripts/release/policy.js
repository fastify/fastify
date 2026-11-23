'use strict'

/* c8 ignore start */

// The single place that states what a releasable Fastify package looks like.
// See docs/Guides/Releasing.md before changing it.

// Must match the Node.js matrix in ci.yml and package-validation.yml.
const NODE_VERSIONS = [20, 22, 24, 26]

// `process.platform` values that must validate a release published from CI.
const CI_PLATFORMS = ['linux', 'darwin', 'win32']

// Every file in the tarball must match one of these. This is intentionally
// independent from `files` in package.json, so that widening `files` by
// mistake is caught.
const ALLOWED_FILES = [
  /^package\.json$/,
  /^README\.md$/,
  /^LICENSE$/,
  /^fastify\.js$/,
  /^fastify\.d\.ts$/,
  /^lib\/(?:[\w-]+\/)*[\w.-]+\.js$/,
  /^types\/(?:[\w-]+\/)*[\w.-]+\.d\.ts$/
]

// Everything found here in the repository must be in the tarball.
const REQUIRED_FILES = ['package.json', 'README.md', 'LICENSE', 'fastify.js', 'fastify.d.ts']
const REQUIRED_DIRECTORIES = ['lib', 'types']

const PACKAGE_MANAGERS = {
  pnpm: 'pnpm@8',
  yarn: 'yarn@1.22.22'
}

// tsconfig `compilerOptions` for each way a TypeScript project can resolve us.
const TYPESCRIPT_MODES = {
  node16: { module: 'node16', moduleResolution: 'node16' },
  nodenext: { module: 'nodenext', moduleResolution: 'nodenext' },
  bundler: { module: 'esnext', moduleResolution: 'bundler' },
  node10: { module: 'commonjs', moduleResolution: 'node10', ignoreDeprecations: '6.0' }
}

const BUNDLERS = ['esbuild', 'webpack']

// A release needs every one of these to pass. Receipts are checked against it.
const SCENARIOS = [
  'npm:install',
  'npm:commonjs',
  'npm:esm',
  ...Object.keys(TYPESCRIPT_MODES).map(mode => `npm:types:${mode}`),
  ...BUNDLERS.map(bundler => `bundle:${bundler}`),
  ...Object.keys(PACKAGE_MANAGERS).flatMap(pm => [
    `${pm}:install`,
    `${pm}:commonjs`,
    `${pm}:esm`,
    `${pm}:types:nodenext`
  ])
]

module.exports = {
  NODE_VERSIONS,
  CI_PLATFORMS,
  ALLOWED_FILES,
  REQUIRED_FILES,
  REQUIRED_DIRECTORIES,
  PACKAGE_MANAGERS,
  TYPESCRIPT_MODES,
  BUNDLERS,
  SCENARIOS
}
