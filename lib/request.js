'use strict'

function Request (params, req, body, query, log) {
  this.params = params
  this.req = req
  this.body = body
  this.query = query
  this.log = log
}

module.exports = Request
