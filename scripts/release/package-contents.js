'use strict'

// Static checks on the packed tarball. Nothing here needs the network or any
// dependency, so it is also covered by the normal unit tests.
/* c8 ignore start */

const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')
const crypto = require('node:crypto')
const { builtinModules } = require('node:module')

// What consumers get, independently of the "files" field in package.json: the
// two must agree, so a mistake in either one is reported.
const ROOT_FILES = ['LICENSE', 'README.md', 'SECURITY.md', 'fastify.d.ts', 'fastify.js', 'package.json']
const PUBLIC_DIRS = [
  { dir: 'lib', extension: '.js' },
  { dir: 'types', extension: '.d.ts' }
]
const INSTALL_SCRIPTS = ['preinstall', 'install', 'postinstall']

function sha256 (buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

// Minimal reader for the ustar archives produced by `npm pack`.
function readTarball (tarball) {
  const data = zlib.gunzipSync(fs.readFileSync(tarball))
  const files = new Map()
  const text = (start, length) => data.toString('utf8', start, start + length).replace(/\0.*$/s, '')
  let longName

  for (let offset = 0; offset + 512 <= data.length;) {
    if (data[offset] === 0) break
    const size = parseInt(text(offset + 124, 12).trim() || '0', 8)
    const type = text(offset + 156, 1)
    const prefix = text(offset + 345, 155)
    const name = longName || (prefix ? `${prefix}/` : '') + text(offset, 100)
    const body = data.subarray(offset + 512, offset + 512 + size)
    longName = undefined

    if (type === 'x') {
      longName = /\d+ path=([^\n]*)\n/.exec(body.toString('utf8'))?.[1]
    } else if (type === '0' || type === '') {
      files.set(name.replace(/^package\//, ''), body)
    } else if (type !== '5' && type !== 'g') {
      throw new Error(`Unexpected entry type "${type}" for "${name}" in ${tarball}`)
    }
    offset += 512 + Math.ceil(size / 512) * 512
  }
  return files
}

function listFiles (root, dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const relative = `${dir}/${entry.name}`
    return entry.isDirectory() ? listFiles(root, relative) : [relative]
  })
}

function expectedFiles (root) {
  return ROOT_FILES.concat(PUBLIC_DIRS.flatMap(({ dir, extension }) =>
    listFiles(root, dir).filter((file) => file.endsWith(extension))
  )).sort()
}

// Comment lines are dropped so that usage examples are not read as imports.
function importSpecifiers (source) {
  const references = [...source.matchAll(/^\/\/\/\s*<reference\s+(path|types)=["']([^"']+)["']/gm)]
    .map(([, kind, value]) => kind === 'path' && !value.startsWith('.') ? `./${value}` : value)
  const code = source
    .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
  const imports = [...code.matchAll(/(?:\brequire\s*\(|\bimport\s*\(|\bfrom|^\s*import)\s*(["'])([^"'\n]+)\1/gm)]
    .map((match) => match[2])
  return references.concat(imports)
}

function resolvesInPackage (files, importer, specifier) {
  const target = path.posix.join(path.posix.dirname(importer), specifier)
  const suffixes = importer.endsWith('.d.ts')
    ? ['.d.ts', '/index.d.ts', '']
    : ['', '.js', '.json', '/index.js']
  return suffixes.some((suffix) => files.has(target + suffix))
}

function packageName (specifier) {
  return specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/')
}

/**
 * @param {Map<string, Buffer>} files tarball entries, see readTarball()
 * @param {string} root checkout the tarball is supposed to come from
 * @returns {string[]} one actionable message per problem
 */
function checkContents (files, root) {
  const problems = []
  const expected = expectedFiles(root)

  for (const file of expected) {
    if (!files.has(file)) {
      problems.push(`missing from the package: ${file} (add it to "files" in package.json)`)
    } else if (!files.get(file).equals(fs.readFileSync(path.join(root, file)))) {
      problems.push(`differs from the checkout: ${file} (the tarball was not packed from these sources; pack again)`)
    }
  }
  for (const file of files.keys()) {
    if (!expected.includes(file)) {
      problems.push(`should not be published: ${file} (narrow "files" in package.json, or if consumers ` +
        'need it, add it to scripts/release/package-contents.js)')
    }
  }

  if (!files.has('package.json')) return problems
  const manifest = JSON.parse(files.get('package.json'))

  for (const field of ['main', 'types']) {
    if (!files.has(manifest[field])) {
      problems.push(`package.json "${field}" points to "${manifest[field]}", which is not in the package`)
    }
  }
  for (const script of INSTALL_SCRIPTS) {
    if (manifest.scripts?.[script]) {
      problems.push(`package.json has a "${script}" script, which would run on every consumer's machine`)
    }
  }

  const version = /^const VERSION = '([^']+)'/m.exec(files.get('fastify.js')?.toString() ?? '')?.[1]
  if (version !== manifest.version) {
    problems.push(`fastify.js VERSION is "${version}" but package.json is "${manifest.version}" ` +
      '(run `npm run build:sync-version` and commit the result)')
  }

  const available = new Set([...Object.keys(manifest.dependencies ?? {}), manifest.name])
  for (const [file, content] of files) {
    if (!/^(fastify|lib\/|types\/).*(\.js|\.d\.ts)$/.test(file)) continue
    for (const specifier of importSpecifiers(content.toString())) {
      if (specifier.startsWith('.')) {
        if (!resolvesInPackage(files, file, specifier)) {
          problems.push(`${file} imports "${specifier}", which is not in the package`)
        }
      } else if (!specifier.startsWith('node:') && !builtinModules.includes(specifier) &&
          !(file.endsWith('.d.ts') && specifier === 'node') && !available.has(packageName(specifier))) {
        problems.push(`${file} imports "${specifier}", but "${packageName(specifier)}" is not in "dependencies"`)
      }
    }
  }

  return problems
}

module.exports = { checkContents, expectedFiles, importSpecifiers, readTarball, sha256 }
/* c8 ignore stop */
