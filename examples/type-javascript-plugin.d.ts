import { GetPluginTypes } from "./typescript-plugin-safety";

// We can now declare plugins written in javascript using `GetPluginTypes`
declare const a: GetPluginTypes<{ decorators: { request: { name: string } }, dependencies: [] }>
declare const b: GetPluginTypes<{ decorators: { fastify: { sendRequest: () => void } }, dependencies: [typeof a] }>