# Expense Policy

Fastify is an OpenJS Foundation project, and it accepts donations through the
[Open Collective](https://opencollective.com/fastify/) platform to enhance the project and support the community.

This document outlines the process for requesting reimbursement or an invoice for expenses.

## Reimbursement

Reimbursement is applicable for expenses already paid, such as:

- Stickers
- Gadgets
- Hosting

**Before making any purchases**, initiate a [new discussion](https://github.com/orgs/fastify/discussions) in the `fastify` organization with the following information:

- What is needed
- Why it is needed
- Cost
- Deadline

Once the discussion is approved by a Lead maintainer and with no unresolved objections,
the purchase can proceed, and an expense can be submitted to the [Open Collective][submit].
This process takes a minimum of 3 business days from the request to allow time for discussion approval.

The discussion helps prevent misunderstandings and ensures the expense isn't rejected.
As a project under the OpenJS Foundation, Fastify benefits from the Foundation's resources,
including servers, domains, and [travel funds](https://github.com/openjs-foundation/community-fund/tree/main/programs/travel-fund).

Always seek approval first.

## Invoice

Invoices are for services provided to the Fastify project, such as PR reviews, documentation, etc.
A VAT number is not required to submit an invoice.
Refer to the [Open Collective documentation][openc_docs] for details.

### Adding a bounty to an issue

Issues become eligible for a bounty when the Core Team adds the `bounty` label,
with the amount determined by the Core Team based on `estimated hours * rate` (suggested $50 per hour).

> Example: If the estimated time to fix the issue is 2 hours, the bounty will be $100.

To add a bounty:

- Apply the `bounty` label to the issue
- Comment on the issue with the bounty amount
- Edit the first comment of the issue using this template:

```
## 💰 Bounty

This issue has a bounty of [$AMOUNT](LINK TO THE BOUNTY COMMENT).
_Read more about [the bounty program](./EXPENSE_POLICY.md)_
```

For discussions on bounties or determining amounts, open a [new discussion](https://github.com/orgs/fastify/discussions/new?category=bounty).

### Outstanding contributions

The Lead Team can decide to add a bounty to an issue or PR not labeled as `bounty` if the contribution is outstanding.

### Claiming a bounty

To claim a bounty:

- Submit a PR that fixes the issue
- If multiple submissions exist, a Core Member will choose the best solution
- Once merged, the PR author can claim the bounty by:
  - Submitting an expense to the [Open Collective][submit] with the PR link
  - Adding a comment on the PR with a link to their Open Collective expense to ensure the claimant is the issue resolver
- The expense will be validated by a Lead maintainer and then the payment will be processed by Open Collective

If the Open Collective budget is insufficient, the expense will be rejected.  
Unclaimed bounties are available for other issues.

[submit]: https://opencollective.com/fastify/expenses/new
[openc_docs]: https://docs.oscollective.org/how-it-works/basics/invoice-and-reimbursement-examples