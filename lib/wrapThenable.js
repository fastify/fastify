'use strict'

const {
  kReplyIsError,
  kReplyHijacked
} = require('./symbols')

function wrapThenable (thenable, reply) {
  thenable.then(function (payload) {
    if (reply[kReplyHijacked] === true) {
      return
    }

    // this is for async functions that are using reply.send directly
    //
    // since wrap-thenable will be called when using reply.send directly
    // without actual return. the response can be sent already or
    // the request may be terminated during the reply. in this situation,
    // it require an extra checking of request.aborted to see whether
    // the request is killed by client.
    if (payload !== undefined || (reply.sent === false && reply.raw.headersSent === false && reply.request.raw.aborted === false)) {
      // we use a try-catch internally to avoid adding a catch to another
      // promise, increase promise perf by 10%
      try {
        reply.send(payload)
      } catch (err) {
        reply[kReplyIsError] = true
        reply.send(err)
      }
    }
  }, function (err) {
    if (reply.sent === true) {
      reply.log.error({ err }, 'Promise errored, but reply.sent = true was set')
      return
    }

    reply[kReplyIsError] = true
    reply.send(err)
  })
}

module.exports = wrapThenable
