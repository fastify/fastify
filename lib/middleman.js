'use strict'

const reusify = require('reusify')

function middleman (complete) {
  var func
  var pool = reusify(Holder)

  return {
    use,
    run
  }

  function use (f) {
    func = f
    return this
  }

  function run (req, res) {
    if (!func) {
      complete(null, req, res)
      return
    }

    const holder = pool.get()
    holder.req = req
    holder.res = res

    func(req, res, holder.done)
  }

  function Holder () {
    this.next = null
    this.req = null
    this.res = null

    var that = this
    this.done = function (err) {
      const req = that.req
      const res = that.res

      complete(err, req, res)
      that.req = null
      that.res = null
      pool.release(that)
    }
  }
}

module.exports = middleman
