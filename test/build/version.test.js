'use strict'

const fs = require('fs')
const path = require('path')
const t = require('tap')
const test = t.test
const fastify = require('../../fastify')()

test('should be the same as package.json', t => {
  t.plan(1)

  const json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json')).toString('utf8'))

  t.equal(fastify.version, json.version)
})
