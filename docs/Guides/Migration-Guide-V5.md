# V5 Migration Guide

This guide is intended to help with migration from Fastify v4 to v5.

Before migrating to v5, please ensure that you have fixed all deprecation
warnings from v4. All v4 deprecations have been removed and they will no longer
work after upgrading.

## Breaking Changes

### `useSemicolonDelimiter` false by default

Starting with v5, Fastify instances will no longer default to supporting the use
of semicolon delimiters in the query string as they did in v4.
This is due to it being non-standard
behavior and not adhering to [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986#section-3.4).

If you still wish to use semicolons as delimiters, you can do so by
setting `useSemicolonDelimiter: true` in the server configuration.

