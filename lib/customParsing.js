'use strict'

function customParsing () {
  const customParsers = {}
  const parserList = []

  function add (contentType, fn) {
    if (check(contentType)) throw new Error(`Content type parser '${contentType}' already present.`)
    customParsers[contentType] = fn
    parserList.push(contentType)
    return this
  }

  function check (contentType) {
    return contentType in customParsers
  }

  function checkHeader (contentType) {
    for (var i = 0; i < parserList.length; i++) {
      if (contentType.indexOf(parserList[i]) > -1) return true
    }
    return false
  }

  function getHandler (contentType) {
    for (var i = 0; i < parserList.length; i++) {
      if (contentType.indexOf(parserList[i]) > -1) return customParsers[parserList[i]]
    }
  }

  function run (contentType, handler, hooks, handle, params, req, res, query) {
    getHandler(contentType)(req, done)

    function done (body) {
      if (body instanceof Error) {
        const reply = new handle.Reply(req, res, handle)
        return reply.send(body)
      }
      handler(hooks, handle, params, req, res, body, query)
    }
  }

  return {
    add: add,
    hasParser: check,
    checkHeader: checkHeader,
    run: run
  }
}

module.exports = customParsing
