'use strict'

const t = require('tap')
const test = t.test
const fastify = require('..')()

const multistatusXML = `<?xml version="1.0" encoding="utf-8" ?>
<D:multistatus xmlns:D="DAV:" xmlns:Z="http://ns.example.com/standards/z39.50/">
    <D:response>
        <D:href>http://www.example.com/bar.html</D:href>
        <D:propstat>
            <D:prop><Z:Authors/></D:prop>
            <D:status>HTTP/1.1 424 Failed Dependency</D:status>
            </D:propstat>
            <D:propstat>
            <D:prop><Z:Copyright-Owner/></D:prop>
            <D:status>HTTP/1.1 409 Conflict</D:status>
        </D:propstat>
        <D:responsedescription> Copyright Owner cannot be deleted or altered.</D:responsedescription>
    </D:response>
</D:multistatus>`

test('shorthand - proppatch', t => {
  t.plan(1)
  try {
    fastify.proppatch('/*', function (req, reply) {
      reply.code(200).send(multistatusXML)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})
