import { FastifyBaseLogger, FastifyPluginAsync, FastifyPluginCallback, FastifyPluginOptions, FastifyTypeProvider, FastifyTypeProviderDefault, RawServerBase, RawServerDefault } from "../fastify";
import { FastifyDecorators, FastifyInstance } from "../types/instance";

type ExtractSixGeneric<T> = T extends FastifyInstance<any, any, any, any, any, infer U> ? U : void;
type ExtractFirstFunctionParameter<T> = T extends (...args: infer P) => any ? P[0] : void;
export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

// Plugin definition on the `fastify-plugin` library
type PluginMetadata = {
    /** Bare-minimum version of Fastify for your plugin, just add the semver range that you need. */
    fastify?: string,
    name?: string,
    /** Decorator dependencies for this plugin */
    decorators?: {
        fastify?: (string | symbol)[],
        reply?: (string | symbol)[],
        request?: (string | symbol)[]
    },
    /** The plugin dependencies */
    dependencies?: string[],
    encapsulate?: boolean
}

type FastifyPluginDecorators = {
    decorators: FastifyDecorators,
    dependencies: (FastifyPluginCallback<any, any, any, any, any> | FastifyPluginAsync<any, any, any, any, any>)[]
}

declare function fastifyPlugin<
    Decorators extends FastifyPluginDecorators = { decorators: {}, dependencies: [] },
    Options extends FastifyPluginOptions = Record<never, never>,
    RawServer extends RawServerBase = RawServerDefault,
    TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
    Logger extends FastifyBaseLogger = FastifyBaseLogger,
    Fn extends FastifyPluginCallback<Options, RawServer, TypeProvider, Logger,  Decorators["decorators"]> | FastifyPluginAsync<Options, RawServer, TypeProvider, Logger, Decorators["decorators"]> = FastifyPluginCallback<Options, RawServer, TypeProvider, Logger,  Decorators["decorators"]>
>(
    fn: Fn extends unknown ? Fn extends (...args: any) => Promise<any> ? FastifyPluginAsync<
        Options, RawServer, TypeProvider, Logger, Decorators["decorators"] & ExtractSixGeneric<ExtractFirstFunctionParameter<Decorators["dependencies"][number] extends undefined ? {} : Decorators["dependencies"][number]>>
    > : FastifyPluginCallback<
        Options, RawServer, TypeProvider, Logger, Decorators["decorators"] & ExtractSixGeneric<ExtractFirstFunctionParameter<Decorators["dependencies"][number] extends undefined ? {} : Decorators["dependencies"][number]>>
    > : Fn,
    options?: PluginMetadata | string,
): Fn;

// Used to type plugins written in javascript
export type GetPluginTypes<Decorators extends FastifyPluginDecorators = { decorators: {}, dependencies: [] }> = FastifyPluginCallback<{}, RawServerBase, FastifyTypeProviderDefault, FastifyBaseLogger,  Decorators["decorators"] & ExtractSixGeneric<ExtractFirstFunctionParameter<Decorators["dependencies"][number] extends undefined ? {} : Decorators["dependencies"][number]>>>;

// Testing types
const a = fastifyPlugin<{
    decorators: {
        fastify: {
            someProperty: string
        },
        request: {
            say: (message: string) => void
        },
        reply: {
            sendFile: (filePath: string) => void
        }
    },
    dependencies: []
}>((fastify) => {
    fastify.someProperty; // We can access additinal properties

    fastify.get("/", (req, res) => {
        req.say("Hello World");

        res.sendFile("./index.html");
    })
});

fastifyPlugin<{ decorators: {}, dependencies: [typeof a] }>((fastify) => {
    fastify.someProperty;
    
    fastify.get("/", (req, res) => {
        req.say("Hello World");

        res.sendFile("./index.html");
    });
}, {});



