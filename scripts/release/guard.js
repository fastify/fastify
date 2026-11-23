'use strict'

/* c8 ignore start */

// Runs as `prepublishOnly`. npm skips it for tarball publishes (which is what
// release:publish does), so reaching it means the directory is being published.
process.stderr.write(`
Do not publish the working directory: it would upload an untested package.
Use the release workflow, or \`npm run release:publish\`.
See docs/Guides/Releasing.md.
`)
process.exitCode = 1
