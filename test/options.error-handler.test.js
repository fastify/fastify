'use strict'

const t = require('tap')
require('./helper').payloadMethod('options', t, true)
require('./input-validation').payloadMethod('options', t)
