import { FastifyInstance } from './types/instance'
import { FastifyTypeProvider } from './types/typeProvider'
import { Type, Static } from '@sinclair/typebox'

declare const instance: FastifyInstance

// ---------------------------------------------------------
// Type Provider Syntax
// ---------------------------------------------------------

interface TypeBoxTypeProvider extends FastifyTypeProvider {
    output: Static<this["input"]>
}

// ---------------------------------------------------------
// General Usage
// ---------------------------------------------------------

const fastify = instance.typeProvider<TypeBoxTypeProvider>()

fastify.get('/', {
    schema: {
        body: Type.Object({
            x: Type.Number(),
            y: Type.Number(),
            z: Type.Number()
        }),
        params: Type.Object({
            a: Type.Literal(1),
            b: Type.Literal(2),
            c: Type.Literal(3),
        })
    }
}, (req, res) => {

    const { x, y, z } = req.body

    const { a, b, c } = req.params
})

// ---------------------------------------------------------
// Generic Arguments Override Provider
// ---------------------------------------------------------

fastify.get<{
    Body: 'HELLO',
    Params: 'WORLD'
}>('/', {
    schema: {
        body: Type.Object({
            x: Type.Number(),
            y: Type.Number(),
            z: Type.Number()
        }),
        params: Type.Object({
            a: Type.Literal(1),
            b: Type.Literal(2),
            c: Type.Literal(3),
        })
    }
}, (req, res) => {
    const BODY = req.body
    const PARAMS = req.params

})