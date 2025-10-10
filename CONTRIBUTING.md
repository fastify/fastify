# Contribution Policy

> *"Fastify is an OPEN Open Source Project."*

## Scope of this Policy

This policy is applies to every repository in the
[Fastify GitHub organization](http://www.github.com/fastify).

## Who can contribute?

Anyone is welcome to contribute to the Fastify project, regardless of experience
level.

For more details, see our [informal contributing guide](./docs/Guides/Contributing.md).

### How to become a collaborator?

Individuals making significant and valuable contributions can be given
commit-access to the project to contribute as they see fit. This project is more
like an open wiki than a standard guarded open source project.

If you think you meet the above criteria and we have not invited you yet, then 
feel free to reach out to a [Lead Maintainer](https://github.com/fastify/fastify#team)
privately with some links to contributions, which you consider as significant
and valuable.

We will assess your contributions and, in a reasonable time, get back to you
with our decision.

Read the [GOVERNANCE](GOVERNANCE.md) to get more information.

## Rules

There are a few basic ground rules for contributors:

1. **No `--force` pushes** on `main` or modifying the Git history in any way
   after a PR has been merged.
1. **Non-main branches** ought to be used for ongoing work.
1. **External API changes and significant modifications** ought to be subject to
   an **internal pull request** to solicit feedback from other contributors.
1. Internal pull requests to solicit feedback are *encouraged* for any other
   non-trivial contribution but are left to the discretion of the contributor.
1. Contributors should attempt to adhere to the prevailing code style.
1. At least two contributors, or one core member, must approve pull requests
   before merging.
1. All integrated CI services must be green before a pull request can be merged.
   If any of the CI services is failing for reasons not related to the changes in
   the pull request a core maintainer has to document the reason of the failure
   in the pull request before merging it.
1. Only a lead maintainer is allowed to merge pull requests with SemVer-major
   changes into the `main`-branch of fastify core.
1. If it is not possible to reach a consensus in a pull request, the decision
   is left to the lead maintainer's team.

## AI Usage

It is permissible to use AI tools to assist in writing code, documentation, or
other content for the Fastify project, provided that:

1. The contributor reviews and verifies the output of the AI tool for accuracy,
   security, and compliance with the project standards, especially code style,
   tests, and code quality itself.
1. The contributor clearly documents the significant use of AI tools in the
   commit message or pull request description, including the name of the tool
   used and a brief description of how it was used.
1. The contributor ensures that the use of AI tools does not violate any
   licensing or copyright restrictions.
1. The contributor bears the burden of proof if undocumented AI use is
   suspected.
1. The [code of conduct
](https://github.com/fastify/.github/blob/main/CODE_OF_CONDUCT.md) applies to
   all interactions. 
1. Collaborators are allowed to close pull requests that do not comply with
   the contribution policy with a brief comment regarding the reason for
   closing.
1. It is the prerogative of the collaborators to give a due date, if any, for
   addressing the issues in the pull request before closing it. There is no
   obligation to provide an extension of the due date.
1. Collaborators can request that the contributor disclose any use of AI tools,
   irrespective of the significance of the AI usage.
1. The contributor can discuss the reasons with the collaborators and provide
   proper evidence of non-usage of AI tools or update the pull request
   to comply with these rules.
1. The collaborators are encouraged but not obligated to discuss their
   assessments and/or decisions with the contributor.
1. If the discussion becomes heated, repetitive, or fails to reach a resolution,
   the collaborators can lock the pull request for further comments.
1. Lead maintainers can override the decisions of collaborators regarding this
   policy.
1. Repeated violations of these rules may result in a temporary or permanent ban
   from contributing to the project.

### Definition – Significant Use of AI Tools

Significant use of AI tools refers to situations where AI-generated content
forms a **substantial or functional part** of the contribution — for example,
when the AI output introduces new logic, algorithms, features, or documentation
sections that go beyond minor edits or boilerplate.

A contribution shall be considered to involve significant AI use when:
- The AI-generated output makes up a **non-trivial portion** of the submitted
work (e.g. more than small snippets, formatting, or trivial refactoring), **or**
- The AI tool was used to **design, generate, or refactor logic** that affects
the behavior or structure of the project, **or**
- The contributor cannot **fully verify and explain** the AI-generated content
as if it were written manually.

Minor assistance — such as autocomplete suggestions, linting fixes, rewording
sentences, or generating boilerplate code — is **not considered significant**
and does not require explicit documentation.

When in doubt, contributors are encouraged to **disclose AI usage voluntarily**
to maintain transparency and avoid misunderstandings.

### Examples of significant AI usage:

Examples of how to document the use of AI tools in commit messages or pull request
descriptions:
- "Used ChatGPT to generate initial code for the new feature, then manually
  reviewed and refined it."
- "Documentation updated with the help of GitHub Copilot, ensuring accuracy and
  clarity."
- "Refactored code using AI suggestions from Claude.AI, followed by thorough
  testing."

### Potential comments by collaborators:

Examples of comments to use when closing a pull request due to a violation of
the AI usage policy:
- "This PR is considered to violate the Contribution Policy regarding AI
  Usage. Please document significant use of AI tools.  We will close this PR in
  7 days if no updates are made."
- "Closing this PR due to violation of the Contribution Policy regarding AI
  Usage. Code does not comply with the project's standards."

## Fastify previous versions

Every version of Fastify has its own branch. All Fastify related
changes should be based on the corresponding branch.

We have a [Long Term Support](./docs/Reference/LTS.md) policy that defines
the organization's efforts for each Fastify's version.

|Version|Branch|
|-------|------|
**v1.x**|[branch 1.x](https://github.com/fastify/fastify/tree/1.x)|
**v2.x**|[branch 2.x](https://github.com/fastify/fastify/tree/2.x)|
**v3.x**|[branch 3.x](https://github.com/fastify/fastify/tree/3.x)|
**v4.x**|[branch 4.x](https://github.com/fastify/fastify/tree/4.x)|

## Releases

Declaring formal releases remains the prerogative of the lead maintainers. Do
not bump version numbers in the corresponding `package.json` in pull requests.

## Plugins

Contributors to Fastify plugins must follow the same rules as the main Fastify repository,
 with a few adjustments:

1. Any member can publish a release.
1. The plugin version must follow the [semver](https://semver.org/)
   specification.
1. The Node.js compatibility must match with Fastify's main branch.
1. The new release must have the changelog information stored in the GitHub
     release. For this we suggest adopting a tool like
     [`releasify`](https://github.com/fastify/releasify) to achieve this.
1. PR opened by bots as part of the ci services (like Dependabot) can be merged
   if the CI services are green and the Node.js versions supported are the same
   as the plugin. If any of the CI services is failing for reasons not related
   to the changes in the pull request a maintainer has to document the reason of
   the failure by commenting in the pull request before merging it.

## Changes to this arrangement

Any feedback is welcome! This document may also be subject to pull requests or
changes by contributors where you believe you have something valuable to add or
change.

# Fastify Organization Structure

The Fastify structure is detailed in the [GOVERNANCE](GOVERNANCE.md) document.

### Onboarding Collaborators

Welcome to the team! We are happy to have you. Before you start, please complete
the following tasks:
1. Set up 2 factor authentication for GitHub and NPM
    - [GitHub
    2FA](https://help.github.com/en/articles/securing-your-account-with-two-factor-authentication-2fa)
    - [NPM 2FA](https://docs.npmjs.com/about-two-factor-authentication)
2. Choose which team to join *(more than one is ok!)* based on how you want to
   help.
    - Core team: maintains core Fastify and its documentation
    - Plugins team: maintains Fastify's plugins and its ecosystem
3. Open a pull request to
   [`fastify/fastify:HEAD`](https://github.com/fastify/fastify/pulls) that adds
   your name, username, and email to the team you have chosen in the
   [README.md](./README.md) and [package.json](./package.json) *(if you are part
   of the core team)* files. The member lists are sorted alphabetically by last
   name; make sure to add your name in the proper order.
4. Open a pull request to
   [`fastify/website:HEAD`](https://github.com/fastify/website/pulls) adding
   yourself to the
   [team.yml](https://github.com/fastify/website/blob/HEAD/static/data/team.yml)
   file. This list is also sorted alphabetically so make sure to add your name
   in the proper order. Use your GitHub profile icon for the `picture:` field.
5. Read the [pinned announcements](https://github.com/orgs/fastify/discussions/categories/announcements)
   to be updated with the organization’s news.
6. The person who does the onboarding must add you to the [npm
   org](https://www.npmjs.com/org/fastify), so that you can help maintain the
   official plugins.
7. Optionally, the person can be added as an Open Collective member
   by the lead team.

### Offboarding Collaborators

We are thankful to you and we are really glad to have worked with you. We'd be
really happy to see you here again if you want to come back, but for now the
person that did the onboarding must:
1. Ask the collaborator if they want to stay or not.
1. If the collaborator can't work with us anymore, they should:
  1. Open a pull request to
     [`fastify/fastify:HEAD`](https://github.com/fastify/fastify/pulls) and move
     themselves to the *Past Collaborators* section.
  2. Open a pull request to
     [`fastify/website:HEAD`](https://github.com/fastify/website/pulls) and move
     themselves to the *Past Collaborators* section in the
     [team.yml](https://github.com/fastify/website/blob/HEAD/static/data/team.yml)
     file.

The person that did the onboarding must:
1. If the collaborator does not reply to the ping in a reasonable time, open the
   pull requests described above.
2. Remove the collaborator from the Fastify teams on GitHub.
3. Remove the collaborator from the [npm
   org](https://www.npmjs.com/org/fastify).
4. Remove the collaborator from the Azure team.
5. Remove the collaborator from the Open Collective members.
-----------------------------------------

<a id="developers-certificate-of-origin"></a>
## Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

* (a) The contribution was created in whole or in part by me and I have the
  right to submit it under the open source license indicated in the file; or

* (b) The contribution is based upon previous work that, to the best of my
  knowledge, is covered under an appropriate open source license and I have the
  right under that license to submit that work with modifications, whether
  created in whole or in part by me, under the same open source license (unless
  I am permitted to submit under a different license), as indicated in the file;
  or

* (c) The contribution was provided directly to me by some other person who
  certified (a), (b) or (c) and I have not modified it.

* (d) I understand and agree that this project and the contribution are public
  and that a record of the contribution (including all personal information I
  submit with it, including my sign-off) is maintained indefinitely and may be
  redistributed consistent with this project or the open source license(s)
  involved.
