<h1 align="center">Fastify</h1>

## Long Term Support
<a id="lts"></a>

Fastify's Long Term Support (LTS) is provided according to the schedule laid out
in this document:

1. Major releases, "X" release of [semantic versioning][semver] X.Y.Z release
   versions, are supported for a minimum period of six months from their release
   date. The release date of any specific version can be found at
   [https://github.com/fastify/fastify/releases](https://github.com/fastify/fastify/releases).

2. Major releases will receive security updates for an additional six months
   from the release of the next major release. After this period we will still
   review and release security fixes as long as they are provided by the
   community and they do not violate other constraints, e.g. minimum supported
   Node.js version.

3. Major releases will be tested and verified against all Node.js release lines
   that are supported by the [Node.js LTS
   policy](https://github.com/nodejs/Release) within the LTS period of that
   given Fastify release line. This implies that only the latest Node.js release
   of a given line is supported.

A "month" is defined as 30 consecutive days.

> ## Security Releases and Semver
>
> As a consequence of providing long-term support for major releases, there are
> occasions where we need to release breaking changes as a _minor_ version
> release. Such changes will _always_ be noted in the [release
> notes](https://github.com/fastify/fastify/releases).
>
> To avoid automatically receiving breaking security updates it is possible to
> use the tilde (`~`) range qualifier. For example, to get patches for the 3.15
> release, and avoid automatically updating to the 3.16 release, specify the
> dependency as `"fastify": "~3.15.x"`. This will leave your application
> vulnerable, so please use with caution.

[semver]: https://semver.org/

### Schedule
<a id="lts-schedule"></a>

| Version | Release Date | End Of LTS Date | Node.js              |
| :------ | :----------- | :-------------- | :------------------- |
| 1.0.0   | 2018-03-06   | 2019-09-01      | 6, 8, 9, 10, 11      |
| 2.0.0   | 2019-02-25   | 2021-01-31      | 6, 8, 10, 12, 14     |
| 3.0.0   | 2020-07-07   | TBD             | 10, 12, 14, 16       |

### CI tested operating systems
<a id="supported-os"></a>

Fastify uses GitHub Actions for CI testing, please refer to [GitHub's
documentation regarding workflow
runners](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners#supported-runners-and-hardware-resources)
for further details on what the latest virtual environment is in relation to the
YAML workflow labels below:

| OS      | YAML Workflow Label    | Package Manager           | Node.js      |
|---------|------------------------|---------------------------|--------------|
| Linux   | `ubuntu-latest`        | npm                       | 10,12,14,16  |
| Linux   | `ubuntu-18.04`         | yarn,pnpm                 | 10,12        |
| Windows | `windows-latest`       | npm                       | 10,12,14,16  |
| MacOS   | `macos-latest`         | npm                       | 10,12,14,16  |

Using [yarn](https://yarnpkg.com/) might require passing the `--ignore-engines`
flag.
