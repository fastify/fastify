'use strict'

const httpTokenReg = /^[!#$%&'*+.^_`|~A-Za-z0-9-]+$/u
const httpQuotedStringTokenReg = /^[\u0009\u0020-\u007e\u0080-\u00ff]*$/u // eslint-disable-line no-control-regex

/**
 * @see https://mimesniff.spec.whatwg.org/#parse-a-mime-type
 * @param {string} headerValue
 * @param {Map<string, string>} parameters
 * @returns {{ type: string, subtype: string, parameters: Map<string, string> } | undefined}
 */
function parseMimeType (headerValue, parameters) {
  // 1. Remove leading and trailing HTTP whitespace.
  const input = trimHttpWhitespace(headerValue)

  // 2–3. Start at the beginning and collect the type up to "/".
  const slashIndex = input.indexOf('/')
  if (slashIndex === -1) return undefined

  const type = input.slice(0, slashIndex)

  // 4–6. Reject an invalid type, then advance past "/".
  if (!httpTokenReg.test(type)) return undefined

  // 7. Collect the subtype up to ";" or the end of input.
  const parameterIndex = input.indexOf(';', slashIndex + 1)
  const subtypeEnd = parameterIndex === -1 ? input.length : parameterIndex

  // 8. Remove trailing HTTP whitespace from the subtype.
  const subtype = trimHttpWhitespace(
    input.slice(slashIndex + 1, subtypeEnd),
    false,
    true
  )

  // 9. Reject an empty or non-token subtype.
  if (!httpTokenReg.test(subtype)) return undefined

  // 10–12. Create the MIME type record, parse its parameters, and return it.
  return {
    type: type.toLowerCase(),
    subtype: subtype.toLowerCase(),
    parameters: parameterIndex === -1
      ? parameters
      : parseParameters(input, parameterIndex, parameters)
  }
}

function isHttpWhitespace (characterCode) {
  return (
    characterCode === 0x09 ||
    characterCode === 0x0a ||
    characterCode === 0x0d ||
    characterCode === 0x20
  )
}

function trimHttpWhitespace (value, trimStart = true, trimEnd = true) {
  let start = 0
  let end = value.length

  if (trimStart) {
    while (start < end && isHttpWhitespace(value.charCodeAt(start))) {
      start++
    }
  }

  if (trimEnd) {
    while (end > start && isHttpWhitespace(value.charCodeAt(end - 1))) {
      end--
    }
  }

  return value.slice(start, end)
}

/**
 * @see https://fetch.spec.whatwg.org/#collect-an-http-quoted-string
 */
function collectHttpQuotedString (input, position) {
  let valueParts
  let valueEnd

  // 4. Advance past the opening quote.
  position++
  const valueStart = position

  while (true) {
    // 5.1. Collect until the next quote or backslash.
    const partStart = position
    while (
      position < input.length &&
      input.charCodeAt(position) !== 0x22 &&
      input.charCodeAt(position) !== 0x5c
    ) {
      position++
    }

    if (valueParts !== undefined) {
      valueParts.push(input.slice(partStart, position))
    }

    // 5.2. Stop at the end of input.
    if (position === input.length) {
      break
    }

    // 5.3–5.4. Read and advance past the quote or backslash.
    const quoteOrBackslash = input.charCodeAt(position)
    const quoteOrBackslashPosition = position
    position++

    // 5.6. A quote terminates the value.
    if (quoteOrBackslash === 0x22) {
      valueEnd = quoteOrBackslashPosition
      break
    }

    if (valueParts === undefined) {
      valueParts = [input.slice(valueStart, position - 1)]
    }

    // 5.5.1. Preserve a trailing backslash.
    if (position === input.length) {
      valueParts.push('\\')
      break
    }

    // 5.5.2–5.5.3. Append the escaped code point and advance.
    valueParts.push(input[position])
    position++
  }

  // 6. Return the extracted value and updated position.
  return {
    position,
    value: valueParts === undefined
      ? input.slice(valueStart, valueEnd)
      : valueParts.join('')
  }
}

function parseParameters (input, position, parameters) {
  while (position < input.length) {
    // 11.1. Advance past the parameter delimiter ";".
    position++

    // 11.2. Skip HTTP whitespace.
    while (
      position < input.length &&
      isHttpWhitespace(input.charCodeAt(position))
    ) {
      position++
    }

    // 11.3. Collect the name up to ";" or "=".
    const nameStart = position
    while (
      position < input.length &&
      input.charCodeAt(position) !== 0x3b &&
      input.charCodeAt(position) !== 0x3d
    ) {
      position++
    }
    const name = input.slice(nameStart, position)

    // 11.5. Skip malformed names at ";" or advance past "=".
    if (position < input.length) {
      if (input.charCodeAt(position) === 0x3b) {
        continue
      }
      position++
    }

    // 11.6. Stop if there is no parameter value.
    if (position === input.length) {
      break
    }

    // 11.7. Collect either a quoted or unquoted value.
    let value
    if (input.charCodeAt(position) === 0x22) {
      // 11.8. Collect a quoted string, then discard through the next ";".
      const quotedString = collectHttpQuotedString(input, position)
      position = quotedString.position
      value = quotedString.value

      while (
        position < input.length &&
        input.charCodeAt(position) !== 0x3b
      ) {
        position++
      }
    } else {
      // 11.9. Collect through ";" and trim trailing HTTP whitespace.
      const valueStart = position
      while (
        position < input.length &&
        input.charCodeAt(position) !== 0x3b
      ) {
        position++
      }
      value = trimHttpWhitespace(
        input.slice(valueStart, position),
        false,
        true
      )
      if (value === '') {
        continue
      }
    }

    // 11.4 and 11.10. Lowercase valid names and keep their first valid value.
    if (
      name !== '' &&
      httpTokenReg.test(name) &&
      httpQuotedStringTokenReg.test(value)
    ) {
      // Token validation guarantees ASCII, so native lowercasing is equivalent
      // to the specification's ASCII lowercase operation.
      const normalizedName = name.toLowerCase()
      if (!parameters.has(normalizedName)) {
        parameters.set(normalizedName, value)
      }
    }
  }

  return parameters
}

module.exports = parseMimeType
