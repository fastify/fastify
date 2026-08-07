'use strict'

const { LruMap: Lru } = require('toad-cache')
const parseMimeType = require('./mime-type-parser')

/**
 * Content-Type internal shared cache
 * @type {Lru<ContentType>}
 */
const cache = new Lru(100)

/**
 * ContentType parses and represents the value of the content-type header.
 *
 * @see https://mimesniff.spec.whatwg.org/#parse-a-mime-type
 */
class ContentType {
  #valid = false
  #empty = true
  #type = ''
  #subtype = ''
  #parameters = new Map()
  #string

  /**
   * The shared cache of ContentType instances. The cache is used to avoid
   * creating multiple instances of ContentType for the same header value.
   * @type {Lru<ContentType>}
   */
  static get cache () { return cache }

  /**
   * Create a ContentType instance from a header value. If the value has been
   * previously parsed, the cached instance will be returned.
   * @param {string} headerValue
   * @returns {ContentType | undefined}
   */
  static from (headerValue) {
    let contentType = cache.get(headerValue)
    if (contentType !== undefined) return contentType
    contentType = new ContentType(headerValue)
    cache.set(headerValue, contentType)
    return contentType
  }

  constructor (headerValue) {
    if (headerValue == null || headerValue === '' || headerValue === 'undefined') {
      return
    }

    const parsed = parseMimeType(headerValue, this.#parameters)
    if (parsed === undefined) return

    this.#type = parsed.type
    this.#subtype = parsed.subtype
    this.#parameters = parsed.parameters
    this.#valid = true
    this.#empty = false
  }

  get [Symbol.toStringTag] () { return 'ContentType' }

  get isEmpty () { return this.#empty }

  get isValid () { return this.#valid }

  get mediaType () { return `${this.#type}/${this.#subtype}` }

  get type () { return this.#type }

  get subtype () { return this.#subtype }

  get parameters () { return this.#parameters }

  toString () {
    /* c8 ignore next: we don't need to verify the cache */
    if (this.#string) return this.#string
    const parameters = []
    for (const [key, value] of this.#parameters.entries()) {
      parameters.push(`${key}="${value}"`)
    }
    const result = [this.#type, '/', this.#subtype]
    if (parameters.length > 0) {
      result.push('; ')
      result.push(parameters.join('; '))
    }
    this.#string = result.join('')
    return this.#string
  }
}

module.exports = ContentType
