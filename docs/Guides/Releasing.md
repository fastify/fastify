<h1 align="center">Fastify</h1>

## Releasing

This guide is for maintainers. A release publishes one tarball, and only after
those exact bytes have been installed and used the way downstream projects use
Fastify.

### Release from GitHub Actions

1. In a pull request, set `version` in `package.json`, run
   `npm run build:sync-version`, and merge the result.
2. Run the **release** workflow on `main`, `next`, or a `*.x` branch with
   `dry-run` enabled (the default). With npm 11 and later, a dry run fails if
   the version is already published, so bump the version first.
3. Run it again with `dry-run` disabled. Set `dist-tag` for anything that must
   not become `latest`, such as a maintenance branch or a prerelease.
4. Create the GitHub release and its notes.

The `publish` job starts only if all of these pass:

| Job       | What it proves                                                  |
| --------- | --------------------------------------------------------------- |
| `quality` | Lint, generated files, type tests, and coverage                 |
| `test`    | Unit tests on every supported Node.js version and system        |
| `package` | The packed tarball works for consumers (see below)              |

It then checks that the checkout is clean, that the tarball was packed from the
checked out commit and still matches it, and that there is a passing receipt for
that tarball's SHA-512 from every Node.js version and system. It uploads that
file without repacking, then confirms that the registry reports the same
integrity.

#### One-time repository setup

The workflow does not work until an administrator has:

- Added a [trusted publisher](https://docs.npmjs.com/trusted-publishers) for
  the `fastify` package on npmjs.com: repository `fastify/fastify`, workflow
  `release.yml`, environment `npm`. No npm token is stored in GitHub.
- Created the `npm` environment in the repository settings, with required
  reviewers and the release branches as its only deployment branches.
- Optionally, set the package's publishing access to disallow tokens. This is
  the only way to _prevent_ publishing around this process.

### Check and publish locally

```bash
npm install
npm run release:check
```

`release:check` publishes nothing. It needs network access to the npm registry
and takes several minutes. For Node.js versions other than the one running it,
it downloads the official binaries as repackaged in the `node-<os>-<arch>` npm
packages. To use your own binaries, or to narrow a debugging run:

```bash
npm run release:check -- --node-path /path/to/node20 --node-path /path/to/node24
npm run release:check -- --node 22 --keep
npm run release:check -- --out ../fastify-release
```

`--keep` leaves the consumer projects on disk and prints where they are. `--out`
saves the tarball and receipts to an empty directory outside the repository.

The release workflow is the preferred way to publish. If it is unavailable:

```bash
npm run release:publish -- --dry-run
npm run release:publish -- --otp 123456
```

This requires a clean git checkout, runs lint, unit, and type tests, runs the
whole of `release:check`, and publishes the tarball it validated. **It covers
only your operating system**, and it has no provenance attestation.

> **Never run `npm publish` in the repository.** The repository's `.npmrc` sets
> `ignore-scripts=true`, so npm skips `prepublishOnly` and uploads the working
> directory without any check. The `prepublishOnly` guard only stops people who
> have re-enabled scripts.

### What is validated

Before anything is installed, the tarball is inspected:

- It contains only the allowed files, and every file in `lib/` and `types/`.
- Each file is byte-for-byte the one in the checkout.
- Every relative import resolves inside the package, and every other import is a
  declared dependency.
- `fastify.js` and `package.json` agree on the version, there are no install
  scripts, and all dependencies come from the registry.

Then, for each Node.js version, fresh projects outside the repository install
the tarball and its dependencies from the registry:

| Consumption   | Checked with                                                   |
| ------------- | -------------------------------------------------------------- |
| Package tools | npm, pnpm 8, Yarn 1, each verifying the installed bytes        |
| CommonJS      | Every published module loads; a server handles requests        |
| ES modules    | Default, named, namespace, and dynamic imports                 |
| TypeScript    | `node16`, `nodenext`, `bundler`, `node10`; no `skipLibCheck`   |
| Bundlers      | esbuild and webpack output runs without `node_modules`         |

The TypeScript, `fastify-plugin`, esbuild, and webpack version ranges are read
from the repository's `package.json` files. Dependencies resolve to the newest
versions in range, as they would for a new user, so the gate can fail without
any change in this repository. The repository's `min-release-age` setting does
not apply to these installs.

### When the gate fails

Each failure names the Node.js version and scenario, followed by the command,
its directory, and its output.

| Message                              | What to do                                 |
| ------------------------------------ | ------------------------------------------ |
| `generated files are out of date`    | `npm run build:validation`, review, commit |
| `VERSION is ... but`                 | `npm run build:sync-version`, commit       |
| `unexpected file in package`         | Narrow `files`, or allow it in the policy  |
| `missing from package`               | Widen `files` in `package.json`            |
| `is not in "dependencies"`           | Move the package to `dependencies`         |
| `has no exported member`             | A public type was removed: breaking        |
| `receipt is for a different tarball` | Re-run the whole workflow                  |
| `REGISTRY MISMATCH`                  | Deprecate the version and investigate      |
| `could not be confirmed`             | Do not republish; compare integrity        |

### Changing what is supported

The rules live in `scripts/release/policy.js`. Tests in `test/release/` run with
`npm run unit` and fail when these drift apart:

- **Node.js version or operating system:** update `NODE_VERSIONS` and
  `CI_PLATFORMS`, and the matrices in `ci.yml`, `package-validation.yml`, and
  `release.yml`.
- **New published file type or directory:** update both `files` in
  `package.json` and `ALLOWED_FILES`. They are deliberately separate.
- **New public type:** add it to
  `scripts/release/fixtures/types/public-names.ts`.
- **New file in `types/`:** import it in
  `scripts/release/fixtures/types/deep-imports.mts`.
- **New consumption mode:** add a scenario in `verify.js` and list it in
  `SCENARIOS`, so that publishing requires it.

`ci.yml` runs the package validation on pull requests too. It leaves out the
generated-file check, which depends on the newest dependency releases.
