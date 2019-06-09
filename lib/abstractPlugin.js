'use strict'

const { kSetInstance } = require('./symbols.js')

module.exports = class AbstractPlugin {
  constructor () {
    this.instance = null
  }

  [kSetInstance] (instance) {
    this.instance = instance
  }
}
