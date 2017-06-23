'use string'

var Koa = require('koa')
var app = new Koa()

app.use(async (ctx) => {
  ctx.body = JSON.stringify({ hello: 'world' })
})

app.listen(3000)
