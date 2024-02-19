# V5 Migration Guide

This guide is intended to help with migration from Fastify v4 to v5.

Before migrating to v5, please ensure that you have fixed all deprecation
warnings from v4. All v4 deprecations have been removed and they will no longer
work after upgrading.

## Breaking Changes

### `useSemicolonDelimiter` false by default

Starting with v5, every Fastify instance will not support the use of semicolon
delimiter by default in querystring. The behavior in v4 and eariler versions is
non standard behavior and this change should have no effect on the standard
implementation of Fastify. You can revert this behavior by setting
`useSemicolonDelimiter: true` in the server options.

