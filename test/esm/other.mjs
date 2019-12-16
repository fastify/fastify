import t from 'tap'

async function other (fastify, opts) {
  t.strictEqual(fastify.foo, 'bar')
}

export default other
