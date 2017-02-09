'use strict'

var express = require('express')
var cors = require('cors')
var helmet = require('helmet')
var app = express()

app.use(cors())
app.use(helmet())

app.get('/', function (req, res) {
  res.send({ hello: 'world' })
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
