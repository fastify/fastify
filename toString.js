const pluginUtils = require('./lib/pluginUtils')

const LINES = {
  r: '└──', //right
  t: '├──', //T shape
  v: '│  '  //vertical
}

function toString() {
  let output_string = 'Fastify Instance toString'
  /* Print hooks */
  output_string += `\n\nTop Level Hooks`

  Object.keys(this._hooks).forEach((lfm, i) => {
    const hooks = this._hooks[lfm]
    output_string += `\n${
      i < 3 ? LINES.t : LINES.r
    } ${lfm} (${hooks.length} hooks): ${hooks.length > 0 ? hooks.map(h=>h.name) : '[]'}`
  })
  /* Ideally: iterate over routes and print plugins & middleware by scope */
  output_string += `\n\nRoutes`
  output_string += `\n${this.printRoutes()}`

  output_string += `\nTop Level Middleware`
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
    output_string += `\n${
      i < keys.length - 1 ? LINES.t : LINES.r
    } ${key}: [${middlewares[key].join(', ')}]`
  })

  output_string += `\n\nPlugins`
  output_string += `\n${LINES.r} TODO`
  console.log(`Registered Plugins: ${this[pluginUtils.registeredPlugins]}`)
  // console.log(this)
  console.log(output_string)
  return output_string
}

module.exports = toString