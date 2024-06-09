'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('../fastify')()

const bodySample = `<?xml version="1.0" encoding="UTF-8"?>
  <B:mkcalendar xmlns:B="urn:ietf:params:xml:ns:caldav">
    <A:set xmlns:A="DAV:">
      <A:prop>
        <B:calendar-free-busy-set>
          <NO/>
        </B:calendar-free-busy-set>
        <E:calendar-order xmlns:E="http://apple.com/ns/ical/">0</E:calendar-order>
        <B:supported-calendar-component-set>
          <B:comp name="VEVENT"/>
        </B:supported-calendar-component-set>
        <A:displayname>CALENDAR_NAME</A:displayname>
        <B:calendar-timezone>BEGIN:VCALENDAR&#13;
          VERSION:2.0&#13;
        </B:calendar-timezone>
      </A:prop>
    </A:set>
  </B:mkcalendar>
  `

test('can be created - mkcalendar', (t) => {
  t.plan(1)
  try {
    fastify.route({
      method: 'MKCALENDAR',
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
      }
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

  test('request - mkcalendar', (t) => {
    t.plan(3)
    sget(
      {
        url: `http://localhost:${fastify.server.address().port}/`,
        method: 'MKCALENDAR'
      },
      (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 207)
        t.equal(response.headers['content-length'], '' + body.length)
      }
    )
  })

  test('request with other path - mkcalendar', (t) => {
    t.plan(3)
    sget(
      {
        url: `http://localhost:${fastify.server.address().port}/test`,
        method: 'MKCALENDAR'
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
  test('request with body - mkcalendar', (t) => {
    t.plan(3)
    sget(
      {
        url: `http://localhost:${fastify.server.address().port}/test`,
        headers: { 'content-type': 'text/plain' },
        body: bodySample,
        method: 'MKCALENDAR'
      },
      (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 207)
        t.equal(response.headers['content-length'], '' + body.length)
      }
    )
  })

  test('request with body and no content type (415 error) - mkcalendar', (t) => {
    t.plan(3)
    sget(
      {
        url: `http://localhost:${fastify.server.address().port}/test`,
        body: bodySample,
        method: 'MKCALENDAR'
      },
      (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 415)
        t.equal(response.headers['content-length'], '' + body.length)
      }
    )
  })

  test('request without body - mkcalendar', (t) => {
    t.plan(3)
    sget(
      {
        url: `http://localhost:${fastify.server.address().port}/test`,
        method: 'MKCALENDAR'
      },
      (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 207)
        t.equal(response.headers['content-length'], '' + body.length)
      }
    )
  })
})
