'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')()

test('can be created - propfind', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'PROPFIND',
      url: '*',
      handler: function (req, reply) {
        return reply.code(207)
          .send(`<?xml version="1.0" encoding="utf-8"?>
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

  test('request - propfind', t => {
    t.plan(3)
    sget({
      url: `http://localhost:${fastify.server.address().port}/`,
      method: 'PROPFIND'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 207)
      t.equal(response.headers['content-length'], '' + body.length)
    })
  })

  test('request with other path - propfind', t => {
    t.plan(3)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test`,
      method: 'PROPFIND'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 207)
      t.equal(response.headers['content-length'], '' + body.length)
    })
  })

  test('request with body - propfind', t => {
    t.plan(3)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test`,
      body: `<?xml version="1.0" encoding="utf-8" ?>
        <D:propfind xmlns:D="DAV:">
          <D:prop xmlns:R="http://ns.example.com/boxschema/">
            <R:bigbox/> <R:author/> <R:DingALing/> <R:Random/>
          </D:prop>
        </D:propfind>
      `,
      method: 'PROPFIND'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 207)
      t.equal(response.headers['content-length'], '' + body.length)
    })
  })
})
