'use string'

var Koa = require('koa')
var app = new Koa()

app.use(function * () {
  this.body = JSON.stringify({ hello: 'world' })
})

app.listen(3000)
