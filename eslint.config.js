'use strict'

const neo = require('neostandard')

module.exports = [
  {
    ignores: [
      'lib/configValidator.js',
      'lib/error-serializer.js',
      'test/same-shape.test.js'
    ]
  },
  ...neo({
    ts: true
  }),
  {
    rules: {
      '@stylistic/comma-dangle': ['error', {
        arrays: 'never',
        objects: 'never',
        imports: 'never',
        exports: 'never',
        functions: 'never'
      }]
    }
  }
]
