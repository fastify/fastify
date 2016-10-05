'use strict'

const t = require('tap')
const http = require('http')
const beo = require('..')()
const server = http.createServer(beo)

t.plan(2)

const schema = {
  out: {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    }
  }
}

beo.get('/', schema, function (req, reply) {
  reply(null, { hello: 'world' })
})

server.listen(0, function (err) {
  t.error(err)

  const req = http.get(server.address(), function (res) {
    let result = ''
    res.setEncoding('utf8')
    res.on('data', function (chunk) {
      result += chunk
    })
    res.on('end', function () {
      t.deepEqual(JSON.parse(result), {
        hello: 'world'
      })
      server.unref()
    })
  })

  setTimeout(() => {
    t.fail('no response')
    req.destroy()
    server.close()
  }, 500).unref()
})
