'use strict'

const { test, skip } = require('tap')
const { lookup } = require('node:dns').promises
const Fastify = require('..')
const { connect } = require('node:net')
const { once } = require('node:events')

async function setup () {
  const results = await lookup('localhost', { all: true })
  if (results.length === 1) {
    skip('requires both IPv4 and IPv6')
    return
  }

  test('upgrade to both servers', async t => {
    t.plan(2)
    const app = Fastify()
    app.server.on('upgrade', (req, socket, head) => {
      t.pass(`upgrade event ${JSON.stringify(socket.address())}`)
      socket.end()
    })
    app.get('/', (req, res) => {
    })
    await app.listen()
    t.teardown(app.close.bind(app))

    {
      const client = connect(app.server.address().port, '127.0.0.1')
      client.write('GET / HTTP/1.1\r\n')
      client.write('Upgrade: websocket\r\n')
      client.write('Connection: Upgrade\r\n')
      client.write('Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==\r\n')
      client.write('Sec-WebSocket-Protocol: com.xxx.service.v1\r\n')
      client.write('Sec-WebSocket-Version: 13\r\n\r\n')
      client.write('\r\n\r\n')
      await once(client, 'close')
    }

    {
      const client = connect(app.server.address().port, '::1')
      client.write('GET / HTTP/1.1\r\n')
      client.write('Upgrade: websocket\r\n')
      client.write('Connection: Upgrade\r\n')
      client.write('Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==\r\n')
      client.write('Sec-WebSocket-Protocol: com.xxx.service.v1\r\n')
      client.write('Sec-WebSocket-Version: 13\r\n\r\n')
      await once(client, 'close')
    }
  })
}

setup()
