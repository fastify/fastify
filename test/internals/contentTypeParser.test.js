'use strict'

const t = require('tap')
const test = t.test
const { Readable } = require('stream')
const internals = require('../../lib/contentTypeParser')[Symbol.for('internals')]
const Request = require('../../lib/request')
const Reply = require('../../lib/reply')

test('rawBody function', t => {
  t.plan(1)
  const body = Buffer.from('你好 世界')
  const parser = {
    asString: true,
    asBuffer: false,
    fn (req, bodyInString) {
      t.equal(bodyInString, body.toString())
    }
  }
  const res = {}
  res.end = () => {}
  res.writeHead = () => {}

  res.log = { error: () => {}, info: () => {} }
  const context = {
    Reply: Reply,
    Request: Request,
    preHandler: [],
    onSend: [],
    _parserOptions: {
      limit: 1024
    }
  }
  const rs = new Readable()
  rs._read = function () {}
  rs.headers = { 'content-length': body.length }
  const request = new Request('params', rs, 'query', { 'content-length': body.length }, 'log')
  const reply = new Reply(res, context, {})
  internals.rawBody(
    request,
    reply,
    reply.context._parserOptions,
    parser
  )
  rs.emit('data', body.toString())
  rs.emit('end')
})
