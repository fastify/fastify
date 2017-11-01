<h1 align="center">Fastify</h1>

## Benchmarking
Benchmarking is important if you want to measure how a change impact your application performance. We provide a simple way to benchmark your application in point of view a user and as a contributor.

The modules we'll use:
- [Autocannon](https://github.com/mcollina/autocannon): A HTTP/1.1 benchmarking tool written in node.
- [Branch-comparer](https://github.com/StarpTech/branch-comparer): Checkout multiple git repositorys, execute scripts and log the results.
- [Concurrently](https://github.com/kimmobrunfeldt/concurrently): Run commands concurrently.

## Installation

```sh
npm i -g branch-comparer
```

### Simple
```sh
npm run benchmark
```

### To compare multiple branches
```sh
branchcmp
```
_Answer the second question with `npm run benchmark`._ 
