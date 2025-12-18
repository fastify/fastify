import { expect } from 'tstyche'
/* eslint-disable @typescript-eslint/no-unused-vars */
import { FastifyListenOptions, FastifyLogFn } from '../../fastify.js'

expect<FastifyListenOptions>().type.toBeAssignableFrom({})
