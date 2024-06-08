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
      'test/same-shape.test.js',
    ],
  },
]
