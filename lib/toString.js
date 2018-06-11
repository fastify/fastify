'use strict'

const pluginUtils = require('./pluginUtils')

const LINES = {
  r: '└──', // right
  t: '├──', // T shape
  v: '│  ' // vertical
}

function toString () {
  let outputString = ''
  /* Print hooks */
  outputString += `Top Level Hooks`

  Object.keys(this._hooks).forEach((lfm, i) => {
    const hooks = this._hooks[lfm]
    outputString += `\n${
      i < 3 ? LINES.t : LINES.r
    } ${lfm} (${hooks.length} hooks): ${hooks.length > 0 ? hooks.map(h => h.name) : '[]'}`
  })
  /* Ideally: iterate over routes and print plugins & middleware by scope */
  outputString += `\n\nRoutes`
  outputString += `\n${this.printRoutes()}`

  outputString += `\nTop Level Middleware`
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
    outputString += `\n${
      i < keys.length - 1 ? LINES.t : LINES.r
    } ${key}: [${middlewares[key].join(', ')}]`
  })

  outputString += `\n\nPlugins`
  const plugins = this[pluginUtils.registeredPlugins]
  plugins.forEach((plugin, i) => {
    outputString += `\n${
      i < plugins.length - 1 ? LINES.t : LINES.r
    } ${plugin[Symbol.for('fastify.display-name')] || (plugin.name.length === 0 ? 'anonymous' + i : plugin.name)}`
  })

  return outputString
}

module.exports = toString
