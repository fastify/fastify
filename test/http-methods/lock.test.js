'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const fastify = require('../../fastify')()
fastify.addHttpMethod('LOCK', { hasBody: true })

const bodySample = `<?xml version="1.0" encoding="utf-8" ?>
        <D:lockinfo xmlns:D='DAV:'>
          <D:lockscope> <D:exclusive/> </D:lockscope>
          <D:locktype> <D:write/> </D:locktype>
          <D:owner>
            <D:href>http://example.org/~ejw/contact.html</D:href>
          </D:owner>
        </D:lockinfo> `

test('can be created - lock', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'LOCK',
      url: '*',
      handler: function (req, reply) {
        reply
          .code(200)
          .send(`<?xml version="1.0" encoding="utf-8" ?>
            <D:prop xmlns:D="DAV:">
              <D:lockdiscovery>
                <D:activelock>
                  <D:locktype>
                    <D:write/>
                  </D:locktype>
                  <D:lockscope>
                    <D:exclusive/>
                  </D:lockscope>
                  <D:depth>infinity</D:depth>
                  <D:owner>
                    <D:href>http://example.org/~ejw/contact.html</D:href>
                  </D:owner>
                  <D:timeout>Second-604800</D:timeout>
                  <D:locktoken>
                    <D:href>urn:uuid:e71d4fae-5dec-22d6-fea5-00a0c91e6be4</:href>
                  </D:locktoken>
                  <D:lockroot>
                    <D:href>http://example.com/workspace/webdav/proposal.oc</D:href>
                  </D:lockroot>
                </D:activelock>
              </D:lockdiscovery>
            </D:prop>`
          )
      }
    })
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('lock test', async t => {
  await fastify.listen({ port: 0 })
  t.after(() => {
    fastify.close()
  })
  // the body test uses a text/plain content type instead of application/xml because it requires
  // a specific content type parser
  await t.test('request with body - lock', (t, done) => {
    t.plan(3)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test/a.txt`,
      headers: { 'content-type': 'text/plain' },
      body: bodySample,
      method: 'LOCK'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      done()
    })
  })

  await t.test('request with body and no content type (415 error) - lock', (t, done) => {
    t.plan(3)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test/a.txt`,
      body: bodySample,
      method: 'LOCK'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 415)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      done()
    })
  })

  await t.test('request without body - lock', (t, done) => {
    t.plan(3)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test/a.txt`,
      headers: { 'content-type': 'text/plain' },
      method: 'LOCK'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      done()
    })
  })
})
