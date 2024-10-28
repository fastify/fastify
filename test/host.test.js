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
  await t.test('should parse IPv4 addresses correctly', async (t) => {
    const tests = [
      { input: '127.0.0.1', expected: '127.0.0.1', port: null },
      { input: '127.0.0.1:8080', expected: '127.0.0.1', port: 8080 },
      { input: '0.0.0.0', expected: '0.0.0.0', port: null },
      { input: '255.255.255.255:65535', expected: '255.255.255.255', port: 65535 }
    ]

    for (const test of tests) {
      const res = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { host: test.input }
      })
      const data = res.json()
      t.equal(data.hostname, test.expected)
      t.equal(data.port, test.port)
    }
  })

  /* IPv6 Tests */
  await t.test('should parse IPv6 addresses correctly', async (t) => {
    const tests = [
      { input: '[::1]', expected: '::1', port: null },
      { input: '[::1] ', expected: '::1', port: null },
      { input: '[::1]:8080', expected: '::1', port: 8080 },
      { input: '[2001:db8::1]', expected: '2001:db8::1', port: null },
      { input: '[2001:db8::1]:8080', expected: '2001:db8::1', port: 8080 },
      { input: '[fe80::1ff:fe23:4567:890a]', expected: 'fe80::1ff:fe23:4567:890a', port: null }
    ]

    for (const test of tests) {
      const res = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { host: test.input }
      })
      const data = res.json()
      t.equal(data.hostname, test.expected)
      t.equal(data.port, test.port)
    }
  })

  /* Malformed IPv6 Tests */
  await t.test('should handle malformed IPv6 addresses', async (t) => {
    const tests = [
      '[::1', // Missing closing bracket
      '[::1]:', // Port separator without port
      '[::1]:abc', // Invalid port
      '[:1]', // Invalid IPv6
      '[]:8080', // Empty IPv6
      '[]' // Empty brackets
    ]

    for (const test of tests) {
      const res = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { host: test }
      })
      const data = res.json()
      if (test.startsWith('[') && !test.includes(']')) {
        t.equal(data.hostname, '')
        t.equal(data.port, null)
      }
    }
  })

  /* Hostname Tests */
  await t.test('should parse regular hostnames correctly', async (t) => {
    const tests = [
      { input: 'localhost', expected: 'localhost', port: null },
      { input: 'example.com', expected: 'example.com', port: null },
      { input: 'sub.example.com', expected: 'sub.example.com', port: null },
      { input: 'example.com:8080', expected: 'example.com', port: 8080 },
      { input: 'hello:world:8080', expected: 'hello', port: 8080 }
    ]

    for (const test of tests) {
      const res = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { host: test.input }
      })
      const data = res.json()
      t.equal(data.hostname, test.expected)
      t.equal(data.port, test.port)
    }
  })

  /* Edge cases */
  await t.test('should handle edge cases for port', async (t) => {
    const tests = [
      { input: ':8080', expected: null },
      { input: '::::8080', expected: null },
      { input: '[::]::8080', expected: null },
      { input: '[::]:8080:8080', expected: 8080 },
      { input: 'example.com:8080:8081', expected: 8081 },
      { input: '[', expected: null },
      { input: ']', expected: null },
      { input: ':', expected: null },
      { input: 'example.com:65535', expected: 65535 },
      { input: 'example.com:65536', expected: null }
    ]

    for (const test of tests) {
      const res = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { host: test.input }
      })
      const data = res.json()
      t.equal(data.port, test.expected)
    }
  })

  await app.close()
})
