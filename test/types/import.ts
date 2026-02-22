import { expect } from 'tstyche'
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { FastifyListenOptions, FastifyLogFn } from '../../fastify.js'

expect<FastifyListenOptions>().type.toBeAssignableFrom({})
