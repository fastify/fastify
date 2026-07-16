'use strict'

const { LruMap: Lru } = require('toad-cache')

/**
 * keyValuePairsReg is used to split the parameters list into associated
 * key value pairings. The leading `(?:^|;)\s*` anchor ensures the regex
 * only attempts matches at parameter boundaries, preventing quadratic
 * backtracking on malformed input.
 *
 * @see https://httpwg.org/specs/rfc9110.html#parameter
 * @type {RegExp}
 */
const keyValuePairsReg = /(?:^|;)\s*([\w!#$%&'*+.^`|~-]+)=([^;]*)/gm

/**
 * typeNameReg is used to validate that the first part of the media-type
 * does not use disallowed characters. Types must consist solely of
 * characters that match the specified character class. It must terminate
 * with a matching character.
 *
 * @see https://httpwg.org/specs/rfc9110.html#rule.token.separators
 * @type {RegExp}
 */
const typeNameReg = /^[\w!#$%&'*+.^`|~-]+$/

/**
 * subtypeNameReg is used to validate that the second part of the media-type
 * does not use disallowed characters. Subtypes must consist solely of
 * characters that match the specified character class, and optionally
 * terminated with any amount of whitespace characters. Without the terminating
 * anchor (`$`), the regular expression will match the leading portion of a
 * string instead of the whole string.
 *
 * @see https://httpwg.org/specs/rfc9110.html#rule.token.separators
 * @type {RegExp}
 */
const subtypeNameReg = /^[\w!#$%&'*+.^`|~-]+\s*$/

/**
 * Content-Type internal shared cache
 * @type {Lru<ContentType>}
 */
const cache = new Lru(100)

/**
 * ContentType parses and represents the value of the content-type header.
 *
 * @see https://httpwg.org/specs/rfc9110.html#media.type
 * @see https://httpwg.org/specs/rfc9110.html#parameter
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

    let sepIdx = headerValue.indexOf(';')
    if (sepIdx === -1) {
      // The value is the simplest `type/subtype` variant.
      sepIdx = headerValue.indexOf('/')
      if (sepIdx === -1) {
        // Got a string without the correct `type/subtype` format.
        return
      }

      const type = headerValue.slice(0, sepIdx).trimStart().toLowerCase()
      const subtype = headerValue.slice(sepIdx + 1).trimEnd().toLowerCase()

      if (
        typeNameReg.test(type) === true &&
        subtypeNameReg.test(subtype) === true
      ) {
        this.#valid = true
        this.#empty = false
        this.#type = type
        this.#subtype = subtype
      }

      return
    }

    // We have a `type/subtype; params=list...` header value.
    const mediaType = headerValue.slice(0, sepIdx).toLowerCase()
    const paramsList = headerValue.slice(sepIdx + 1).trim()

    sepIdx = mediaType.indexOf('/')
    if (sepIdx === -1) {
      // We got an invalid string like `something; params=list...`.
      return
    }
    const type = mediaType.slice(0, sepIdx).trimStart()
    const subtype = mediaType.slice(sepIdx + 1).trimEnd()

    if (
      typeNameReg.test(type) === false ||
      subtypeNameReg.test(subtype) === false
    ) {
      // Some portion of the media-type is using invalid characters. Therefore,
      // the content-type header is invalid.
      return
    }
    this.#type = type
    this.#subtype = subtype
    this.#valid = true
    this.#empty = false

    let matches = keyValuePairsReg.exec(paramsList)
    while (matches) {
      // https://httpwg.org/specs/rfc9110.html#parameter
      // Parameter names are case-insensitive.
      const key = matches[1].toLowerCase()
      // Parameter values might or might not be case-sensitive,
      // depending on the semantics of the parameter name.
      const value = matches[2]
      if (value[0] === '"') {
        if (value.at(-1) !== '"') {
          this.#parameters.set(key, 'invalid quoted string')
          matches = keyValuePairsReg.exec(paramsList)
          continue
        }
        // We should probably verify the value matches a quoted string
        // (https://httpwg.org/specs/rfc9110.html#rule.quoted-string) value.
        // But we are not really doing much with the parameter values, so we
        // are omitting that at this time.
        this.#parameters.set(key, value.slice(1, value.length - 1))
      } else {
        this.#parameters.set(key, value)
      }
      matches = keyValuePairsReg.exec(paramsList)
    }
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
