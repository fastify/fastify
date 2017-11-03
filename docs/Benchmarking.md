<h1 align="center">Fastify</h1>

## Benchmarking
Benchmarking is important if you want to measure how a change impact your application performance. We provide a simple way to benchmark your application from the point of view of a user and contributor. The setup allows you to automate benchmarks in different branches on different Node.js versions.

The modules we'll use:
- [Autocannon](https://github.com/mcollina/autocannon): A HTTP/1.1 benchmarking tool written in node.
- [Branch-comparer](https://github.com/StarpTech/branch-comparer): Checkout multiple git branches, execute scripts and log the results.
- [Concurrently](https://github.com/kimmobrunfeldt/concurrently): Run commands concurrently.
- [Npx](https://github.com/zkat/npx) NPM package runner - We using it to run scripts against different Node.js Versions and execute local binaries. Shipped with npm@5.2.0.

## Installation

```sh
npm i -g branch-comparer
```

## Simple

### Run the test in the current branch
```sh
npm run benchmark
```

### Run the test against different Node.js versions
```sh
npx -p node@6 -- npm run benchmark
```

## Advanced

### Run the test in different branches
```sh
branchcmp --rounds 2
```
_Answer the second question with `npm run benchmark`_

### Run the test in different branches against different Node.js versions ✨
```sh
branchcmp --rounds 2
```
_Answer the second question with `npx -p node@6 -- npm run benchmark`_


### Run different examples

```sh
branchcmp --rounds 2
```
_Answer the second question with `node ./node_modules/concurrently -k -s first "node ./examples/asyncawait.js" "node ./node_modules/autocannon -c 100 -d 5 -p 10 localhost:3000/"`_ 
