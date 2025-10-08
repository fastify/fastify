'use strict'

const {
  kReply,
  kRequest,
  kState,
  kHasBeenDecorated
} = require('./symbols.js')

const {
  FST_ERR_DEC_ALREADY_PRESENT,
  FST_ERR_DEC_MISSING_DEPENDENCY,
  FST_ERR_DEC_AFTER_START,
  FST_ERR_DEC_REFERENCE_TYPE,
  FST_ERR_DEC_DEPENDENCY_INVALID_TYPE,
  FST_ERR_DEC_UNDECLARED
} = require('./errors')

// ----------------- Helper Functions -----------------

function assertNotStarted (instance, name) {
  if (instance[kState].started) {
    throw new FST_ERR_DEC_AFTER_START(name)
  }
}

function checkExistence (instance, name) {
  if (name) {
    return name in instance || (instance.prototype && name in instance.prototype) || hasKey(instance, name)
  }
  return instance in this
}

function hasKey (fn, name) {
  if (fn.props) return fn.props.find(({ key }) => key === name)
  return false
}

function checkDependencies (instance, name, deps) {
  if (deps == null) return
  if (!Array.isArray(deps)) throw new FST_ERR_DEC_DEPENDENCY_INVALID_TYPE(name)
  for (const dep of deps) {
    if (!checkExistence(instance, dep)) throw new FST_ERR_DEC_MISSING_DEPENDENCY(dep)
  }
}

function checkReferenceType (name, fn) {
  if (typeof fn === 'object' && fn && !(typeof fn.getter === 'function' || typeof fn.setter === 'function')) {
    throw new FST_ERR_DEC_REFERENCE_TYPE(name, typeof fn)
  }
}

// ----------------- Core Decorators -----------------

function decorate (instance, name, fn, dependencies) {
  if (Object.hasOwn(instance, name)) throw new FST_ERR_DEC_ALREADY_PRESENT(name)
  checkDependencies(instance, name, dependencies)

  if (fn && (typeof fn.getter === 'function' || typeof fn.setter === 'function')) {
    Object.defineProperty(instance, name, {
      get: fn.getter,
      set: fn.setter
    })
  } else {
    instance[name] = fn
  }
}

function decorateConstructor (konstructor, name, fn, dependencies) {
  const instance = konstructor.prototype
  if (Object.hasOwn(instance, name) || hasKey(konstructor, name)) throw new FST_ERR_DEC_ALREADY_PRESENT(name)

  konstructor[kHasBeenDecorated] = true
  checkDependencies(konstructor, name, dependencies)

  if (fn && (typeof fn.getter === 'function' || typeof fn.setter === 'function')) {
    Object.defineProperty(instance, name, { get: fn.getter, set: fn.setter })
  } else if (typeof fn === 'function') {
    instance[name] = fn
  } else {
    konstructor.props.push({ key: name, value: fn })
  }
}

// ----------------- Fastify Decorators -----------------

function createDecorator (instance, name, fn, dependencies, type) {
  assertNotStarted(instance, name)
  if (type === 'request' || type === 'reply') checkReferenceType(name, fn)

  const target = type === 'request'
    ? instance[kRequest]
    : type === 'reply'
      ? instance[kReply]
      : instance

  if (type === 'request' || type === 'reply') {
    decorateConstructor(target, name, fn, dependencies)
  } else {
    decorate(target, name, fn, dependencies)
  }

  // Trigger hooks
  const hookName = type === 'request'
    ? 'onDecorateRequest'
    : type === 'reply'
      ? 'onDecorateReply'
      : 'onDecorate'

  if (typeof instance.addHook === 'function' && typeof instance.runHook === 'function') {
    try {
      instance.after(() => instance.runHook(hookName, instance, name, fn))
    } catch (err) {
      // If Avvio has already booted, `after` may throw (AVV_ERR_ROOT_PLG_BOOTED).
      // Schedule the runHook on the next tick to avoid throwing inside the
      // onReady hook execution and to keep behavior similar to deferred scheduling.
      setImmediate(() => {
        try {
          instance.runHook(hookName, instance, name, fn)
        } catch (e) {
          instance.log && instance.log.error(e)
        }
      })
    }
  }

  return instance
}

function decorateFastify (name, fn, dependencies) {
  assertNotStarted(this, name)
  return createDecorator(this, name, fn, dependencies, 'fastify')
}

function decorateRequest (name, fn, dependencies) {
  return createDecorator(this, name, fn, dependencies, 'request')
}

function decorateReply (name, fn, dependencies) {
  return createDecorator(this, name, fn, dependencies, 'reply')
}

// ----------------- Exports -----------------

function getInstanceDecorator (name) {
  if (!checkExistence(this, name)) throw new FST_ERR_DEC_UNDECLARED(name, 'instance')
  if (typeof this[name] === 'function') return this[name].bind(this)
  return this[name]
}

function checkRequestExistence (name) {
  if (name && hasKey(this[kRequest], name)) return true
  return checkExistence(this[kRequest].prototype, name)
}

function checkReplyExistence (name) {
  if (name && hasKey(this[kReply], name)) return true
  return checkExistence(this[kReply].prototype, name)
}

module.exports = {
  add: decorateFastify,
  exist: checkExistence,
  existRequest: checkRequestExistence,
  existReply: checkReplyExistence,
  dependencies: checkDependencies,
  decorateReply,
  decorateRequest,
  getInstanceDecorator,
  hasKey
}
