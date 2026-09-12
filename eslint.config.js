'use strict'
const neostandard = require('neostandard')

module.exports = [
  ...neostandard({
    ignores: [
      'lib/config-validator.js',
      'lib/error-serializer.js',
      'test/same-shape.test.js'
    ],
    ts: true
  }),
  {
    rules: {
      // Prefer @stylistic over legacy core rule names (neostandard uses @stylistic/*)
      'comma-dangle': 'off',
      '@stylistic/comma-dangle': ['error', 'never'],

      'max-len': 'off',
      '@stylistic/max-len': ['error', {
        code: 120,
        tabWidth: 2,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        ignoreComments: true,
        ignoreTrailingComments: true
      }],

      '@stylistic/indent-binary-ops': ['error', 2],

      // TypeScript spacing / member delimiters (match existing semicolon style)
      '@stylistic/type-annotation-spacing': 'error',
      '@stylistic/type-generic-spacing': 'error',
      '@stylistic/type-named-tuple-spacing': 'error',
      '@stylistic/member-delimiter-style': ['error', {
        multiline: { delimiter: 'semi', requireLast: true },
        singleline: { delimiter: 'semi', requireLast: false }
      }],

      // Layout consistency — both variants previously passed lint
      '@stylistic/function-call-argument-newline': ['error', 'consistent'],
      '@stylistic/function-paren-newline': ['error', 'consistent'],
      '@stylistic/array-bracket-newline': ['error', 'consistent'],
      '@stylistic/array-element-newline': ['error', 'consistent']
    }
  },
  {
    files: ['test/types/**/*'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off'
    }
  }
]
