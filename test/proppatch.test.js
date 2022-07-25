'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')()

test('shorthand - proppatch', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'PROPPATCH',
      url: '*',
      handler: function (req, reply) {
        reply
          .code(207)
          .send(`<?xml version="1.0" encoding="utf-8" ?>
            <D:multistatus xmlns:D="DAV:"
              xmlns:Z="http://ns.example.com/standards/z39.50/">
              <D:response>
                <D:href>http://www.example.com/bar.html</D:href>
                <D:propstat>
                  <D:prop>
                    <Z:Authors/>
                  </D:prop>
                  <D:status>HTTP/1.1 424 Failed Dependency</D:status>
                </D:propstat>
                <D:propstat>
                  <D:prop>
                    <Z:Copyright-Owner/>
                  </D:prop>
                  <D:status>HTTP/1.1 409 Conflict</D:status>
                </D:propstat>
                <D:responsedescription> Copyright Owner cannot be deleted or altered.</D:responsedescription>
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

  test('request - proppatch', t => {
    t.plan(3)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test/a.txt`,
      body: `<?xml version="1.0" encoding="utf-8" ?>
        <D:propertyupdate xmlns:D="DAV:"
          xmlns:Z="http://ns.example.com/standards/z39.50/">
          <D:set>
            <D:prop>
              <Z:Authors>
                <Z:Author>Jim Whitehead</Z:Author>
                <Z:Author>Roy Fielding</Z:Author>
              </Z:Authors>
            </D:prop>
          </D:set>
          <D:remove>
            <D:prop>
              <Z:Copyright-Owner/>
            </D:prop>
          </D:remove>
        </D:propertyupdate>`,
      method: 'PROPPATCH'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 207)
      t.equal(response.headers['content-length'], '' + body.length)
    })
  })
})
