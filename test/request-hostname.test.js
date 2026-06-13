'use strict'

const test = require('node:test')
const Request = require('../lib/request')

test('.hostname parses hostname correctly', (t) => {
  const fixtures = [
    {
      expected: 'example.com',
      req: {
        headers: {
          host: 'example.com:80'
        }
      }
    },
    {
      expected: 'example.com',
      req: {
        headers: {
          host: 'example.com'
        }
      }
    },
    {
      expected: '[::1]',
      req: {
        headers: {
          host: '[::1]:8080'
        }
      }
    },
    {
      expected: '[::1]',
      req: {
        headers: {
          host: '[::1]'
        }
      }
    },
    {
      // bracketed value without a closing bracket: stays consistent with host
      expected: '[::1',
      req: {
        headers: {
          host: '[::1'
        }
      }
    },
    {
      expected: '1.2.3.4',
      req: {
        headers: {
          ':authority': '1.2.3.4:80'
        }
      }
    },
    {
      expected: '',
      req: {
        headers: {}
      }
    }
  ]

  for (const fixture of fixtures) {
    const req = new Request(1, {}, fixture.req, '', {}, {})
    t.assert.equal(
      req.hostname,
      fixture.expected,
      `${fixture.req.headers.host} should parse to ${fixture.expected}`
    )
  }
})
