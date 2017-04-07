'use strict'

const multipart = require('multipart-read-stream')
const pump = require('pump')

function Request (params, req, body, query, log) {
  this.params = params
  this.req = req
  this.body = body
  this.query = query
  this.log = log
}

Request.prototype.multipart = function (handler, done) {
  if (typeof handler !== 'function') {
    throw new Error('handler must be a function')
  }

  if (typeof done !== 'function') {
    throw new Error('the callback must be a function')
  }

  const req = this.req

  const stream = multipart(req.headers, handler)

  pump(req, stream, done)
}

module.exports = Request
