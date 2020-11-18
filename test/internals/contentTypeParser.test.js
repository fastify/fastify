'use strict'

const t = require('tap')
const test = t.test
const { Readable } = require('stream')
const { kTestInternals } = require('../../lib/symbols')
const internals = require('../../lib/contentTypeParser')[kTestInternals]
const Request = require('../../lib/request')
const Reply = require('../../lib/reply')

test('rawBody function', t => {
  t.plan(2)
  const body = Buffer.from('你好 世界')
  const parser = {
    asString: true,
    asBuffer: false,
    fn (req, bodyInString, done) {
      t.equal(bodyInString, body.toString())
      t.is(typeof done, 'function')
      return {
        then (cb) {
          cb()
        }
      }
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
  const request = new Request('id', 'params', rs, 'query', 'log', context)
  const reply = new Reply(res, request)
  const done = () => {}

  internals.rawBody(
    request,
    reply,
    reply.context._parserOptions,
    parser,
    done
  )
  rs.emit('data', body.toString())
  rs.emit('end')
})
