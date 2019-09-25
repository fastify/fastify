<h1 align="center">Fastify</h1>

## Benchmarking
Benchmarking is important if you want to measure how a change can impact the performance of your application. We provide a simple way to benchmark your application from the point of view of a user and contributor. The setup allows you to automate benchmarks in different branches and on different Node.js versions.

The modules we'll use:
- [Autocannon](https://github.com/mcollina/autocannon): A HTTP/1.1 benchmarking tool written in node.
- [Branch-comparer](https://github.com/StarpTech/branch-comparer): Checkout multiple git branches, execute scripts and log the results.
- [Concurrently](https://github.com/kimmobrunfeldt/concurrently): Run commands concurrently.
- [Npx](https://github.com/zkat/npx) NPM package runner - We are using it to run scripts against different Node.js Versions and to execute local binaries. Shipped with npm@5.2.0.

## Simple

### Run the test in the current branch
```sh
npm run benchmark
```

### Run the test against different Node.js versions ✨
```sh
npx -p node@6 -- npm run benchmark
```

## Advanced

### Run the test in different branches
```sh
branchcmp --rounds 2 --script "npm run benchmark"
```

### Run the test in different branches against different Node.js versions ✨
```sh
branchcmp --rounds 2 --script "npm run benchmark"
```

### Compare current branch with master (Gitflow)
```sh
branchcmp --rounds 2 --gitflow --script "npm run benchmark"
```
or
```sh
npm run bench
```

### Run different examples

```sh
branchcmp --rounds 2 -s "node ./node_modules/concurrently -k -s first \"node ./examples/asyncawait.js\" \"node ./node_modules/autocannon -c 100 -d 5 -p 10 localhost:3000/\""
```
