const LINES = {
  r: '└──', //right
  t: '├──', //T shape
  v: '│  '  //vertical
}

function toString() {
  console.log('Fastify Instance toString')
  /* Print hooks */
  console.log(`\nHooks`)
  Object.keys(this._hooks).forEach((lfm, i) => {
    const hooks = this._hooks[lfm]
    console.log(`${
      i < 3 ? LINES.t : LINES.r
    } ${lfm} (${hooks.length} hooks): ${hooks.length > 0 ? hooks.map(h=>h.name) : '[]'}`)
  })
  /* Ideally: iterate over routes and print plugins & middleware by scope */
  console.log(`\nRoutes`)
  console.log(`${this.printRoutes()}`)

  console.log(`\nMiddleware`)
  const middlewares = {
    '/': []
  }
  this._middlewares.forEach(mdw => {
    if (typeof mdw[0] === 'string') {
      const route = mdw[0]
      if (!Array.isArray(middlewares[route])) middlewares[route] = [mdw[1].name]
      else middlewares[route].push(mdw[1].name)
    } else middlewares['/'].push(mdw[0].name)
  })
  Object.keys(middlewares).forEach((key, i, keys) => {
    console.log(`${
      i < keys.length - 1 ? LINES.t : LINES.r
    } ${key}: [${middlewares[key].join(', ')}]`)
  })

  console.log(`\nPlugins`)
  console.log(`${LINES.r} TODO`)
}

module.exports = toString