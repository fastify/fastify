'use strict'

/**
 * typeNameReg is used to validate that the first part of the media-type
 * does not use disallowed characters.
 *
 * @see https://httpwg.org/specs/rfc9110.html#rule.token.separators
 * @type {RegExp}
 */
const typeNameReg = /^[\w!#$%&'*+.^`|~-]+$/

/**
 * subtypeNameReg is used to validate that the second part of the media-type
 * does not use disallowed characters.
 *
 * @see https://httpwg.org/specs/rfc9110.html#rule.token.separators
 * @type {RegExp}
 */
const subtypeNameReg = /^[\w!#$%&'*+.^`|~-]+\s*/

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

  constructor (headerValue) {
    if (headerValue == null || headerValue === '' || headerValue === 'undefined') {
      return
    }

    const hv = headerValue.trim()
    let parts = (() => {
      const [first, ...rest] = hv.split('/')
      if (rest.length === 0) return [first]
      return [first, rest.join('/')]
    })()

    if (parts.length !== 2) {
      return
    }
    this.#type = parts[0].toLowerCase()
    if (typeNameReg.test(this.#type) === false) {
      return
    }

    parts = parts[1].split(';')
    this.#subtype = parts[0].toLowerCase()
    if (subtypeNameReg.test(this.#subtype) === false) {
      return
    }
    this.#subtype = this.#subtype.trim()

    this.#valid = true
    this.#empty = false
    if (parts.length < 2) {
      // We don't need to parse the parameters because none were supplied.
      return
    }

    for (let i = 1; i < parts.length; i += 1) {
      const [key, value] = parts[i].trim().split('=')
      if (key == null || value === undefined) continue
      if (value[0] === '"' && value.at(-1) === '"') {
        this.#parameters.set(key, value.slice(1, value.length - 1))
      } else {
        this.#parameters.set(key, value)
      }
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
