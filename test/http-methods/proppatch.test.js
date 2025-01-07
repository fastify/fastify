'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const fastify = require('../../')()
fastify.addHttpMethod('PROPPATCH', { hasBody: true })

const bodySample = `<?xml version="1.0" encoding="utf-8" ?>
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
        </D:propertyupdate>`

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
    t.assert.ok(true)
  } catch (e) {
    t.assert.fail()
  }
})

test('proppatch test', async t => {
  await fastify.listen({ port: 0 })

  t.after(() => { fastify.close() })
  // the body test uses a text/plain content type instead of application/xml because it requires
  // a specific content type parser
  await t.test('request with body - proppatch', (t, done) => {
    t.plan(3)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test/a.txt`,
      headers: { 'content-type': 'text/plain' },
      body: bodySample,
      method: 'PROPPATCH'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 207)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      done()
    })
  })

  await t.test('request with body and no content type (415 error) - proppatch', (t, done) => {
    t.plan(3)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test/a.txt`,
      body: bodySample,
      method: 'PROPPATCH'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 415)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      done()
    })
  })

  await t.test('request without body - proppatch', (t, done) => {
    t.plan(3)
    sget({
      url: `http://localhost:${fastify.server.address().port}/test/a.txt`,
      method: 'PROPPATCH'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 207)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      done()
    })
  })
})
