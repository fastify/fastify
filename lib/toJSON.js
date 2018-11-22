'use strict'

const {
  kHooks,
  kMiddlewares
} = require('./symbols.js')

const pluginUtils = require('./pluginUtils')

function toJSON () {
  const middlewares = {
    '/': []
  }

  const hooks = {
    onRequest: [],
    preHandler: [],
    onResponse: [],
    onSend: [],
    preValidation: [],
    onError: []
  }

  const plugins = []

  this[kMiddlewares].forEach(mdw => {
    if (typeof mdw[0] === 'string') {
      const route = mdw[0]
      if (!Array.isArray(middlewares[route])) middlewares[route] = [mdw[1].name]
      else middlewares[route].push(mdw[1].name)
    } else middlewares['/'].push(mdw[0].name)
  })

  Object.keys(this[kHooks]).forEach(key => {
    this[kHooks][key].forEach(h => {
      const hookName = h.name.split(' ')[1]
      if (hookName !== '') {
        hooks[key].push(hookName)
      }
    })
  })

  this[pluginUtils.registeredPlugins].forEach(name => {
    plugins.push(name)
  })

  return { middlewares, hooks, plugins }
}

module.exports = toJSON
