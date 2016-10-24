'use strict'

const t = require('tap')
require('./helper').payloadMethod('patch', t)
require('./input-validation').payloadMethod('patch', t)
