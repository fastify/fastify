'use strict'

function ContentTypeParser () {
  this.customParsers = {}
  this.parserList = []
}

ContentTypeParser.prototype.add = function (contentType, fn) {
  if (typeof contentType !== 'string') throw new Error('The content type should be a string')
  if (contentType.length === 0) throw new Error('The content type cannot be an empty string')
  if (typeof fn !== 'function') throw new Error('The content type handler should be a function')

  if (this.hasParser(contentType)) {
    throw new Error(`Content type parser '${contentType}' already present.`)
  }
  if (contentType === '*') {
    this.parserList.push('')
    this.customParsers[''] = fn
  } else {
    this.parserList.unshift(contentType)
    this.customParsers[contentType] = fn
  }
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
