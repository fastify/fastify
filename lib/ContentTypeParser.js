'use strict'

function ContentTypeParser () {
  this.customParsers = {}
  this.parserList = []
}

ContentTypeParser.prototype.add = function (contentType, fn) {
  if (this.hasParser(contentType)) {
    throw new Error(`Content type parser '${contentType}' already present.`)
  }
  this.customParsers[contentType] = fn
  this.parserList.push(contentType)
}

ContentTypeParser.prototype.hasParser = function (contentType) {
  return contentType in this.customParsers
}

ContentTypeParser.prototype.fastHasHeader = function (contentType) {
  if (!contentType) return false

  for (var i = 0; i < this.parserList.length; i++) {
    if (contentType.indexOf(this.parserList[i]) > -1) return true
  }
  return false
}

ContentTypeParser.prototype.getHandler = function (contentType) {
  for (var i = 0; i < this.parserList.length; i++) {
    if (contentType.indexOf(this.parserList[i]) > -1) {
      return this.customParsers[this.parserList[i]]
    }
  }
}

ContentTypeParser.prototype.run = function (contentType, handler, handle, params, req, res, query) {
  this.getHandler(contentType)(req, done)

  function done (body) {
    if (body instanceof Error) {
      const reply = new handle.Reply(req, res, handle)
      return reply.send(body)
    }
    handler(handle, params, req, res, body, query)
  }
}

function buildContentTypeParser (c) {
  function _ContentTypeParser () {}
  _ContentTypeParser.prototype = new ContentTypeParser()
  const C = new _ContentTypeParser()
  C.customParsers = Object.create(c.customParsers)
  C.parserList = Object.create(c.parserList)
  return C
}

module.exports = ContentTypeParser
module.exports.buildContentTypeParser = buildContentTypeParser
