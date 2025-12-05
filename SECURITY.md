# Security Policy

This document describes the management of vulnerabilities for the Fastify
project and its official plugins.

## Threat Model

This section describes the Fastify threat model, rooted in and extending the
[Node.js threat model](https://github.com/nodejs/node/blob/main/SECURITY.md#the-nodejs-threat-model).

### Trust Model

Fastify inherits Node.js's trust model and extends it to web application
contexts.

#### What Fastify Trusts

1. **The runtime environment**: Fastify trusts Node.js, the operating system,
   and the infrastructure it runs on.

2. **Application code**: All code registered with Fastify (plugins, route
   handlers, hooks, decorators) is trusted. This includes:
   - Plugins registered via `fastify.register()`
   - Route handlers
   - Lifecycle hooks (`onRequest`, `preHandler`, `preSerialization`, etc.)
   - Custom validators and serializers
   - Content type parsers
   - Error handlers

3. **Schema definitions**: Route schemas for validation and serialization are
   treated as application code. They are compiled using `new Function()` for
   performance and must come from trusted sources.

4. **Configuration options**: All options passed to the Fastify factory function
   and route definitions are trusted.

#### What Fastify Does NOT Trust

1. **Network input from clients**: All incoming HTTP requests (headers, body,
   query strings, URL parameters) are considered untrusted by default.

2. **Data from upstream services** (when Fastify acts as a client): Response
   data from external APIs or services should be validated before use.

### What Constitutes a Security Vulnerability

A security vulnerability in Fastify must meet the following criteria:

#### Vulnerabilities We Address

1. **Request parsing flaws leading to request smuggling**: Defects in how
   Fastify or its dependencies parse HTTP requests that could enable request
   smuggling attacks.

2. **Prototype poisoning bypasses**: If Fastify's built-in prototype poisoning
   protection (`onProtoPoisoning`, `onConstructorPoisoning`) can be circumvented
   when set to `'error'` or `'remove'`.

3. **Schema validation bypasses**: When schema validation is properly configured
   but malicious data passes through undetected (note: validation only runs for
   `application/json` content type by default).

4. **Information disclosure through error handling**: Default error responses or
   logging that expose sensitive implementation details, stack traces, or
   internal paths to clients.

5. **Denial of Service through Fastify's own code**: Resource exhaustion
   vulnerabilities in Fastify's core code paths that can be triggered by crafted
   requests, including:
   - Algorithmic complexity attacks (e.g., ReDoS in routing)
   - Memory exhaustion in body parsing
   - CPU exhaustion in serialization

6. **Default configuration security issues**: If default settings create
   security vulnerabilities for applications following documentation guidelines.

#### What Is NOT a Vulnerability in Fastify

The following scenarios are **not** considered security vulnerabilities in
Fastify:

1. **Malicious plugins**: Plugins are trusted code. A malicious plugin that
   exfiltrates data or causes harm is not a Fastify vulnerability.

2. **User input mishandling by application code**: If application code fails to
   sanitize user input before using it in dangerous operations (SQL injection,
   command injection, etc.), this is an application bug.

3. **Prototype pollution via application code**: If application code manipulates
   request objects with `Object.assign()` or similar before validation, enabling
   prototype poisoning, this is an application-level issue. Fastify provides
   `onProtoPoisoning` protection at the JSON parsing stage.

4. **Missing validation schemas**: If routes lack validation schemas,
   unvalidated data reaching handlers is expected behavior, not a vulnerability.

5. **Disabled security features**: Vulnerabilities that only manifest when
   security features are explicitly disabled (e.g., `onProtoPoisoning: 'ignore'`).

6. **DoS via application-level resource exhaustion**: Slow database queries,
   expensive computations in handlers, or resource exhaustion caused by
   application logic.

7. **Vulnerabilities in dependencies**: Security issues in npm dependencies
   should be reported to the respective projects. However, if Fastify uses a
   dependency in an insecure manner, that is a Fastify issue.

8. **Misconfigured reverse proxy trust**: Issues arising from incorrect
   `trustProxy` configuration, as this is documented and intentional behavior.

9. **Schema injection from user input**: If user-provided data is used to
   construct validation schemas (which use `new Function()`), this is documented
   as unsafe and is an application bug.

### Security-Relevant Features

#### Built-in Protections

| Feature | Description | Default |
|---------|-------------|---------|
| `onProtoPoisoning` | Handles `__proto__` in JSON bodies | `'error'` |
| `onConstructorPoisoning` | Handles `constructor` in JSON bodies | `'error'` |
| `bodyLimit` | Maximum request body size | 1 MiB |
| `maxParamLength` | Maximum URL parameter length (ReDoS protection) | 100 |
| `requestTimeout` | Maximum time for receiving entire request | `0` (disabled) |
| `allowUnsafeRegex` | Allows potentially dangerous regex in routes | `false` |
| Schema validation with `allErrors: false` | Prevents DoS via validation | Enabled |

#### Security Recommendations

1. **Always use a reverse proxy**: Fastify strongly recommends deploying behind
   a reverse proxy (nginx, HAProxy) for TLS termination, rate limiting, and
   additional security layers.

2. **Set `requestTimeout`**: When not behind a reverse proxy, configure
   `requestTimeout` to protect against slowloris attacks.

3. **Define validation schemas**: Use JSON Schema validation for all route
   inputs (body, querystring, params, headers).

4. **Define response schemas**: Use response serialization schemas to prevent
   accidental data leakage and improve performance.

5. **Avoid `$async` validation for untrusted input**: Database lookups during
   validation can enable DoS attacks.

6. **Use encapsulation**: Leverage Fastify's plugin encapsulation to isolate
   functionality and limit blast radius.

### Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TRUSTED ZONE                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Application Code                                              │  │
│  │  • Plugins                                                    │  │
│  │  • Route handlers                                             │  │
│  │  • Hooks                                                      │  │
│  │  • Schemas (validation & serialization)                       │  │
│  │  • Custom parsers                                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Fastify Core                                                  │  │
│  │  • Request lifecycle                                          │  │
│  │  • Routing (find-my-way)                                      │  │
│  │  • Validation (Ajv)                                           │  │
│  │  • Serialization (fast-json-stringify)                        │  │
│  │  • JSON parsing (secure-json-parse)                           │  │
│  │  • Plugin encapsulation (avvio)                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Node.js Runtime                                               │  │
│  │  • HTTP server                                                │  │
│  │  • Event loop                                                 │  │
│  │  • V8 engine                                                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               │
═══════════════════════════════╪═══════════════════════════════════════
              TRUST BOUNDARY   │
═══════════════════════════════╪═══════════════════════════════════════
                               │
┌─────────────────────────────────────────────────────────────────────┐
│                        UNTRUSTED ZONE                               │
│  • HTTP request headers                                             │
│  • HTTP request body                                                │
│  • Query string parameters                                          │
│  • URL path and parameters                                          │
│  • Client IP (unless trustProxy configured)                         │
│  • X-Forwarded-* headers (unless trustProxy configured)             │
└─────────────────────────────────────────────────────────────────────┘
```

### Request Lifecycle Security Points

The Fastify request lifecycle provides multiple security intervention points:

1. **`onRequest`**: Early request inspection (authentication, rate limiting)
2. **`preParsing`**: Stream manipulation before body parsing (decompression,
   decryption)
3. **Body Parsing**: Applies `bodyLimit`, prototype poisoning protection
4. **`preValidation`**: Last chance to modify data before validation
5. **Validation**: JSON Schema validation via Ajv
6. **`preHandler`**: Post-validation, pre-business logic (authorization)
7. **Handler**: Business logic execution
8. **`preSerialization`**: Response transformation
9. **Serialization**: Response schema enforcement (prevents data leakage)
10. **`onSend`**: Final response modification
11. **`onResponse`**: Post-response logging/metrics

### Encapsulation Security Model

Fastify's encapsulation model provides security isolation:

- Plugins registered in child contexts cannot access parent context's non-shared
  state
- Parent contexts cannot access child context state
- Decorators, hooks, and parsers follow encapsulation boundaries
- `fastify-plugin` intentionally breaks encapsulation (use with caution)

This enables:
- Isolating authentication to specific route prefixes
- Limiting plugin access to sensitive decorators
- Containing the blast radius of compromised plugins

## Reporting vulnerabilities

Individuals who find potential vulnerabilities in Fastify are invited to
complete a vulnerability report via the dedicated pages:

1. [HackerOne](https://hackerone.com/fastify)
2. [GitHub Security Advisory](https://github.com/fastify/fastify/security/advisories/new)

### Strict measures when reporting vulnerabilities

It is of the utmost importance that you read carefully and follow these
guidelines to ensure the ecosystem as a whole isn't disrupted due to improperly
reported vulnerabilities:

* Avoid creating new "informative" reports. Only create new
  reports on a vulnerability if you are absolutely sure this should be
  tagged as an actual vulnerability. Third-party vendors and individuals are
  tracking any new vulnerabilities reported in HackerOne or GitHub and will flag
  them as such for their customers (think about snyk, npm audit, ...).
* Security reports should never be created and triaged by the same person. If
  you are creating a report for a vulnerability that you found, or on
  behalf of someone else, there should always be a 2nd Security Team member who
  triages it. If in doubt, invite more Fastify Collaborators to help triage the
  validity of the report. In any case, the report should follow the same process
  as outlined below of inviting the maintainers to review and accept the
  vulnerability.
* ***Do not*** attempt to show CI/CD vulnerabilities by creating new pull
  requests to any of the Fastify organization's repositories. Doing so will
  result in a [content report][cr] to GitHub as an unsolicited exploit.
  The proper way to provide such reports is by creating a new repository,
  configured in the same manner as the repository you would like to submit
  a report about, and with a pull request to your own repository showing
  the proof of concept.

[cr]: https://docs.github.com/en/communities/maintaining-your-safety-on-github/reporting-abuse-or-spam#reporting-an-issue-or-pull-request

### Vulnerabilities found outside this process

⚠ The Fastify project does not support any reporting outside the process mentioned
in this document.

## Handling vulnerability reports

When a potential vulnerability is reported, the following actions are taken:

### Triage

**Delay:** 4 business days

Within 4 business days, a member of the security team provides a first answer to
the individual who submitted the potential vulnerability. The possible responses
can be:

* **Acceptance**: what was reported is considered as a new vulnerability
* **Rejection**: what was reported is not considered as a new vulnerability
* **Need more information**: the security team needs more information in order to
  evaluate what was reported.

Triaging should include updating issue fields:
* Asset - set/create the module affected by the report
* Severity - TBD, currently left empty

Reference: [HackerOne: Submitting
Reports](https://docs.hackerone.com/hackers/submitting-reports.html)

### Correction follow-up

**Delay:** 90 days

When a vulnerability is confirmed, a member of the security team volunteers to
follow up on this report.

With the help of the individual who reported the vulnerability, they contact the
maintainers of the vulnerable package to make them aware of the vulnerability.
The maintainers can be invited as participants to the reported issue.

With the package maintainer, they define a release date for the publication of
the vulnerability. Ideally, this release date should not happen before the
package has been patched.

The report's vulnerable versions upper limit should be set to:
* `*` if there is no fixed version available by the time of publishing the
  report.
* the last vulnerable version. For example: `<=1.2.3` if a fix exists in `1.2.4`

### Publication

**Delay:** 90 days

Within 90 days after the triage date, the vulnerability must be made public.

**Severity**: Vulnerability severity is assessed using [CVSS
v.3](https://www.first.org/cvss/user-guide). More information can be found on
[HackerOne documentation](https://docs.hackerone.com/hackers/severity.html)

If the package maintainer is actively developing a patch, an additional delay
can be added with the approval of the security team and the individual who
reported the vulnerability.

At this point, a CVE should be requested through the selected platform through
the UI, which should include the Report ID and a summary.

Within HackerOne, this is handled through a "public disclosure request".

Reference: [HackerOne:
Disclosure](https://docs.hackerone.com/hackers/disclosure.html)

## The Fastify Security team

The core team is responsible for the management of the security program and
this policy and process.

Members of this team are expected to keep all information that they have
privileged access to by being on the team completely private to the team. This
includes agreeing to not notify anyone outside the team of issues that have not
yet been disclosed publicly, including the existence of issues, expectations of
upcoming releases, and patching of any issues other than in the process of their
work as a member of the Fastify Core team.

### Members

* [__Matteo Collina__](https://github.com/mcollina),
  <https://twitter.com/matteocollina>, <https://www.npmjs.com/~matteo.collina>
* [__Tomas Della Vedova__](https://github.com/delvedor),
  <https://twitter.com/delvedor>, <https://www.npmjs.com/~delvedor>
* [__Vincent Le Goff__](https://github.com/zekth)
* [__KaKa Ng__](https://github.com/climba03003)
* [__James Sumners__](https://github.com/jsumners),
  <https://twitter.com/jsumners79>, <https://www.npmjs.com/~jsumners>

## OpenSSF CII Best Practices

[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/7585/badge)](https://bestpractices.coreinfrastructure.org/projects/7585)

There are three “tiers”: passing, silver, and gold.

### Passing
We meet 100% of the “passing” criteria.

### Silver
We meet 87% of the "silver" criteria. The gaps are as follows:
  - we do not have a DCO or a CLA process for contributions.
  - we do not currently document "the architecture (aka high-level design)"
    for our project.

### Gold
We meet 70% of the “gold” criteria. The gaps are as follows:
  - we do not yet have the “silver” badge; see all the gaps above.
  - We do not include a copyright or license statement in each source file.
    Efforts are underway to change this archaic practice into a
    suggestion instead of a hard requirement.
  - There are a few unanswered questions around cryptography that are
    waiting for clarification.
