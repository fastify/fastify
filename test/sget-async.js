'use strict'

const sget = require('simple-get').concat

async function sgetAsync (options) {
  return await new Promise((resolve, reject) => {
    sget(options, (err, response, data) => {
      if (err) return reject(err)
      resolve({ response, body: data.toString() })
    })
  })
}

module.exports = sgetAsync
