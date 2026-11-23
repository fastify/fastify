'use strict'

/* c8 ignore start */

// Static checks on the bytes of a packed tarball. Dependency-free, so the
// publish job can run them without installing anything.

const fs = require('node:fs')
const { isBuiltin } = require('node:module')
const path = require('node:path')
const zlib = require('node:zlib')
const policy = require('./policy')
const { ReleaseError, listFiles } = require('./util')

// Minimal reader for the ustar/pax archives that `npm pack` writes.
function readTarball (buffer) {
  const tar = zlib.gunzipSync(buffer)
  const files = new Map()
  const text = (start, length) => tar.toString('utf8', start, start + length).replace(/\0[\s\S]*$/, '')
  let longName
  for (let offset = 0; offset + 512 <= tar.length;) {
    if (tar[offset] === 0) break
    const size = parseInt(text(offset + 124, 12).trim() || '0', 8)
    const type = text(offset + 156, 1) || '0'
    const prefix = text(offset + 345, 155)
    let name = text(offset, 100)
    if (prefix) name = `${prefix}/${name}`
    const body = tar.subarray(offset + 512, offset + 512 + size)
    if (type === 'x') {
      longName = /^\d+ path=(.*)$/m.exec(body.toString('utf8'))?.[1]
    } else if (type === 'L') {
      longName = body.toString('utf8').replace(/\0[\s\S]*$/, '')
    } else {
      name = longName || name
      longName = undefined
      if (type === '0') {
        if (!name.startsWith('package/')) throw new ReleaseError(`unexpected tarball entry ${name}`)
        files.set(name.slice('package/'.length), body)
      } else if (type !== '5' && type !== 'g') {
        throw new ReleaseError(`tarball entry ${name} is not a regular file (type ${type})`)
      }
    }
    offset += 512 + Math.ceil(size / 512) * 512
  }
  return files
}

