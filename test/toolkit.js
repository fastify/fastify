'use strict'

exports.waitForCb = function (options) {
  let count = null
  let done = false
  let iResolve
  let iReject

  function stepIn () {
    if (done) {
      iReject(new Error('Unexpected done call'))
      return
    }

    if (--count) {
      return
    }

    done = true
    iResolve()
  }

  const patience = new Promise((resolve, reject) => {
    iResolve = resolve
    iReject = reject
  })

  count = options.steps || 1
  done = false

  return { stepIn, patience }
}
