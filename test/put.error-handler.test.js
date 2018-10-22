'use strict'

const t = require('tap')
require('./helper').payloadMethod('put', t, true)
require('./input-validation').payloadMethod('put', t)
