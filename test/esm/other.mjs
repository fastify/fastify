import t from 'tap'

async function other (fastify, opts) {
  t.equal(fastify.foo, 'bar')
}

export default other
