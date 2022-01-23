<h1 align="center">Fastify</h1>

## Analyse comparative

L'analyse comparative est importante si vous souhaitez mesurer comment un changement peut affecter les performances de votre application. Nous fournissons un moyen simple de comparer votre application du point de vue d'un utilisateur et d'un contributeur. La configuration vous permet d'automatiser les benchmarks dans différentes branches et sur différentes versions de Node.js.

Les modules que nous utiliserons :

- [Autocannon](https://github.com/mcollina/autocannon): Un outil de benchmarking HTTP/1.1 écrit en node.
- [Branch-comparer](https://github.com/StarpTech/branch-comparer): vérifiez plusieurs branches git, exécutez des scripts et enregistrez les résultats.
- [Concurrently](https://github.com/kimmobrunfeldt/concurrently): Exécute les commandes simultanément.
- [Npx](https://github.com/npm/npx): exécuteur de package NPM utilisé pour exécuter des scripts sur différentes versions de Node.js et pour exécuter des binaires locaux. Livré avec npm@5.2.0.

## Simple

### Exécuter le test dans la branche actuelle

```sh
npm run benchmark
```

### Exécutez le test sur différentes versions de Node.js ✨

```sh
npx -p node@10 -- npm run benchmark
```

## Avancée

### Exécutez le test dans différentes branches

```sh
branchcmp --rounds 2 --script "npm run benchmark"
```

### Exécutez le test dans différentes branches avec différentes versions de Node.js ✨

```sh
branchcmp --rounds 2 --script "npm run benchmark"
```

### Comparer la branche actuelle avec main (Gitflow)

```sh
branchcmp --rounds 2 --gitflow --script "npm run benchmark"
```

ou

```sh
npm run bench
```

### Exécuter différents exemples

```sh
branchcmp --rounds 2 -s "node ./node_modules/concurrently -k -s first \"node ./examples/asyncawait.js\" \"node ./node_modules/autocannon -c 100 -d 5 -p 10 localhost:3000/\""
```
