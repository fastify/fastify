'use strict'

var Koa = require('koa')
var _ = require('koa-route')
var app = new Koa()

app.use(_.get('/', async (ctx) => {
  ctx.body = JSON.stringify({ hello: 'world' })
}))

app.listen(3000)
