'use strict'

module.exports = require('neostandard')({
  ignores: [
    'lib/configValidator.js',
    'lib/error-serializer.js',
    'test/same-shape.test.js',
    'test/types/import.js'
  ],
  ts: true
})
