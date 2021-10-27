import { FastifyInstance } from './types/instance'
import { FastifyTypeProvider } from './types/typeProvider'

declare const fastify: FastifyInstance

// --------------------------------------------------------------------
// Example Usage
// --------------------------------------------------------------------

import { Type, Static, TSchema } from '@sinclair/typebox'

interface TypeBoxTypeProvider extends FastifyTypeProvider { output: this["input"] extends TSchema ? Static<this["input"]> : never }

fastify.typeProvider<TypeBoxTypeProvider>().get('/', {
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

// --------------------------------------------------------------------
// Should override provider when specifiying generic arguments
// --------------------------------------------------------------------

fastify.typeProvider<TypeBoxTypeProvider>().get<{ Body: 'hello', Params: 'world' }>('/', {
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
    const BODY   = req.body
    const PARAMS = req.params

})

// ---------------------------------------------------------
// Should support multiple type inference libraries
// ---------------------------------------------------------

import { FromSchema, JSONSchema } from 'json-schema-to-ts'

interface JsonSchemaToTsTypeProvider extends FastifyTypeProvider {
    output: this["input"] extends JSONSchema ? FromSchema<this["input"]> : never
}

fastify.typeProvider<JsonSchemaToTsTypeProvider>().get('/', {
    schema: {
        body: {
            type: 'object',
            properties: {
                a: { type: 'string' },
                b: { type: 'number' },
                c: { type: 'boolean' }
            },

        } as const
    }
}, (req, res) => {
    req.body.a // a = string
    req.body.b // b = number
    req.body.c // c = boolean
})

// ---------------------------------------------------------
// Should support future inference requirements
// ---------------------------------------------------------

export type ExtractParams<S extends string, Params extends string[]> = 
    S extends `/${infer R}`            ? ExtractParams<R, Params>         : 
    S extends `:${infer P}/${infer R}` ? ExtractParams<R, [...Params, P]> :
    S extends `:${infer P}`            ? [...Params, P]                                 :
    S extends `${infer _}/${infer R}`  ? ExtractParams<R, Params>         : 
    Params

export type TupleToUnion  <T extends string[]> = {[K in keyof T]: T[K]}[number]
export type UnionToObject <T extends string> = { [K in T]: string }
export type ParseUrl      <T> = T extends string ? UnionToObject<TupleToUnion<ExtractParams<T, []>>> : never

interface UrlProvider extends FastifyTypeProvider {
    output: ParseUrl<this["input"]>
}

fastify.typeProvider<UrlProvider>().get('/', {
    schema: {
        body: '/users/:userId/orders/:orderId' as const
    }
}, (req, res) => {

    const { userId, orderId } = req.body
})