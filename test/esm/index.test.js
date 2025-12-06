'use strict'

import('./named-exports.test.mjs')
  .catch(err => {
    process.nextTick(() => {
      throw err
    })
  })
