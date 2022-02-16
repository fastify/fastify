<h1 align="center">Fastify</h1>

## Database

Fastify ecosystem provides a handful of plugins for connecting to the desired database. We will cover official ones that reside in the Fastify's Github organization.

> If a plugin for your database of choice doesn't exist you can still use the database as Fastify is database agnostic. It's a matter of installing NodeJS database driver and connecting to your database. 

> If you would like to write your own Fastify plugin please take a look at the [plugins guide](./Plugins-Guide.md)

### [MySQL](https://github.com/fastify/fastify-mysql)

Install the plugin by running `npm i fastify-mysql --save`.

*Usage:*

```javascript
const fastify = require('fastify')()

fastify.register(require('fastify-mysql'), {
  connectionString: 'mysql://root@localhost/mysql'
})

fastify.get('/user/:id', (req, reply) => {
  fastify.mysql.query(
    'SELECT id, username, hash, salt FROM users WHERE id=?', [req.params.id],
    function onResult (err, result) {
      reply.send(err || result)
    }
  )
})

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```

### [Postgres](https://github.com/fastify/fastify-postgres)
Install the plugin by running `npm i pg fastify-postgres --save`.

*Example*:

```javascript
const fastify = require('fastify')()

fastify.register(require('fastify-postgres'), {
  connectionString: 'postgres://postgres@localhost/postgres'
})

fastify.get('/user/:id', (req, reply) => {
  fastify.pg.query(
    'SELECT id, username, hash, salt FROM users WHERE id=$1', [req.params.id],
    function onResult (err, result) {
      reply.send(err || result)
    }
  )
})

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```

### [Redis](https://github.com/fastify/fastify-redis)
Install the plugin by running `npm i fastify-redis --save`

*Usage:*

```javascript
'use strict'

const fastify = require('fastify')()

fastify.register(require('fastify-redis'), { host: '127.0.0.1' })
// or
fastify.register(require('fastify-redis'), { url: 'redis://127.0.0.1', /* other redis options */ })

fastify.get('/foo', (req, reply) => {
  const { redis } = fastify
  redis.get(req.query.key, (err, val) => {
    reply.send(err || val)
  })
})

fastify.post('/foo', (req, reply) => {
  const { redis } = fastify
  redis.set(req.body.key, req.body.value, (err) => {
    reply.send(err || { status: 'ok' })
  })
})

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```

By default `fastify-redis` doesn't close the client connection when Fastify server shuts down. To opt-in to this behavior, register the client like so:

```javascript
fastify.register(require('fastify-redis'), {
  client: redis,
  closeClient: true
})
```

### [Mongo](https://github.com/fastify/fastify-mongodb)
Install the plugin by running `npm i fastify-mongodb --save`

*Usage:*
```javascript
const fastify = require('fastify')()

fastify.register(require('fastify-mongodb'), {
  // force to close the mongodb connection when app stopped
  // the default value is false
  forceClose: true,
  
  url: 'mongodb://mongo/mydb'
})

fastify.get('/user/:id', function (req, reply) {
  // Or this.mongo.client.db('mydb').collection('users')
  const users = this.mongo.db.collection('users')

  // if the id is an ObjectId format, you need to create a new ObjectId
  const id = this.mongo.ObjectId(req.params.id)
  users.findOne({ id }, (err, user) => {
    if (err) {
      reply.send(err)
      return
    }
    reply.send(user)
  })
})

fastify.listen(3000, err => {
  if (err) throw err
})
```

### [LevelDB](https://github.com/fastify/fastify-leveldb)
Install the plugin by running `https://github.com/fastify/fastify-leveldb`

*Usage:*
```javascript
const fastify = require('fastify')()

fastify.register(
  require('fastify-leveldb'),
  { name: 'db' }
)

fastify.get('/foo', async function (req, reply) {
  const val = await this.level.db.get(req.query.key)
  return val
})

fastify.post('/foo', async function (req, reply) {
  await this.level.db.put(req.body.key, req.body.value)
  return { status: 'ok' }
})

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```

