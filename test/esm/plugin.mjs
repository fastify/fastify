async function plugin (fastify, opts) {
  fastify.decorate('foo', opts.foo)
}

plugin[Symbol.for('skip-override')] = true

export default plugin
