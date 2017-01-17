'use strict'

const reusify = require('reusify')

function middleman (complete) {
  var functions = []
  var hasMiddlewares = false
  var pool = reusify(Holder)

  return {
    use,
    run
  }

  function use (f) {
    hasMiddlewares = true
    functions.push(f)
    return this
  }

  function run (req, res) {
    if (!hasMiddlewares) {
      complete(null, req, res)
      return
    }

    const holder = pool.get()
    holder.req = req
    holder.res = res
    holder.done()
  }

  function Holder () {
    this.next = null
    this.req = null
    this.res = null
    this.i = 0

    var that = this
    this.done = function (err) {
      const req = that.req
      const res = that.res
      const i = that.i++

      if (err || functions.length === i) {
        complete(err, req, res)
        that.req = null
        that.res = null
        that.i = 0
        pool.release(that)
      } else {
        functions[i](req, res, that.done)
      }
    }
  }
}

module.exports = middleman
