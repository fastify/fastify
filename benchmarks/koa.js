'use string'

var koa = require('koa')
var app = koa()

app.use(function * () {
  this.body = JSON.stringify({ hello: 'world' })
})

app.listen(3000)
