'use strict'

const t = require('tap')
const fastify = require('..')

t.test('Testing request.hostname and request.port', async (t) => {
  const app = fastify()

  app.get('/test', (request, reply) => {
    reply.send({
      hostname: request.hostname,
      port: request.port
    })
  })

  await app.ready()

  /* IPv4 Tests */
  await t.test('should parse IPv4 hosts correctly', async (t) => {
    const tests = [
      /* With port */
      { input: '127.1.2.3:8080', expected: { hostname: '127.1.2.3', port: 8080 } },
      /* Without port */
      { input: '127.1.2.3', expected: { hostname: '127.1.2.3', port: null } },
      /* Trailing white space, with port */
      { input: '127.1.2.3:8080 ', expected: { hostname: '', port: null } },
      /* Trailing white space, without port */
      { input: '127.1.2.3 ', expected: { hostname: '', port: null } },
      /* With multiple port definitions */
      { input: '127.1.2.3:8080:8081', expected: { hostname: '', port: null } },
      /* With multiple port separators */
      { input: '127.1.2.3::8080', expected: { hostname: '', port: null } },
      /* Port separator without port */
      { input: '127.1.2.3:', expected: { hostname: '', port: null } },
      /* Illegal port */
      { input: '127.1.2.3:abc', expected: { hostname: '', port: null } },
      /* Max port */
      { input: '127.1.2.3:65535', expected: { hostname: '127.1.2.3', port: 65535 } },
      /* Exceed max port */
      { input: '127.1.2.3:65536', expected: { hostname: '', port: null } },
      /* Illegal IPv4, with port */
      { input: '.127.1.2.3:8080', expected: { hostname: '', port: null } },
      /* Illegal IPv4, without port */
      { input: '.127.1.2.3', expected: { hostname: '', port: null } },
    ]

    for (const test of tests) {
      const res = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { host: test.input }
      })
      const data = res.json()
      t.equal(data.hostname, test.expected.hostname)
      t.equal(data.port, test.expected.port)
    }
  })

  /* IPv6 Tests */
  await t.test('should parse IPv6 hosts correctly', async (t) => {
    const tests = [
      /* With port */
      { input: '[fd00::1:2:3]:8080', expected: { hostname: 'fd00::1:2:3', port: 8080 } },
      /* Without port */
      { input: '[fd00::1:2:3]', expected: { hostname: 'fd00::1:2:3', port: null } },
      /* Trailing white space, with port */
      { input: '[fd00::1:2:3]:8080 ', expected: { hostname: '', port: null } },
      /* Trailing white space, without port */
      { input: '[fd00::1:2:3] ', expected: { hostname: '', port: null } },
      /* With multiple port definitions */
      { input: '[fd00::1:2:3]:8080:8081', expected: { hostname: '', port: null } },
      /* With multiple port separators */
      { input: '[fd00::1:2:3]::8080', expected: { hostname: '', port: null } },
      /* Port separator without port */
      { input: '[fd00::1:2:3]:', expected: { hostname: '', port: null } },
      /* Illegal port */
      { input: '[fd00::1:2:3]:abc', expected: { hostname: '', port: null } },
      /* Max port */
      { input: '[fd00::1:2:3]:65535', expected: { hostname: 'fd00::1:2:3', port: 65535 } },
      /* Exceed max port */
      { input: '[fd00::1:2:3]:65536', expected: { hostname: '', port: null } },
      /* Missing closing bracket */
      { input: '[::1', expected: { hostname: '', port: null } },
      /* Empty IPv6, with port */
      { input: '[]:8080', expected: { hostname: '', port: 8080 } },
      /* Empty IPv6, without port */
      { input: '[]', expected: { hostname: '', port: null } },
      /* Illegal IPv6, with port */
      { input: '[-]:8080', expected: { hostname: '', port: null } },
      /* Illegal IPv6, without port */
      { input: '[-]', expected: { hostname: '', port: null } },
      /* Dangling bracket */
      { input: '[', expected: { hostname: '', port: null } },
      /* Dangling bracket */
      { input: ']', expected: { hostname: '', port: null } },
      /* Dangling colon */
      { input: ':', expected: { hostname: '', port: null } }
    ]

    for (const test of tests) {
      const res = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { host: test.input }
      })
      const data = res.json()
      t.equal(data.hostname, test.expected.hostname)
      t.equal(data.port, test.expected.port)
    }
  })

  /* Hostname Tests */
  await t.test('should parse regular hostnames correctly', async (t) => {
    const testHostnames = [
      /* TLD */
      ['localhost', true],
      /* Domain */
      ['example.com', true],
      /* Subdomain */
      ['sub.example.com', true],
      /* Nested subdomain */
      ['nested.sub.example.com', true],
      /* Illegal (":" could cause confusion with port) */
      ['sub:example.com', false]
    ]

    const tests = []

    for (const [testHostname, valid] of testHostnames) {
      const expectHostname = valid ? testHostname : ''
      const expectPort = (p) => valid ? p : null

      tests.push(
        /* With port */
        { input: `${testHostname}:8080`, expected: { hostname: expectHostname, port: expectPort(8080) } },
        /* Without port */
        { input: testHostname, expected: { hostname: expectHostname, port: null } },
        /* Trailing white space, with port */
        { input: `${testHostname}:8080 `, expected: { hostname: '', port: null } },
        /* Trailing white space, without port */
        { input: `${testHostname} `, expected: { hostname: '', port: null } },
        /* With multiple port definitions */
        { input: `${testHostname}:8080:8081`, expected: { hostname: '', port: null } },
        /* With multiple port separators */
        { input: `${testHostname}::8080`, expected: { hostname: '', port: null } },
        /* Port separator without port */
        { input: `${testHostname}:`, expected: { hostname: '', port: null } },
        /* Illegal port */
        { input: `${testHostname}:abc`, expected: { hostname: '', port: null } },
        /* Max port */
        { input: `${testHostname}:65535`, expected: { hostname: expectHostname, port: expectPort(65535) } },
        /* Exceed max port */
        { input: `${testHostname}:65536`, expected: { hostname: '', port: null } }
      )
    }

    for (const test of tests) {
      const res = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { host: test.input }
      })
      const data = res.json()
      t.equal(data.hostname, test.expected.hostname)
      t.equal(data.port, test.expected.port)
    }
  })

  /* Edge cases */
  await t.test('should handle edge cases', async (t) => {
    const tests = [
      /* No hostname */
      { input: ':8080', expected: { hostname: '', port: null } },
      /* No hostname, multiple port separators */
      { input: '::::8080', expected: { hostname: '', port: null } }
    ]

    for (const test of tests) {
      const res = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { host: test.input }
      })
      const data = res.json()
      t.equal(data.hostname, test.expected.hostname)
      t.equal(data.port, test.expected.port)
    }
  })

  await app.close()
})
