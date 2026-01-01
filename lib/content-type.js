'use strict'

/**
 * tokensReg is used to parse the media-type and media-subtype fields.
 *
 * @see https://httpwg.org/specs/rfc9110.html#rule.token.separators
 * @type {RegExp}
 */
const tokensReg = /^([\w!#$%&'*+.^`|~-]+)\/([\w!#$%&'*+.^`|~-]+)\s*(;.*)?/

/**
 * keyValuePairsReg is used to split the parameters list into associated
 * key value pairings.
 *
 * @see https://httpwg.org/specs/rfc9110.html#parameter
 * @type {RegExp}
 */
const keyValuePairsReg = /([\w!#$%&'*+.^`|~-]+)=([^;]*)/gm

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
    let matches = tokensReg.exec(hv)
    if (matches === null) {
      return
    }
    this.#type = matches[1].toLowerCase()
    this.#subtype = matches[2].toLowerCase()

    this.#valid = true
    this.#empty = false
    if (!matches[3]) {
      // We don't need to parse the parameters because none were supplied.
      return
    }

    const paramsString = matches[3]
    matches = keyValuePairsReg.exec(paramsString)
    while (matches) {
      const key = matches[1]
      const value = matches[2]
      if (value[0] === '"') {
        if (value.at(-1) !== '"') {
          this.#parameters.set(key, 'invalid quoted string')
          matches = keyValuePairsReg.exec(paramsString)
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
      matches = keyValuePairsReg.exec(paramsString)
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
