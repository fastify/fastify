<h1 align="center">Fastify</h1>

## Benchmarking
Benchmarking is important if you want to measure how a change impact your application performance. We provide a simple way to benchmark your application from the point of view of a user and contributor.

The modules we'll use:
- [Autocannon](https://github.com/mcollina/autocannon): A HTTP/1.1 benchmarking tool written in node.
- [Branch-comparer](https://github.com/StarpTech/branch-comparer): Checkout multiple git branches, execute scripts and log the results.
- [Concurrently](https://github.com/kimmobrunfeldt/concurrently): Run commands concurrently.

## Installation

```sh
npm i -g branch-comparer
```

### Simple
```sh
npm run benchmark
```

### Compare multiple branches
```sh
branchcmp --rounds 2
```
_Answer the second question with `npm run benchmark`._ 

### Run different examples

```sh
branchcmp
```
_Answer the second question with `node ./node_modules/concurrently -k -s first "node ./examples/asyncawait.js" "node ./node_modules/autocannon -c 100 -d 5 -p 10 localhost:3000/"`._ 
