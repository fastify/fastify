# Fastify Incident Response Process (IRP)

## Purpose

This Incident Response Plan (IRP) outlines the procedures the Fastify
core team will follow in response to security vulnerabilities
reported via the [project's accepted channels](https://github.com/fastify/fastify/blob/main/SECURITY.md).
Our goal is to ensure rapid, consistent, and transparent handling
of such events while minimizing harm to users and contributors.


## Scope

**In Scope:**
- Security vulnerabilities in Fastify code ([all supported versions](https://github.com/fastify/fastify/blob/main/docs/Reference/LTS.md))
- Compromise or abuse of GitHub/GitHub Actions or related infrastructure
- Registry or package issues (e.g., npm hijacking or tampering)
- Dependencies with direct security implications
- Public disclosure of sensitive bugs
- Unusual project activity (e.g., mass spam, rogue commits)


## Roles & Responsibilities

| Role | Responsibility |
|------|----------------|
Reporter | Submit a complete security report to the Security Triage Team
Incident Commander | Leads the response, assigns roles, coordinates communication. Documents the timeline and actions for retrospective
Analyst | Determine if the reported issue is a real vulnerability and identify potential mitigation strategies and workarounds
Remediation Developer | Develop a patch or solution based on the reported vulnerability


## Response Phases

### Step 0: Security Report Received

A [Security Team Member](https://github.com/fastify/fastify/blob/main/SECURITY.md#the-fastify-security-team)
is assigned as Incident Commander and starts the process.

### Step 1: Triage

**Delay:** 4 business days

Within 4 business days, the Incident Commander replies to the reporter.
An Analyst may be assigned to help validate the issue.

Possible responses can be:
- **Accepted**: Confirmed vulnerability
- **Rejected**: Not a vulnerability
- **Need more info**: More details required

Triaging should include updating issue fields:
* Asset - set/create the module affected by the report
* Severity - TBD, currently left empty

Reference: [HackerOne: Submitting
Reports](https://docs.hackerone.com/hackers/submitting-reports.html)

### Step 2: Remediation

**Delay:** 90 days

When a vulnerability is confirmed, a member of the security team volunteers to
follow up on this report becoming the Remediation Developer.

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

### Step 3: Communication and Publication

**Delay:** 90 days

Within 90 days after the triage date, the vulnerability must be made public
by the Incident Commander.

**Severity**: Vulnerability severity is assessed using [CVSS
v.3](https://www.first.org/cvss/user-guide). More information can be found on
[HackerOne documentation](https://docs.hackerone.com/hackers/severity.html)

If a patch is in progress, a delay may be approved by the security team and
reporter.

At this point, a CVE should be requested through the selected platform through
the UI, which should include the Report ID and a summary.

Within HackerOne, this is handled through a "public disclosure request".
Reference: [HackerOne:
Disclosure](https://docs.hackerone.com/hackers/disclosure.html)


## Reporting a Vulnerability

Follow the official [SECURITY policy](https://github.com/fastify/fastify/blob/main/SECURITY.md).


## Security Measures

At Fastify, we are committed to maintaining a secure codebase
through regular vulnerability scanning,
automated security checks in our CI/CD pipelines, and enforced secure
coding practices with mandatory code reviews.
We prioritize fast patch releases for critical issues to protect our users.

To stay protected, users should ensure they are running the latest version of Fastify
and follow general security best practices in their own applications.
