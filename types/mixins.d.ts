import type {
  AnyMixinName,
  Mixin,
} from './mixin-helpers'

// FastifyInstance mixins

export interface FastifyInstanceMixins {
  unknown: FastifyInstanceMixin<'unknown', {}>,
}

export type FastifyInstanceMixin<T extends AnyMixinName<FastifyInstanceMixins>, V extends object> = Mixin<T, V, FastifyInstanceMixins>

// FastifyRequest mixins

export interface FastifyRequestMixins {
  unknown: FastifyRequestMixin<'unknown', {}>,
}

export type FastifyRequestMixin<T extends AnyMixinName<FastifyRequestMixins>, V extends object> = Mixin<T, V, FastifyRequestMixins>

// FastifyReply mixins

export interface FastifyReplyMixins {
  unknown: FastifyReplyMixin<'unknown', {}>,
}

export type FastifyReplyMixin<T extends AnyMixinName<FastifyReplyMixins>, V extends object> = Mixin<T, V, FastifyReplyMixins>
