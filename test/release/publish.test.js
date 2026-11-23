'use strict'

const { test } = require('node:test')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const policy = require('../../scripts/release/policy')
const { parse, withNpmFlags, outputDir, selectedMajors } = require('../../scripts/release/cli')
const {
  assertReleasableCheckout, confirmPublished, missingValidation, publish, readReceipts, writeReceipt
} = require('../../scripts/release/publish')
const { ROOT, cleanEnv, diffSnapshots, makeTempDir } = require('../../scripts/release/util')
const { normalize } = require('../../scripts/release/generated')

const artifact = { name: 'fastify', version: '1.2.3', integrity: 'sha512-good', tarball: __filename }
const receipt = (platform, major, changes) => ({
  integrity: artifact.integrity,
  node: `${major}.1.0`,
  platform,
  passed: [...policy.SCENARIOS],
  failures: [],
  ...changes
})
const complete = platforms => platforms.flatMap(p => policy.NODE_VERSIONS.map(major => receipt(p, major)))

test('publishing needs every platform and Node.js version', t => {
  const platforms = policy.CI_PLATFORMS
  t.assert.deepStrictEqual(missingValidation(artifact, complete(platforms), platforms), [])

  const partial = complete(platforms).filter(r => !(r.platform === 'win32' && r.node.startsWith('20.')))
  t.assert.deepStrictEqual(missingValidation(artifact, partial, platforms),
    ['win32 / Node.js 20: no validation receipt'])
  t.assert.strictEqual(missingValidation(artifact, [], ['linux']).length, policy.NODE_VERSIONS.length)
})

test('receipts for other bytes, failures or skipped scenarios do not count', t => {
  const cases = [
    [{ integrity: 'sha512-other' }, /different tarball/],
    [{ failures: [{ name: 'npm:esm' }] }, /failed or was incomplete/],
    [{ passed: policy.SCENARIOS.slice(1) }, /failed or was incomplete/]
  ]
  for (const [changes, expected] of cases) {
    const receipts = complete(['linux'])
    receipts[0] = receipt('linux', policy.NODE_VERSIONS[0], changes)
    const missing = missingValidation(artifact, receipts, ['linux'])
    t.assert.strictEqual(missing.length, 1)
    t.assert.match(missing[0], expected)
  }
})

test('receipts round trip through a directory', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fastify-receipts-test-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  writeReceipt(dir, receipt('linux', 22))
  t.assert.deepStrictEqual(readReceipts(dir), [receipt('linux', 22)])
  t.assert.deepStrictEqual(readReceipts(path.join(dir, 'absent')), [])
})

test('a directory that is not a git checkout cannot be published from', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fastify-checkout-test-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  await t.assert.rejects(assertReleasableCheckout(artifact, { sourceDir: dir }), /not a git checkout/)
  await t.assert.rejects(publish(artifact, { sourceDir: dir, platforms: ['linux'] }), /not a git checkout/)
})

test('the registry must serve the validated bytes', async t => {
  await confirmPublished(artifact, { view: async () => 'sha512-good\n', delay: 0 })

  let calls = 0
  await confirmPublished(artifact, {
    delay: 0,
    view: async () => {
      if (++calls < 3) throw new Error('E404')
      return 'sha512-good'
    }
  })
  t.assert.strictEqual(calls, 3)

  await t.assert.rejects(confirmPublished(artifact, { view: async () => 'sha512-evil', delay: 0 }),
    /REGISTRY MISMATCH/)
  await t.assert.rejects(confirmPublished(artifact, { view: async () => '', delay: 0, attempts: 2 }),
    /Do NOT publish again/)
})

test('flags that npm swallowed are still honored', t => {
  const env = { npm_config_dry_run: 'true', npm_config_tag: 'next', npm_config_otp: '123456' }
  t.assert.deepStrictEqual(withNpmFlags({}, env), { 'dry-run': true, tag: 'next', otp: '123456' })
  t.assert.deepStrictEqual(withNpmFlags({ tag: 'beta' }, { npm_config_tag: 'next' }), { tag: 'beta' })
  t.assert.deepStrictEqual(withNpmFlags({}, {}), {})
})

test('the command line is strict', t => {
  t.assert.throws(() => parse([]), /missing command/)
  t.assert.throws(() => parse(['ship']), /unknown command 'ship'/)
  t.assert.throws(() => parse(['publish', '--dryrun']), /Unknown option '--dryrun'/)
  t.assert.throws(() => parse(['publish', '--node', '22']), /Unknown option/)
  t.assert.strictEqual(parse(['publish', '--dry-run']).values['dry-run'], true)
  t.assert.throws(() => selectedMajors('18'), /unsupported/)
  t.assert.deepStrictEqual(selectedMajors(), policy.NODE_VERSIONS)
})

test('artifacts are never written into the repository or over old results', t => {
  t.assert.throws(() => outputDir(path.join(ROOT, 'out')), /inside the repository/)
  t.assert.throws(() => outputDir(ROOT), /inside the repository/)
  t.assert.throws(() => outputDir(os.homedir()), /is not empty/)
})

test('repository settings in the environment do not reach consumers', t => {
  t.assert.deepStrictEqual(cleanEnv({
    PATH: '/bin',
    NODE_PATH: '/repo/node_modules',
    NODE_OPTIONS: '--require ./x',
    npm_config_ignore_scripts: 'true',
    npm_config_min_release_age: '7',
    npm_config_package_lock: '',
    npm_config_dry_run: 'true',
    npm_config_registry: 'https://registry.example/',
    'npm_config_//registry.example/:_authToken': 'token'
  }), {
    PATH: '/bin',
    npm_config_registry: 'https://registry.example/',
    'npm_config_//registry.example/:_authToken': 'token'
  })
})

test('temporary directories are refused below node_modules', t => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'fastify-isolation-test-'))
  fs.mkdirSync(path.join(base, 'node_modules'))
  const original = os.tmpdir
  t.after(() => {
    os.tmpdir = original
    fs.rmSync(base, { recursive: true, force: true })
  })
  os.tmpdir = () => base
  t.assert.throws(() => makeTempDir('x'), /is not isolated/)
  t.assert.deepStrictEqual(fs.readdirSync(base), ['node_modules'])
})

test('repository changes are reported', t => {
  t.assert.deepStrictEqual(
    diffSnapshots(new Map([['a', '1'], ['b', '1']]), new Map([['a', '2'], ['c', '1']])),
    ['modified a', 'created c', 'deleted b'])
})

test('generated files are compared ignoring whitespace only', t => {
  t.assert.strictEqual(normalize('a  b\r\n\r\n  c\n'), normalize('ab\nc'))
  t.assert.notStrictEqual(normalize('ab'), normalize('ac'))
})
