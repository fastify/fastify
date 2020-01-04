'use strict'

const t = require('tap')
const test = t.test
const semver = require('semver')
const sget = require('simple-get').concat
const stream = require('stream')
const Fastify = require('..')
const fp = require('fastify-plugin')
const fs = require('fs')
const split = require('split2')
const symbols = require('../lib/symbols.js')

const aSchema = {
  $id: 'urn:schema:foo',
  definitions: {
    foo: { type: 'string' }
  },
  type: 'object',
  properties: {
    foo: { $ref: '#/definitions/foo' }
  }
}

test('onRegister hook should be called / 1', t => {
  const fastify = Fastify()


  fastify.all('/', {
    schema: aSchema
  })

  fastify.ready((err)=>{
    console.log(err);
    t.end('wow')
  })



})
