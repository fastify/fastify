'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('../fastify')()

const bodySample = `<?xml version="1.0" encoding="UTF-8"?>
  <B:calendar-query xmlns:B="urn:ietf:params:xml:ns:caldav">
    <A:prop xmlns:A="DAV:">
      <A:getetag/>
      <A:getcontenttype/>
    </A:prop>
    <B:filter>
      <B:comp-filter name="VCALENDAR">
        <B:comp-filter name="VEVENT">
          <B:time-range start="20170215T000000Z"/>
        </B:comp-filter>
      </B:comp-filter>
    </B:filter>
  </B:calendar-query>
  `

test('can be created - report', (t) => {
  t.plan(1)
  try {
    fastify.route({
      method: 'REPORT',
      url: '*',
      handler: function (req, reply) {
        return reply.code(207).send(`<?xml version="1.0" encoding="utf-8"?>
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
            </D:multistatus>`)
      },
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

fastify.listen({ port: 0 }, (err) => {
  t.error(err)
  t.teardown(() => {
    fastify.close()
  })

  test('request - report', (t) => {
    t.plan(3)
    sget(
      {
        url: `http://localhost:${fastify.server.address().port}/`,
        method: 'REPORT',
      },
      (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 207)
        t.equal(response.headers['content-length'], '' + body.length)
      }
    )
  })

  test('request with other path - report', (t) => {
    t.plan(3)
    sget(
      {
        url: `http://localhost:${fastify.server.address().port}/test`,
        method: 'REPORT',
      },
      (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 207)
        t.equal(response.headers['content-length'], '' + body.length)
      }
    )
  })

  // the body test uses a text/plain content type instead of application/xml because it requires
  // a specific content type parser
  test('request with body - report', (t) => {
    t.plan(3)
    sget(
      {
        url: `http://localhost:${fastify.server.address().port}/test`,
        headers: { 'content-type': 'text/plain' },
        body: bodySample,
        method: 'REPORT',
      },
      (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 207)
        t.equal(response.headers['content-length'], '' + body.length)
      }
    )
  })

  test('request with body and no content type (415 error) - report', (t) => {
    t.plan(3)
    sget(
      {
        url: `http://localhost:${fastify.server.address().port}/test`,
        body: bodySample,
        method: 'REPORT',
      },
      (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 415)
        t.equal(response.headers['content-length'], '' + body.length)
      }
    )
  })

  test('request without body - report', (t) => {
    t.plan(3)
    sget(
      {
        url: `http://localhost:${fastify.server.address().port}/test`,
        method: 'REPORT',
      },
      (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 207)
        t.equal(response.headers['content-length'], '' + body.length)
      }
    )
  })
})
