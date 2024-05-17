'use strict'

function Trie () {
  this.root = this.createTrieNode()
  this.add = this.add.bind(this)
  this.has = this.has.bind(this)
}

Trie.prototype.createTrieNode = function () {
  return { children: {}, isEndOfWord: false }
}

Trie.prototype.add = function (word) {
  let node = this.root
  for (const char of word) {
    if (!node.children[char]) {
      node.children[char] = this.createTrieNode()
    }
    node = node.children[char]
  }
  node.isEndOfWord = true
}

Trie.prototype.has = function (word) {
  let node = this.root
  for (const char of word) {
    if (!node.children[char]) {
      return false
    }
    node = node.children[char]
  }
  return node.isEndOfWord
}
const bodylessMethodsTrie = new Trie()
const bodylessMethods = [
  // Standard
  'GET',
  'HEAD',
  'TRACE',

  // WebDAV
  'UNLOCK'
]
bodylessMethods.forEach(bodylessMethodsTrie.add)

const bodyMethodsTrie = new Trie()

const bodyMethods = [
  // Standard
  'DELETE',
  'OPTIONS',
  'PATCH',
  'PUT',
  'POST',

  // WebDAV
  'COPY',
  'LOCK',
  'MOVE',
  'MKCOL',
  'PROPFIND',
  'PROPPATCH',
  'REPORT',
  'SEARCH',
  'MKCALENDAR'
]
bodyMethods.forEach(bodyMethodsTrie.add)

module.exports = {
  bodylessMethods: bodylessMethodsTrie,
  bodyMethods: bodyMethodsTrie,
  supportedMethods: [
    ...bodylessMethods,
    ...bodyMethods
  ]
}
