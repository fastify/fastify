# Security Policy

This document describes the management of vulnerabilities for the Fastify
project and its official plugins.

## Reporting vulnerabilities

Individuals who find potential vulnerabilities in Fastify are invited to
complete a vulnerability report via the dedicated HackerOne page:
[https://hackerone.com/fastify](https://hackerone.com/fastify).

### Strict measures when reporting vulnerabilities

It is of the utmost importance that you read carefully and follow these
guidelines to ensure the ecosystem as a whole isn't disrupted due to improperly
reported vulnerabilities:

* Avoid creating new "informative" reports on HackerOne. Only create new
  HackerOne reports on a vulnerability if you are absolutely sure this should be
  tagged as an actual vulnerability. Third-party vendors and individuals are
  tracking any new vulnerabilities reported in HackerOne and will flag them as
  such for their customers (think about snyk, npm audit, ...).
* HackerOne reports should never be created and triaged by the same person. If
  you are creating a HackerOne report for a vulnerability that you found, or on
  behalf of someone else, there should always be a 2nd Security Team member who
  triages it. If in doubt, invite more Fastify Collaborators to help triage the
  validity of the report. In any case, the report should follow the same process
  as outlined below of inviting the maintainers to review and accept the
  vulnerability.

### Vulnerabilities found outside this process

⚠ The Fastify project does not support any reporting outside the HackerOne
process.

## Handling vulnerability reports

When a potential vulnerability is reported, the following actions are taken:

### Triage

**Delay:** 4 business days

Within 4 business days, a member of the security team provides a first answer to
the individual who submitted the potential vulnerability. The possible responses
can be:

* Acceptance: what was reported is considered as a new vulnerability
* Rejection: what was reported is not considered as a new vulnerability
* Need more information: the security team needs more information in order to
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

At this point, a CVE should be requested through the HackerOne platform through
the UI, which should include the Report ID and a summary.

Within HackerOne, this is handled through a "public disclosure request".

Reference: [HackerOne:
Disclosure](https://docs.hackerone.com/hackers/disclosure.html)

## The Fastify Security team

The core team is responsible for the management of HackerOne program and this
policy and process.

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
