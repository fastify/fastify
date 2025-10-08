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

function decorate (instance, name, fn, dependencies) {
  if (Object.hasOwn(instance, name)) {
    throw new FST_ERR_DEC_ALREADY_PRESENT(name)
  }

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

function getInstanceDecorator (name) {
  if (!checkExistence(this, name)) {
    throw new FST_ERR_DEC_UNDECLARED(name, 'instance')
  }

  if (typeof this[name] === 'function') {
    return this[name].bind(this)
  }

  return this[name]
}

function decorateConstructor (konstructor, name, fn, dependencies) {
  const instance = konstructor.prototype
  if (Object.hasOwn(instance, name) || hasKey(konstructor, name)) {
    throw new FST_ERR_DEC_ALREADY_PRESENT(name)
  }

  konstructor[kHasBeenDecorated] = true
  checkDependencies(konstructor, name, dependencies)

  if (fn && (typeof fn.getter === 'function' || typeof fn.setter === 'function')) {
    Object.defineProperty(instance, name, {
      get: fn.getter,
      set: fn.setter
    })
  } else if (typeof fn === 'function') {
    instance[name] = fn
  } else {
    konstructor.props.push({ key: name, value: fn })
  }
}

function checkReferenceType (name, fn) {
  if (typeof fn === 'object' && fn && !(typeof fn.getter === 'function' || typeof fn.setter === 'function')) {
    throw new FST_ERR_DEC_REFERENCE_TYPE(name, typeof fn)
  }
}

function decorateFastify (name, fn, dependencies) {
  assertNotStarted(this, name)
  decorate(this, name, fn, dependencies)
  if (typeof this.addHook === 'function' && typeof this.runHook === 'function') {
    // If the instance is already booting or ready, avoid registering
    // an Avvio `after` callback (which may error during onReady). Call
    // the hook runner synchronously instead.
    if (this[kState].booting || this[kState].ready) {
      try {
        this.runHook('onDecorate', this, name, fn)
      } catch (err) {
        this.log && this.log.error(err)
      }
    } else {
      // schedule the hook to run after the current plugin registration
      // so that any addHook calls (which register via `after`) have been
      // processed and the hook is present in the hooks registry
      this.after(() => {
        if (typeof this.runHook === 'function') {
          this.runHook('onDecorate', this, name, fn)
        }
      })
    }
  }

  return this
}

function checkExistence (instance, name) {
  if (name) {
    return name in instance || (instance.prototype && name in instance.prototype) || hasKey(instance, name)
  }

  return instance in this
}

function hasKey (fn, name) {
  if (fn.props) {
    return fn.props.find(({ key }) => key === name)
  }
  return false
}

function checkRequestExistence (name) {
  if (name && hasKey(this[kRequest], name)) return true
  return checkExistence(this[kRequest].prototype, name)
}

function checkReplyExistence (name) {
  if (name && hasKey(this[kReply], name)) return true
  return checkExistence(this[kReply].prototype, name)
}

function checkDependencies (instance, name, deps) {
  if (deps === undefined || deps === null) {
    return
  }

  if (!Array.isArray(deps)) {
    throw new FST_ERR_DEC_DEPENDENCY_INVALID_TYPE(name)
  }

  for (let i = 0; i !== deps.length; ++i) {
    if (!checkExistence(instance, deps[i])) {
      throw new FST_ERR_DEC_MISSING_DEPENDENCY(deps[i])
    }
  }
}
// onDecorateReply
function decorateReply (name, fn, dependencies) {
  assertNotStarted(this, name)
  checkReferenceType(name, fn)
  decorateConstructor(this[kReply], name, fn, dependencies)
  if (typeof this.addHook === 'function' && typeof this.runHook === 'function') {
    if (this[kState].booting || this[kState].ready) {
      try {
        this.runHook('onDecorateReply', this, name, fn)
      } catch (err) {
        this.log && this.log.error(err)
      }
    } else {
      this.after(() => {
        if (typeof this.runHook === 'function') {
          this.runHook('onDecorateReply', this, name, fn)
        }
      })
    }
  }

  return this
}
// onDecorateRequest
function decorateRequest (name, fn, dependencies) {
  assertNotStarted(this, name)
  checkReferenceType(name, fn)
  decorateConstructor(this[kRequest], name, fn, dependencies)
  // onDecorateRequest
  if (typeof this.addHook === 'function' && typeof this.runHook === 'function') {
    if (this[kState].booting || this[kState].ready) {
      try {
        this.runHook('onDecorateRequest', this, name, fn)
      } catch (err) {
        this.log && this.log.error(err)
      }
    } else {
      this.after(() => {
        if (typeof this.runHook === 'function') {
          this.runHook('onDecorateRequest', this, name, fn)
        }
      })
    }
  }

  return this
}

function assertNotStarted (instance, name) {
  if (instance[kState].started) {
    throw new FST_ERR_DEC_AFTER_START(name)
  }
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
