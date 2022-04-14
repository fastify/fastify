'use strict'

const fastify = require('../fastify')({
  logger: false
})

const xml = `<?xml version="1.0" encoding="utf-8"?>
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

const lockResponseXML = `<?xml version="1.0" encoding="utf-8"?>
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
      <ns0:owner xmlns:ns0="DAV:">
        <ns0:href>https://github.com/perry-mitchell/webdav-client/blob/master/LOCK_CONTACT.md</ns0:href>
      </ns0:owner>
      <D:timeout>Infinite</D:timeout>
      <D:locktoken>
        <D:href>opaquelocktoken:3a790721-a42e-45fe-a8b2-0dbf9c73f0a3</D:href>
      </D:locktoken>
    </D:activelock>

  </D:lockdiscovery>
</D:prop>`

// fastify.register(require('fastify-cors'), { methods: ['PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK'] })

fastify
  .propfind('/*', function (req, reply) {
    reply
      .send(xml)
  })

fastify
  .proppatch('/*', function (req, reply) {
    reply
      .send('ok')
  })

fastify
  .mkcol('/*', function (req, reply) {
    reply
      .code(201)
      .send('ok')
  })

fastify
  .copy('/*', function (req, reply) {
    console.log(req.headers.destination)
    reply
      .code(201)
      .send('ok')
  })

fastify
  .move('/*', function (req, reply) {
    console.log(req.headers.destination)
    reply
      .code(201)
      .send('ok')
  })

fastify
  .lock('/*', function (req, reply) {
    reply
      .send(lockResponseXML)
  })

fastify
  .unlock('/*', function (req, reply) {
    console.log(req.headers['lock-token'])
    reply
      .send('ok')
  })

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    throw err
  }
})
