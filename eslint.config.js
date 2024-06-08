'use strict'

const neo = require('neostandard')

module.exports = [
  ...neo({
    ts: true,
    ignores: [
      'lib/configValidator.js',
      'lib/error-serializer.js',
      'test/same-shape.test.js',
    ],
  }),
  {
    ignores: [
      'lib/configValidator.js',
      'lib/error-serializer.js',
      'test/same-shape.test.js',
    ],
    rules: {
      '@stylistic/comma-dangle': ['error', {
        arrays: 'never',
        objects: 'never',
        imports: 'never',
        exports: 'never',
        functions: 'never',
      }],
    }
  },
]
