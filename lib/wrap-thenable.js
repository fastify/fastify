'use strict'

const {
  kReplyIsError,
  kReplyHijacked,
  kReplySendCalled,
  kLogController
} = require('./symbols')
const { setErrorStatusCode } = require('./error-status')
const { FST_ERR_REP_ALREADY_SENT } = require('./errors')

const diagnostics = require('node:diagnostics_channel')
const channels = diagnostics.tracingChannel('fastify.request.handler')

function wrapThenable (thenable, reply, store) {
  if (store) store.async = true
  thenable.then(function (payload) {
    if (reply[kReplyHijacked] === true) {
      return
    }

    if (store) {
      channels.asyncStart.publish(store)
    }

    try {
      // reply.send() was already called by the handler: the response is already
      // on its way (possibly delayed by an async hook, including an async
      // onError hook), so sending again would run the hooks twice or throw.
      // Warn when the send is still in progress or the handler returned a payload.
      if (reply[kReplySendCalled] === true) {
        if (payload !== undefined || reply.sent === false) {
          reply.server[kLogController].replyAlreadySent(
            new FST_ERR_REP_ALREADY_SENT(reply.request.url, reply.request.method),
            reply.request,
            reply
          )
        }
        return
      }

      // this is for async functions that are using reply.send directly
      //
      // since wrap-thenable will be called when using reply.send directly
      // without actual return. the response can be sent already or
      // the request may be terminated during the reply. in this situation,
      // it require an extra checking of request.aborted to see whether
      // the request is killed by client.
      if (payload !== undefined || //
        (reply[kReplySendCalled] === false && //
          reply.sent === false && //
          reply.raw.headersSent === false &&
          reply.request.raw.aborted === false &&
          reply.request.socket &&
          !reply.request.socket.destroyed
        )
      ) {
        // we use a try-catch internally to avoid adding a catch to another
        // promise, increase promise perf by 10%
        try {
          reply.send(payload)
        } catch (err) {
          reply[kReplyIsError] = true
          reply.send(err)
        }
      }
    } finally {
      if (store) {
        channels.asyncEnd.publish(store)
      }
    }
  }, function (err) {
    if (store) {
      store.error = err
      // Set status code before publishing so subscribers see the correct value
      setErrorStatusCode(reply, err)
      channels.error.publish(store) // note that error happens before asyncStart
      channels.asyncStart.publish(store)
    }

    try {
      if (reply.sent === true) {
        reply.log.error({ err }, 'Promise errored, but reply.sent = true was set')
        return
      }

      if (reply[kReplySendCalled] === true) {
        reply.server[kLogController].handlerErrorAfterSend(err, reply.request, reply)
        return
      }

      reply[kReplyIsError] = true

      reply.send(err)
      // The following should not happen
      /* c8 ignore next 3 */
    } catch (err) {
      // try-catch allow to re-throw error in error handler for async handler
      reply.send(err)
    } finally {
      if (store) {
        channels.asyncEnd.publish(store)
      }
    }
  })
}

module.exports = wrapThenable