// Strings, comments and regular expression literals, in one pass, so that a
// `/*` inside '*/*' is not mistaken for the start of a comment.
const TOKEN = new RegExp([
  /'(?:\\[\s\S]|[^'\\\n])*'/,
  /"(?:\\[\s\S]|[^"\\\n])*"/,
  /`(?:\\[\s\S]|[^`\\])*`/,
  /\/\*[\s\S]*?\*\//,
  /\/\/.*/,
  /(?<=(?:[=(,:!&|?;{}[]|\breturn)\s*)\/(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\\n[])+\//
].map(part => part.source).join('|'), 'g')

function stripComments (source) {
  return source.replace(TOKEN, token => token.startsWith('//') || token.startsWith('/*') ? ' ' : token)
}

function findSpecifiers (source, isDeclaration) {
  const found = new Set()
  const patterns = [
    /(?<![\w$.])(?:require|import)(?:\.resolve)?\s*\(\s*(['"])([^'"\n]+)\1\s*[,)]/g,
    /(?<![\w$.])(?:from|import)\s*(['"])([^'"\n]+)\1/g
  ]
  const code = stripComments(source)
  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) found.add(match[2])
  }
  if (isDeclaration) {
    // Triple-slash directives are comments, but the compiler follows them.
    for (const match of source.matchAll(/^\/\/\/\s*<reference\s+(path|types)=(['"])([^'"]+)\2/gm)) {
      found.add(match[1] === 'path' && !match[3].startsWith('.') ? `./${match[3]}` : match[3])
    }
  }
  return [...found]
}

function resolvesInPackage (files, from, specifier) {
  const target = path.posix.join(path.posix.dirname(from), specifier)
  const bare = target.replace(/\.[cm]?js$/, '')
  const candidates = from.endsWith('.d.ts')
    ? [target, `${bare}.d.ts`, `${target}/index.d.ts`]
    : [target, `${target}.js`, `${target}.json`, `${target}/index.js`]
  return candidates.some(candidate => files.has(candidate))
}

function packageName (specifier) {
  return specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/')
}

function checkImports (files, manifest) {
  const problems = []
  const declared = new Set([
    manifest.name,
    ...Object.keys(manifest.dependencies || {}),
    ...Object.keys(manifest.peerDependencies || {})
  ])
  for (const [file, content] of files) {
    const isDeclaration = file.endsWith('.d.ts')
    if (!isDeclaration && !file.endsWith('.js')) continue
    for (const specifier of findSpecifiers(content.toString('utf8'), isDeclaration)) {
      if (specifier.startsWith('.')) {
        if (!resolvesInPackage(files, file, specifier)) {
          problems.push(`${file} imports '${specifier}', which is not in the package`)
        }
      } else if (!isBuiltin(specifier) && !(isDeclaration && specifier === 'node') &&
          !declared.has(packageName(specifier))) {
        problems.push(`${file} imports '${specifier}', but '${packageName(specifier)}' ` +
          'is not in "dependencies", so consumers will not have it')
      }
    }
  }
  return problems
}

function checkManifest (manifest, source, files) {
  const problems = []
  for (const field of ['name', 'version', 'main', 'types', 'type', 'exports', 'dependencies']) {
    if (JSON.stringify(manifest[field]) !== JSON.stringify(source[field])) {
      problems.push(`package.json "${field}" in the tarball differs from the repository`)
    }
  }
  if (manifest.private) problems.push('package.json is marked "private"')
  for (const field of ['main', 'types']) {
    const target = manifest[field] && path.posix.normalize(manifest[field])
    if (!target || !files.has(target)) {
      problems.push(`package.json "${field}" points to ${manifest[field]}, which is not in the package`)
    }
  }
  for (const script of ['preinstall', 'install', 'postinstall']) {
    if (manifest.scripts?.[script]) {
      problems.push(`package.json has a "${script}" script, which would run on every consumer's machine`)
    }
  }
  for (const [name, range] of Object.entries(manifest.dependencies || {})) {
    if (/^(?:file|link|workspace|git|git\+\w+|https?|github):|\//.test(range) && !range.startsWith('npm:')) {
      problems.push(`dependency "${name}" uses "${range}", which is not a registry version range`)
    }
  }
  const runtimeVersion = /const\s*VERSION\s*=\s*'([^']*)'/.exec(files.get('fastify.js')?.toString('utf8') || '')?.[1]
  if (runtimeVersion !== manifest.version) {
    problems.push(`fastify.js VERSION is '${runtimeVersion}' but package.json version is ` +
      `'${manifest.version}'. Run \`npm run build:sync-version\` and commit the result`)
  }
  return problems
}

function requiredFiles (sourceDir) {
  const nested = policy.REQUIRED_DIRECTORIES.flatMap(dir => {
    const full = path.join(sourceDir, dir)
    if (!fs.existsSync(full)) return []
    return listFiles(full)
      .filter(file => !file.split('/').some(part => part.startsWith('.')))
      .map(file => `${dir}/${file}`)
  })
  return [...policy.REQUIRED_FILES, ...nested]
}

// Returns every problem found, so one run reports all of them.
function inspectPackage (files, sourceDir) {
  const problems = []
  for (const file of files.keys()) {
    if (!policy.ALLOWED_FILES.some(pattern => pattern.test(file))) {
      problems.push(`unexpected file in package: ${file} ` +
        '(fix "files" in package.json, or ALLOWED_FILES in scripts/release/policy.js)')
    }
  }
  for (const file of requiredFiles(sourceDir)) {
    if (!files.has(file)) {
      problems.push(`missing from package: ${file} (check "files" in package.json)`)
    }
  }
  for (const [file, content] of files) {
    // npm may re-serialize package.json; its fields are compared separately.
    if (file === 'package.json') continue
    const original = path.join(sourceDir, file)
    if (!fs.existsSync(original) || !content.equals(fs.readFileSync(original))) {
      problems.push(`${file} in the tarball differs from the file in the repository`)
    }
  }
  if (!files.has('package.json')) return problems
  const manifest = JSON.parse(files.get('package.json'))
  const source = JSON.parse(fs.readFileSync(path.join(sourceDir, 'package.json'), 'utf8'))
  return [...problems, ...checkManifest(manifest, source, files), ...checkImports(files, manifest)]
}

module.exports = { readTarball, stripComments, findSpecifiers, inspectPackage }
