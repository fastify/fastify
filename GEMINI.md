<!-- crag:auto-start -->
# GEMINI.md

> Generated from governance.md by crag. Regenerate: `crag compile --target gemini`

## Project Context

- **Name:** fastify
- **Description:** Fast and low overhead web framework, for Node.js
- **Stack:** node, typescript
- **Runtimes:** node

## Rules

### Quality Gates

Run these checks in order before committing any changes:

1. [lint] `npm run lint`
2. [lint] `npx tsc --noEmit`
3. [test] `npm run test`
4. [ci (inferred from workflow)] `npm run unit`
5. [ci (inferred from workflow)] `npm run test:typescript`
6. [ci (inferred from workflow)] `"`
7. [ci (inferred from workflow)] `npm run coverage:ci-check-coverage`
8. [ci (inferred from workflow)] `./node_modules/.bin/markdownlint-cli2`

### Security

- No hardcoded secrets — grep for sk_live, AKIA, password= before commit

### Workflow

- Conventional commits (feat:, fix:, docs:, chore:, etc.)
- Commit trailer: Co-Authored-By: Claude <noreply@anthropic.com>
- Run quality gates before committing
- Review security implications of all changes

<!-- crag:auto-end -->
