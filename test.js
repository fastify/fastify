const Fastify = require('./fastify')
const { kDecoratorsAccessedCache } = require('./lib/symbols')

async function start () {
  const app = Fastify()

  let spyChild
  app.decorate('foo', function () {
    console.log(this === spyChild)
  })

  app.register(function (child) {
    spyChild = child
    child.foo()

    child.decorateRequest('x', true)
    child.get('/child/hello', function (req, res) {
      console.log(res.getDecorator)
      console.log(req.getDecorator('x'))
      return {
        hello: 'world'
      }
    })
  })

  app.decorateReply('x', function () {
    this.header('set-header', 'bar')
  })

  app.get('/hello', function (req, res) {
    console.log(req[kDecoratorsAccessedCache])
    console.log(res[kDecoratorsAccessedCache])
    res.getDecorator('x')
    res.getDecorator('x')

    console.log(req[kDecoratorsAccessedCache])
    console.log(res[kDecoratorsAccessedCache])
    return {
      hello: 'world'
    }
  })

  await app.ready()

  const res = await app.inject({
    path: '/hello'
  })
  console.log('res.statusCode', res.headers)

  await app.inject({
    path: '/child/hello'
  })
}

start()
