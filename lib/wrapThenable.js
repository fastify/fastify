'use strict'
const { kReplyIsError } = require('./symbols')

function wrapThenable (thenable, reply) {
  thenable.then(function (payload) {
    // this is for async functions that
    // are using reply.send directly
    if (payload !== undefined || (reply.res.statusCode === 204 && reply.sent === false)) {
      // we use a try-catch internally to avoid adding a catch to another
      // promise, increase promise perf by 10%
      try {
        reply.send(payload)
      } catch (err) {
        reply.sent = false
        reply[kReplyIsError] = true
        reply.send(err)
      }
    } else if (reply.sent === false) {
      reply.res.log.error({ err: new Error(`Promise may not be fulfilled with 'undefined' when statusCode is not 204`) }, `Promise may not be fulfilled with 'undefined' when statusCode is not 204`)
    }
  }, function (err) {
    reply.sent = false
    reply[kReplyIsError] = true
    reply.send(err)
  })
}

module.exports = wrapThenable
