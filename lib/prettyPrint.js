'use strict'

const { supportedHooks } = require('./hooks')

/* eslint-disable no-multi-spaces */
const indent              = '    '
const branchIndent        = '│   '
const midBranchIndent     = '├── '
const endBranchIndent     = '└── '
const wildcardDelimiter   = '*'
const pathDelimiter       = '/'
const pathRegExp          = /(?=\/)/
/* eslint-enable */

function parseFunctionName (fn) {
  let fName = fn.name
  if (!fName) return ''

  fName = fName.replace('bound ', '')
  return fName || 'anonymous'
}

function buildHooksObject (route, hookList) {
  const out = {}
  hookList.forEach(h => {
    if (route.store[h] && route.store[h].length) out[h] = route.store[h].map(fn => parseFunctionName(fn))
  })
  return out
}

function prettyPrintRoutesArray (routeArray, opts = {}) {
  opts.showHooks = opts.showHooks && Array.isArray(opts.showHooks) ? opts.showHooks : supportedHooks
  const mergedRouteArray = []

  let tree = ''

  routeArray.sort((a, b) => {
    if (!a.path || !b.path) return 0
    return a.path.localeCompare(b.path)
  })

  // merge alike paths
  for (let i = 0; i < routeArray.length; i++) {
    const route = routeArray[i]
    const pathExists = mergedRouteArray.find(r => route.path === r.path)
    if (pathExists) {
      // path already declared, add new method and break out of loop
      pathExists.handlers.push({
        method: route.method,
        opts: route.opts.constraints || undefined,
        hooks: opts.includeHooks ? buildHooksObject(route, opts.showHooks) : null
      })
      continue
    }

    const routeHandler = {
      method: route.method,
      opts: route.opts.constraints || undefined,
      hooks: opts.includeHooks ? buildHooksObject(route, opts.showHooks) : null
    }
    mergedRouteArray.push({
      path: route.path,
      methods: [route.method],
      opts: [route.opts],
      handlers: [routeHandler]
    })
  }

  // insert root level path if none defined
  if (!mergedRouteArray.filter(r => r.path === pathDelimiter).length) {
    const rootPath = {
      path: pathDelimiter,
      truncatedPath: '',
      methods: [],
      opts: [],
      handlers: [{}]
    }

    // if wildcard route exists, insert root level after wildcard
    if (mergedRouteArray.filter(r => r.path === wildcardDelimiter).length) {
      mergedRouteArray.splice(1, 0, rootPath)
    } else {
      mergedRouteArray.unshift(rootPath)
    }
  }

  // build tree
  const routeTree = buildRouteTree(mergedRouteArray)

  // draw tree
  routeTree.forEach((rootBranch, idx) => {
    tree += drawBranch(rootBranch, null, idx === routeTree.length - 1, false, true)
    tree += '\n' // newline characters inserted at beginning of drawing function to allow for nested paths
  })

  return tree
}

function buildRouteTree (mergedRouteArray, rootPath) {
  rootPath = rootPath || pathDelimiter

  const result = []
  const temp = { result }
  mergedRouteArray.forEach((route, idx) => {
    let splitPath = route.path.split(pathRegExp)

    // add preceding slash for proper nesting
    if (splitPath[0] !== pathDelimiter) {
      // handle wildcard route
      if (splitPath[0] !== wildcardDelimiter) splitPath = [pathDelimiter, splitPath[0].slice(1), ...splitPath.slice(1)]
    }

    // build tree
    splitPath.reduce((acc, path, pidx) => {
      if (!acc[path]) {
        acc[path] = { result: [] }
        const pathSeg = { path, children: acc[path].result }

        if (pidx === splitPath.length - 1) pathSeg.handlers = route.handlers
        acc.result.push(pathSeg)
      }
      return acc[path]
    }, temp)
  })

  // unfold root object from array
  return result
}

function drawBranch (pathSeg, prefix, endBranch, noPrefix, rootBranch) {
  let branch = ''

  if (!noPrefix && !rootBranch) branch += '\n'
  if (!noPrefix) branch += `${prefix || ''}${endBranch ? endBranchIndent : midBranchIndent}`
  branch += `${pathSeg.path}`

  if (pathSeg.handlers) {
    const flatHandlers = pathSeg.handlers.reduce((acc, curr) => {
      const match = acc.findIndex(h => JSON.stringify(h.opts) === JSON.stringify(curr.opts))
      if (match !== -1) {
        acc[match].method = [acc[match].method, curr.method].join(', ')
      } else {
        acc.push(curr)
      }
      return acc
    }, [])

    flatHandlers.forEach((handler, idx) => {
      if (idx > 0) branch += `${noPrefix ? '' : prefix || ''}${endBranch ? indent : branchIndent}${pathSeg.path}`
      branch += ` (${handler.method || '-'})`
      if (handler.opts && JSON.stringify(handler.opts) !== '{}') branch += ` ${JSON.stringify(handler.opts)}`
      if (handler.hooks) {
        Object.keys(handler.hooks).forEach((h, hidx) => {
          branch += `\n${noPrefix ? '' : prefix || ''}${endBranch ? indent : branchIndent}`
          branch += `• (${h}) ${JSON.stringify(handler.hooks[h])}`
        })
      }
      if (flatHandlers.length > 1 && idx !== flatHandlers.length - 1) branch += '\n'
    })
  } else {
    branch += ' (-)'
  }

  if (!noPrefix) prefix = `${prefix || ''}${endBranch ? indent : branchIndent}`

  pathSeg.children.forEach((child, idx) => {
    const endBranch = idx === pathSeg.children.length - 1
    const skipPrefix = (!pathSeg.handlers && pathSeg.children.length === 1)
    branch += drawBranch(child, prefix, endBranch, skipPrefix)
  })

  return branch
}

module.exports = prettyPrintRoutesArray
