'use strict'

const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert')
const { MockAgent, setGlobalDispatcher, getGlobalDispatcher } = require('undici')
const { extractGitHubLinks, checkGitHubRepo } = require('../../scripts/validate-ecosystem-links')

describe('extractGitHubLinks', () => {
  it('extracts simple GitHub repository links', () => {
    const content = `
# Ecosystem

- [fastify-helmet](https://github.com/fastify/fastify-helmet) - Important security headers for Fastify
- [fastify-cors](https://github.com/fastify/fastify-cors) - CORS support
`
    const links = extractGitHubLinks(content)

    assert.strictEqual(links.length, 2)
    assert.deepStrictEqual(links[0], {
      name: 'fastify-helmet',
      url: 'https://github.com/fastify/fastify-helmet',
      owner: 'fastify',
      repo: 'fastify-helmet'
    })
    assert.deepStrictEqual(links[1], {
      name: 'fastify-cors',
      url: 'https://github.com/fastify/fastify-cors',
      owner: 'fastify',
      repo: 'fastify-cors'
    })
  })

  it('extracts links with different owner/repo combinations', () => {
    const content = `
- [some-plugin](https://github.com/user123/awesome-plugin)
- [another-lib](https://github.com/org-name/lib-name)
`
    const links = extractGitHubLinks(content)

    assert.strictEqual(links.length, 2)
    assert.strictEqual(links[0].owner, 'user123')
    assert.strictEqual(links[0].repo, 'awesome-plugin')
    assert.strictEqual(links[1].owner, 'org-name')
    assert.strictEqual(links[1].repo, 'lib-name')
  })

  it('handles links with hash fragments', () => {
    const content = `
- [project](https://github.com/owner/repo#readme)
`
    const links = extractGitHubLinks(content)

    assert.strictEqual(links.length, 1)
    assert.strictEqual(links[0].repo, 'repo')
    assert.strictEqual(links[0].url, 'https://github.com/owner/repo#readme')
  })

  it('handles links with query parameters', () => {
    const content = `
- [project](https://github.com/owner/repo?tab=readme)
`
    const links = extractGitHubLinks(content)

    assert.strictEqual(links.length, 1)
    assert.strictEqual(links[0].repo, 'repo')
  })

  it('handles links with subpaths', () => {
    const content = `
- [docs](https://github.com/owner/repo/tree/main/docs)
`
    const links = extractGitHubLinks(content)

    assert.strictEqual(links.length, 1)
    assert.strictEqual(links[0].owner, 'owner')
    assert.strictEqual(links[0].repo, 'repo')
  })

  it('returns empty array for content with no GitHub links', () => {
    const content = `
# No GitHub links here

Just some regular text and [a link](https://example.com).
`
    const links = extractGitHubLinks(content)

    assert.strictEqual(links.length, 0)
  })

  it('ignores non-GitHub links', () => {
    const content = `
- [gitlab](https://gitlab.com/owner/repo)
- [github](https://github.com/owner/repo)
- [bitbucket](https://bitbucket.org/owner/repo)
`
    const links = extractGitHubLinks(content)

    assert.strictEqual(links.length, 1)
    assert.strictEqual(links[0].owner, 'owner')
  })

  it('extracts multiple links from complex markdown', () => {
    const content = `
## Category 1

Some description [inline link](https://github.com/a/b).

| Plugin | Description |
|--------|-------------|
| [plugin1](https://github.com/x/y) | Desc 1 |
| [plugin2](https://github.com/z/w) | Desc 2 |
`
    const links = extractGitHubLinks(content)

    assert.strictEqual(links.length, 3)
  })
})

describe('checkGitHubRepo', () => {
  let mockAgent
  let originalDispatcher

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)
  })

  afterEach(() => {
    setGlobalDispatcher(originalDispatcher)
    mockAgent.close()
  })

  it('returns exists: true for status 200', async () => {
    const mockPool = mockAgent.get('https://api.github.com')
    mockPool.intercept({
      path: '/repos/fastify/fastify',
      method: 'HEAD'
    }).reply(200)

    const result = await checkGitHubRepo('fastify', 'fastify')

    assert.strictEqual(result.exists, true)
    assert.strictEqual(result.status, 200)
    assert.strictEqual(result.owner, 'fastify')
    assert.strictEqual(result.repo, 'fastify')
  })

  it('returns exists: false for status 404', async () => {
    const mockPool = mockAgent.get('https://api.github.com')
    mockPool.intercept({
      path: '/repos/nonexistent/repo',
      method: 'HEAD'
    }).reply(404)

    const result = await checkGitHubRepo('nonexistent', 'repo')

    assert.strictEqual(result.exists, false)
    assert.strictEqual(result.status, 404)
  })

  it('proves mock is used by returning 404 for existing repo', async () => {
    const mockPool = mockAgent.get('https://api.github.com')
    mockPool.intercept({
      path: '/repos/fastify/fastify',
      method: 'HEAD'
    }).reply(404)

    const result = await checkGitHubRepo('fastify', 'fastify')

    assert.strictEqual(result.exists, false)
    assert.strictEqual(result.status, 404)
  })

  it('handles network errors', async () => {
    const mockPool = mockAgent.get('https://api.github.com')
    mockPool.intercept({
      path: '/repos/owner/repo',
      method: 'HEAD'
    }).replyWithError(new Error('Network error'))

    const result = await checkGitHubRepo('owner', 'repo')

    assert.strictEqual(result.exists, false)
    assert.strictEqual(result.status, 'error')
    assert.ok(result.error.length > 0)
  })
})
