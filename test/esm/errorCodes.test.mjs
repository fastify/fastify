import { errorCodes } from '../../fastify.js'
import t from 'tap'

t.test('errorCodes in ESM', async t => {
  // test a custom fastify error using errorCodes with ESM
  const customError = errorCodes.FST_ERR_VALIDATION('custom error message')
  t.ok(typeof customError !== 'undefined')
  t.ok(customError instanceof errorCodes.FST_ERR_VALIDATION)
  t.equal(customError.message, 'custom error message')
})
