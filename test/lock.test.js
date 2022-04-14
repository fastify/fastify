'use strict'

const t = require('tap')
const test = t.test
const fastify = require('..')()

const lockdiscoveryXML = `<?xml version="1.0" encoding="utf-8" ?>
<D:prop xmlns:D="DAV:">
  <D:lockdiscovery>
    <D:activelock>
      <D:locktype><D:write/></D:locktype>
      <D:lockscope><D:exclusive/></D:lockscope>
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

test('shorthand - lock', t => {
  t.plan(1)
  try {
    fastify.lock('/*', function (req, reply) {
      reply.code(200).send(lockdiscoveryXML)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})
