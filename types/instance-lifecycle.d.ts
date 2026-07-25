export interface FastifyListenOptions {
  /** Default to `0` (picks the first available open port). */
  port?: number
  /** Default to `localhost`. */
  host?: string
  /** Ignored when `port` is specified. */
  path?: string
  /** Default to `511`. */
  backlog?: number
  exclusive?: boolean
  /** Makes an IPC pipe readable for all users. */
  readableAll?: boolean
  /** Makes an IPC pipe writable for all users. */
  writableAll?: boolean
  /** Disable dual-stack behavior for an IPv6 TCP server. */
  ipv6Only?: boolean
  /** Close the listening server when this signal is aborted. */
  signal?: AbortSignal
  /** Resolves the text logged after the server starts. */
  listenTextResolver?: (address: string) => string
}
