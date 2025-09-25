'use strict'
const neostandard = require('neostandard')

module.exports = [
  ...neostandard({
    ignores: [
      'lib/config-validator.js',
      'lib/error-serializer.js',
      'test/same-shape.test.js',
      'test/types/import.js'
    ],
    ts: true
  }),
  {
    rules: {
      'comma-dangle': ['error', 'never']
    }
  }
]
