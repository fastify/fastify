'use strict'

const t = require('tap')
require('./helper').payloadMethod('post', t)
require('./input-validation').payloadMethod('post', t)
