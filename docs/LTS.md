<h1 align="center">Fastify</h1>

<a name="lts"></a>

## Long Term Support

Fastify's Long Term Support (LTS) is provided according the schedule laid
out in this document:

1. Major releases, "X" release of [semantic versioning][semver] X.Y.Z release
   versions, are supported for a minimum period of six months from their release
   date. The release date of any specific version can be found at
   [https://github.com/fastify/fastify/releases](https://github.com/fastify/fastify/releases).

1. Major releases will receive security updates for an additional six months
   from the release of the next major release.

A "month" is to be a period of 30 consecutive days.

[semver]: https://semver.org/

<a name="lts-schedule"></a>

### Schedule

| Version | Release Date | End Of LTS Date |
| :------ | :----------- | :-------------- |
| 1.0.0   | 2018-03-06   | TBD             |

<a name="supported-os"></a>

### CI tested operating systems

| CI             | OS      | Version        | Package Manager | Node.js        |
| :------------- | :------ | :------------- | :-------------- | :------------- |
| Travis         | Linux   | Ubuntu 14.04   | npm             | 6,8,9,10       |
| Azure pipeline | Linux   | Ubuntu 16.04   | yarn            | ~~6¹~~,8,10,11 |
| Azure pipeline | Windows | vs2017-win2016 | npm             | 6,8,10,11      |

_¹ yarn supports only node >= 8_
