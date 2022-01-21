import { FastifyTypeProvider } from "./type-provider";
import { FastifyInstanceGenericInterface, GetLogger, GetServer } from "./utils";

export interface FastifyInstance<Generic extends FastifyInstanceGenericInterface> {
  server: GetServer<Generic>
  prefix: string
  version: string
  log: GetLogger<Generic>

  withTypeProvider<Provider extends FastifyTypeProvider>(): FastifyInstance<Generic & { TypeProvider: Provider }>;

  addSchema(schema: unknown): this;
  getSchema(schemaId: string): unknown;
  getSchemas(): Record<string, unknown>;

  after(): this & PromiseLike<undefined>;
  after(afterListener: (err: Error) => void): this;

  close(): Promise<undefined>;
  close(closeListener: () => void): undefined;

  // should be able to define something useful with the decorator getter/setter pattern using Generics to enforce the users function returns what they expect it to
  decorate<T>(property: string | symbol,
    value: T extends (...args: any[]) => any
      ? (this: this, ...args: Parameters<T>) => ReturnType<T>
      : T,
    dependencies?: string[]
  ): this;

  decorateRequest<T>(property: string | symbol,
    value: T extends (...args: any[]) => any
      ? (this: any, ...args: Parameters<T>) => ReturnType<T>
      : T,
    dependencies?: string[]
  ): this;

  decorateReply<T>(property: string | symbol,
    value: T extends (...args: any[]) => any
      ? (this: any, ...args: Parameters<T>) => ReturnType<T>
      : T,
    dependencies?: string[]
  ): this;

  hasDecorator(decorator: string | symbol): boolean;
  hasRequestDecorator(decorator: string | symbol): boolean;
  hasReplyDecorator(decorator: string | symbol): boolean;

  // inject(opts: InjectOptions | string, cb: LightMyRequestCallback): void;
  // inject(opts: InjectOptions | string): Promise<LightMyRequestResponse>;
  // inject(): LightMyRequestChain;
  
  listen(port: number | string, address: string, backlog: number, callback: (err: Error|null, address: string) => void): void;
  listen(port: number | string, address: string, callback: (err: Error|null, address: string) => void): void;
  listen(port: number | string, callback: (err: Error|null, address: string) => void): void;
  listen(port: number | string, address?: string, backlog?: number): Promise<string>;
  listen(opts: { port: number; host?: string; backlog?: number }, callback: (err: Error|null, address: string) => void): void;
  listen(opts: { port: number; host?: string; backlog?: number }): Promise<string>;
  
  ready(): this & PromiseLike<undefined>;
  ready(readyListener: (err: Error) => void): this;

  // register: FastifyRegister<this & PromiseLike<undefined>>;

  routing(request: Generic["Request"], reply: Generic["Reply"]): void;
  // getDefaultRoute: DefaultRoute<RawRequest, RawReply>;
  // setDefaultRoute(defaultRoute: DefaultRoute<RawRequest, RawReply>): void;
}