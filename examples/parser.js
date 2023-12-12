'use strict'

const fastify = require('../fastify')({ logger: true })
const jsonParser = require('fast-json-body')
const querystring = require('node:querystring')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const busboy = require('busboy');


// Handled by fastify
// curl -X POST -d '{"hello":"world"}' -H'Content-type: application/json' http://localhost:3000/

// curl -X POST -d '{"hello":"world"}' -H'Content-type: application/jsoff' http://localhost:3000/
fastify.addContentTypeParser('application/jsoff', function (request, payload, done) {
  jsonParser(payload, function (err, body) {
    done(err, body)
  })
})

// curl -X POST -d 'hello=world' -H'Content-type: application/x-www-form-urlencoded' http://localhost:3000/
fastify.addContentTypeParser('application/x-www-form-urlencoded', function (request, payload, done) {
  let body = ''
  payload.on('data', function (data) {
    body += data.toString();
  })
  payload.on('end', function () {
    try {
      const parsed = querystring.parse(body)
      done(null, parsed)
    } catch (e) {
      done(e)
    }
  })
  payload.on('error', done)
})

// curl -X POST -F 'field1=value1' -F 'field2=value2' -F 'file=@/path/to/your/file' -H'Content-type: multipart/form-data' http://localhost:3000/
// curl -X POST -F 'username=xxx' -F 'bio=xxxxxx' -F 'file_img=@/home/user/img.jpg' -H'Content-type: multipart/form-data' http://localhost:3000/
fastify.addContentTypeParser('multipart/form-data', (request, payload, done) => {
  const data = {};
  const bb = busboy({ headers: request.headers });

  bb.on('file', (fieldname, file, filename, encoding, mimetype) => {
    console.log(`File [${fieldname}]: filename: ${filename}, encoding: ${encoding}, mimetype: ${mimetype}`);
    const saveTo = path.join(os.tmpdir(), path.basename(filename));
    file.pipe(fs.createWriteStream(saveTo));
    data[fieldname] = {
      filename,
      encoding,
      mimetype,
      savedTo: saveTo
    };
  });

  bb.on('field', (fieldname, val) => {
    console.log(`Field [${fieldname}]: value: ${val}`);
    data[fieldname] = val;
  });

  bb.on('finish', () => {
    done(null, data);
  });

  bb.on('error', error => done(error));

  payload.pipe(bb);
});

// curl -X POST -d '{"hello":"world"}' -H'Content-type: application/vnd.custom+json' http://localhost:3000/
fastify.addContentTypeParser(/^application\/.+\+json$/, { parseAs: 'string' }, fastify.getDefaultJsonParser('error', 'ignore'))

// remove default json parser
// curl -X POST -d '{"hello":"world"}' -H'Content-type: application/json' http://localhost:3000/ is now no longer handled by fastify
fastify.removeContentTypeParser('application/json')

// This call would remove any content type parser
// fastify.removeAllContentTypeParsers()

fastify
  .post('/', function (req, reply) {
    reply.send(req.body)
  })

fastify.listen({ port: 3000 }, err => {
  if (err) {
    throw err
  }
})
