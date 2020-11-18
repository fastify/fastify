'use strict'

const t = require('tap')
require('./helper').payloadMethod('patch', t, true)
require('./input-validation').payloadMethod('patch', t)
