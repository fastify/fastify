'use strict'

var express = require('express')
var app = express()

app.use(require('cors')())
app.use(require('dns-prefetch-control')())
app.use(require('frameguard')())
app.use(require('hide-powered-by')())
app.use(require('hsts')())
app.use(require('ienoopen')())
app.use(require('x-xss-protection')())

app.get('/', function (req, res) {
  res.send({ hello: 'world' })
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
