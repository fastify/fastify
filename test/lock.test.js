'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')()

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
    t.pass()
  } catch (e) {
    t.fail()
  }
})

fastify.listen({ port: 0 }, err => {
  t.error(err)
  t.teardown(() => { fastify.close() })

  test('request - lock', t => {
    t.plan(3)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test/a.txt`,
      body: `<?xml version="1.0" encoding="utf-8" ?>
        <D:lockinfo xmlns:D='DAV:'>
          <D:lockscope> <D:exclusive/> </D:lockscope>
          <D:locktype> <D:write/> </D:locktype>
          <D:owner>
            <D:href>http://example.org/~ejw/contact.html</D:href>
          </D:owner>
        </D:lockinfo> `,
      method: 'LOCK'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
    })
  })
})
