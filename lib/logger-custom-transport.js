const build = require('pino-abstract-transport')
const SonicBoom = require('sonic-boom')
const { once } = require('events')

module.exports = async function (opts) {
  // SonicBoom is necessary to avoid loops with the main thread.
  // It is the same as pino.destination().
  const destination = new SonicBoom({ dest: opts.destination || 1, sync: false })
  const customKeys = opts.customAttributeKeys
  await once(destination, 'ready')

  return build(async function (source) {
    for await (const obj of source) {
      if (customKeys.req && obj.req) {
        obj[customKeys.req] = obj.req
        delete obj.req
      }
      if (customKeys.res && obj.res) {
        obj[customKeys.res] = obj.res
        delete obj.res
      }
      if (customKeys.err && obj.err) {
        obj[customKeys.err] = obj.err
        delete obj.err
      }
      // Write the transformed log message to the destination (e.g., to stdout)
      const toDrain = !destination.write(JSON.stringify(obj) + '\n')
      // This block will handle backpressure
      if (toDrain) {
        await once(destination, 'drain')
      }
    }
  }, {
    async close (_err) {
      destination.end()
      await once(destination, 'close')
    }
  })
}
