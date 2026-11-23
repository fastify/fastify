#!/usr/bin/env node
'use strict'

// `prepublishOnly` runs when a directory is published, never when a tarball is.
// A directory publish packs a new artifact that nothing has checked.
/* c8 ignore start */
console.error(`
Refusing to publish from the source directory: it would upload a package that
the release gate never checked. Run the "release" GitHub Actions workflow and
publish the tarball it validated. See RELEASING.md.
`)
process.exitCode = 1
/* c8 ignore stop */
