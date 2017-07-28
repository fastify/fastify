'use strict'

var Koa = require('koa')
var router = require('koa-router')()
var app = new Koa()

router.get('/', async (ctx) => {
  ctx.body = JSON.stringify({ hello: 'world' })
})

app
  .use(router.routes())

app.listen(3000)
