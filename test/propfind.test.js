'use strict'

const t = require('tap')
const test = t.test
const fastify = require('..')()

const multistatusXML = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response xmlns:lp1="DAV:">
    <D:href>/</D:href>
    <D:propstat>
      <D:prop>
        <lp1:resourcetype>
          <D:collection/>
        </lp1:resourcetype>
        <lp1:creationdate>2022-04-13T12:35:30Z</lp1:creationdate>
        <lp1:getlastmodified>Wed, 13 Apr 2022 12:35:30 GMT</lp1:getlastmodified>
        <lp1:getetag>"e0-5dc8869b53ef1"</lp1:getetag>
        <D:supportedlock>
          <D:lockentry>
            <D:lockscope>
              <D:exclusive/>
            </D:lockscope>
            <D:locktype>
              <D:write/>
            </D:locktype>
          </D:lockentry>
          <D:lockentry>
            <D:lockscope>
              <D:shared/>
            </D:lockscope>
            <D:locktype>
              <D:write/>
            </D:locktype>
          </D:lockentry>
        </D:supportedlock>
        <D:lockdiscovery/>
        <D:getcontenttype>httpd/unix-directory</D:getcontenttype>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`

test('shorthand - propfind', t => {
  t.plan(1)
  try {
    fastify.propfind('/*', function (req, reply) {
      reply.code(207).send(multistatusXML)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})
