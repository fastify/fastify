<h1 align="center">Fastify</h1>

# Le guide de l'auto-stoppeur sur les plugins

Tout d'abord,, `DON'T PANIC`!

Fastify a été conçu dès le départ pour être un système extrêmement modulaire. Nous avons construit une API puissante qui vous permet d'ajouter des méthodes et des utilitaires à Fastify en créant un espace de noms. Nous avons construit un système qui crée un modèle d'encapsulation, qui vous permet de diviser votre application en plusieurs microservices à tout moment, sans avoir besoin de refactoriser l'ensemble de l'application.

**Table des matières**

- [The hitchhiker's guide to plugins](#the-hitchhikers-guide-to-plugins)
  - [Register](#register)
  - [Decorators](#decorators)
  - [Hooks](#hooks)
  - [How to handle encapsulation and
    distribution](#how-to-handle-encapsulation-and-distribution)
  - [ESM support](#esm-support)
  - [Handle errors](#handle-errors)
  - [Custom errors](#custom-errors)
  - [Emit Warnings](#emit-warnings)
  - [Let's start!](#lets-start)

## S'inscrire

<a id="register"></a>

Comme avec JavaScript, où tout est un objet, dans Fastify tout est un plugin.

Vos routes, vos utilitaires, etc. sont tous des plugins. Pour ajouter un nouveau plugin, quelle que soit sa fonctionnalité, dans Fastify vous disposez d'une API sympa et unique :[`register`](../Reference/Plugins.md).

```js
fastify.register(require('./my-plugin'), { options });
```

`register` crée un nouveau contexte Fastify, ce qui signifie que si vous effectuez des modifications sur l'instance Fastify, ces modifications ne seront pas reflétées dans les ancêtres du contexte. En d'autres termes, l'encapsulation !

_Pourquoi l'encapsulation est-elle importante ?_

Eh bien, disons que vous créez une nouvelle startup disruptive, que faites-vous ? Vous créez un serveur API avec toutes vos affaires, tout au même endroit, un monolithe !

Ok, vous grandissez très vite et vous voulez changer votre architecture et essayer les microservices. Habituellement, cela implique une énorme quantité de travail, en raison des dépendances croisées et du manque de séparation des préoccupations dans la base de code.

Fastify vous aide à cet égard. Grâce au modèle d'encapsulation, il évitera complètement les dépendances croisées et vous aidera à structurer votre code en blocs cohésifs.

_Revenons à la façon d'utiliser correctement `register`._

Comme vous le savez probablement, les plugins requis doivent exposer une seule fonction avec la signature suivante

```js
module.exports = function (fastify, options, done) {};
```

Où `fastify` est l'instance Fastify encapsulée, `options` est l'objet options et `done` est la fonction que vous **devez** appeler lorsque votre plugin est prêt
Le modèle de plugin de Fastify est entièrement réentrant et basé sur des graphes, il gère le code asynchrone sans aucun problème et il applique à la fois le chargement et l'ordre de fermeture des plugins. Comment? Heureux que vous ayez demandé, vérifiez
[`avvio`](https://github.com/mcollina/avvio)! Fastify commence à charger le plugin **après** `.listen()`, `.inject()` ou `.ready()` sont appelés.

À l'intérieur d'un plugin, vous pouvez faire ce que vous voulez, enregistrer des routes, des utilitaires (nous verrons cela dans un instant) et faire des registres imbriqués, n'oubliez pas d'appeler `done`
quand tout est configuré !

```js
module.exports = function (fastify, options, done) {
  fastify.get('/plugin', (request, reply) => {
    reply.send({ hello: 'world' });
  });

  done();
};
```

Bon, maintenant vous savez comment utiliser l'API `register` , vous vous demandez comment ajouter de nouvelles fonctionnalités à Fastify et encore mieux, les partager avec d'autres développeurs ?

## Décorateurs

<a id="decorators"></a>

D'accord, disons que vous avez écrit un utilitaire qui est si bon que vous avez décidé de le rendre disponible avec tout votre code. Comment feriez-vous ? Probablement quelque chose comme ce qui suit :

```js
// your-awesome-utility.js
module.exports = function (a, b) {
  return a + b;
};
```

```js
const util = require('./your-awesome-utility');
console.log(util('that is ', 'awesome'));
```

Maintenant, vous allez importer votre utilitaire dans chaque fichier dans lequel vous en avez besoin. (Et n'oubliez pas que vous en aurez probablement aussi besoin dans vos tests).

Fastify vous offre un moyen plus élégant et confortable de le faire, décorateurs . Créer un décorateur est extrêmement simple, il suffit d'utiliser l'API
[`decorate`](../Reference/Decorators.md) :

```js
fastify.decorate('util', (a, b) => a + b);
```

Now you can access your utility just by calling `fastify.util` whenever you need
it - even inside your test.

And here starts the magic; do you remember how just now we were talking about
encapsulation? Well, using `register` and `decorate` in conjunction enable
exactly that, let me show you an example to clarify this:

```js
fastify.register((instance, opts, done) => {
  instance.decorate('util', (a, b) => a + b);
  console.log(instance.util('that is ', 'awesome'));

  done();
});

fastify.register((instance, opts, done) => {
  console.log(instance.util('that is ', 'awesome')); // This will throw an error

  done();
});
```

Inside the second register call `instance.util` will throw an error because
`util` exists only inside the first register context.

Let's step back for a moment and dig deeper into this: every time you use the
`register` API, a new context is created which avoids the negative situations
mentioned above.

Do note that encapsulation applies to the ancestors and siblings, but not the
children.

```js
fastify.register((instance, opts, done) => {
  instance.decorate('util', (a, b) => a + b);
  console.log(instance.util('that is ', 'awesome'));

  fastify.register((instance, opts, done) => {
    console.log(instance.util('that is ', 'awesome')); // This will not throw an error
    done();
  });

  done();
});

fastify.register((instance, opts, done) => {
  console.log(instance.util('that is ', 'awesome')); // This will throw an error

  done();
});
```

_Take home message: if you need a utility that is available in every part of
your application, take care that it is declared in the root scope of your
application. If that is not an option, you can use the `fastify-plugin` utility
as described [here](#distribution)._

`decorate` is not the only API that you can use to extend the server
functionality, you can also use `decorateRequest` and `decorateReply`.

_`decorateRequest` and `decorateReply`? Why do we need them if we already have
`decorate`?_

Good question, we added them to make Fastify more developer-friendly. Let's see
an example:

```js
fastify.decorate('html', (payload) => {
  return generateHtml(payload);
});

fastify.get('/html', (request, reply) => {
  reply.type('text/html').send(fastify.html({ hello: 'world' }));
});
```

It works, but it could be much better!

```js
fastify.decorateReply('html', function (payload) {
  this.type('text/html'); // This is the 'Reply' object
  this.send(generateHtml(payload));
});

fastify.get('/html', (request, reply) => {
  reply.html({ hello: 'world' });
});
```

In the same way you can do this for the `request` object:

```js
fastify.decorate('getHeader', (req, header) => {
  return req.headers[header];
});

fastify.addHook('preHandler', (request, reply, done) => {
  request.isHappy = fastify.getHeader(request.raw, 'happy');
  done();
});

fastify.get('/happiness', (request, reply) => {
  reply.send({ happy: request.isHappy });
});
```

Again, it works, but it can be much better!

```js
fastify.decorateRequest('setHeader', function (header) {
  this.isHappy = this.headers[header];
});

fastify.decorateRequest('isHappy', false); // This will be added to the Request object prototype, yay speed!

fastify.addHook('preHandler', (request, reply, done) => {
  request.setHeader('happy');
  done();
});

fastify.get('/happiness', (request, reply) => {
  reply.send({ happy: request.isHappy });
});
```

We have seen how to extend server functionality and how to handle the
encapsulation system, but what if you need to add a function that must be
executed every time when the server "[emits](../Reference/Lifecycle.md)" an
event?

## Hooks

<a id="hooks"></a>

You just built an amazing utility, but now you need to execute that for every
request, this is what you will likely do:

```js
fastify.decorate('util', (request, key, value) => {
  request[key] = value;
});

fastify.get('/plugin1', (request, reply) => {
  fastify.util(request, 'timestamp', new Date());
  reply.send(request);
});

fastify.get('/plugin2', (request, reply) => {
  fastify.util(request, 'timestamp', new Date());
  reply.send(request);
});
```

I think we all agree that this is terrible. Repeated code, awful readability and
it cannot scale.

So what can you do to avoid this annoying issue? Yes, you are right, use a
[hook](../Reference/Hooks.md)!

```js
fastify.decorate('util', (request, key, value) => {
  request[key] = value;
});

fastify.addHook('preHandler', (request, reply, done) => {
  fastify.util(request, 'timestamp', new Date());
  done();
});

fastify.get('/plugin1', (request, reply) => {
  reply.send(request);
});

fastify.get('/plugin2', (request, reply) => {
  reply.send(request);
});
```

Now for every request, you will run your utility. You can register as many hooks
as you need.

Sometimes you want a hook that should be executed for just a subset of routes,
how can you do that? Yep, encapsulation!

```js
fastify.register((instance, opts, done) => {
  instance.decorate('util', (request, key, value) => {
    request[key] = value;
  });

  instance.addHook('preHandler', (request, reply, done) => {
    instance.util(request, 'timestamp', new Date());
    done();
  });

  instance.get('/plugin1', (request, reply) => {
    reply.send(request);
  });

  done();
});

fastify.get('/plugin2', (request, reply) => {
  reply.send(request);
});
```

Now your hook will run just for the first route!

As you probably noticed by now, `request` and `reply` are not the standard
Nodejs _request_ and _response_ objects, but Fastify's objects.

## How to handle encapsulation and distribution

<a id="distribution"></a>

Perfect, now you know (almost) all of the tools that you can use to extend
Fastify. Nevertheless, chances are that you came across one big issue: how is
distribution handled?

The preferred way to distribute a utility is to wrap all your code inside a
`register`. Using this, your plugin can support asynchronous bootstrapping
_(since `decorate` is a synchronous API)_, in the case of a database connection
for example.

_Wait, what? Didn't you tell me that `register` creates an encapsulation and
that the stuff I create inside will not be available outside?_

Yes, I said that. However, what I didn't tell you is that you can tell Fastify
to avoid this behavior with the
[`fastify-plugin`](https://github.com/fastify/fastify-plugin) module.

```js
const fp = require('fastify-plugin');
const dbClient = require('db-client');

function dbPlugin(fastify, opts, done) {
  dbClient.connect(opts.url, (err, conn) => {
    fastify.decorate('db', conn);
    done();
  });
}

module.exports = fp(dbPlugin);
```

You can also tell `fastify-plugin` to check the installed version of Fastify, in
case you need a specific API.

As we mentioned earlier, Fastify starts loading its plugins **after**
`.listen()`, `.inject()` or `.ready()` are called and as such, **after** they
have been declared. This means that, even though the plugin may inject variables
to the external Fastify instance via [`decorate`](../Reference/Decorators.md),
the decorated variables will not be accessible before calling `.listen()`,
`.inject()` or `.ready()`.

In case you rely on a variable injected by a preceding plugin and want to pass
that in the `options` argument of `register`, you can do so by using a function
instead of an object:

```js
const fastify = require('fastify')();
const fp = require('fastify-plugin');
const dbClient = require('db-client');

function dbPlugin(fastify, opts, done) {
  dbClient.connect(opts.url, (err, conn) => {
    fastify.decorate('db', conn);
    done();
  });
}

fastify.register(fp(dbPlugin), { url: 'https://example.com' });
fastify.register(require('your-plugin'), (parent) => {
  return { connection: parent.db, otherOption: 'foo-bar' };
});
```

In the above example, the `parent` variable of the function passed in as the
second argument of `register` is a copy of the **external Fastify instance**
that the plugin was registered at. This means that we are able to access any
variables that were injected by preceding plugins in the order of declaration.

## ESM support

<a id="esm-support"></a>

ESM is supported as well from [Node.js
`v13.3.0`](https://nodejs.org/api/esm.html) and above! Just export your plugin
as ESM module and you are good to go!

```js
// plugin.mjs
async function plugin(fastify, opts) {
  fastify.get('/', async (req, reply) => {
    return { hello: 'world' };
  });
}

export default plugin;
```

**Note**: Fastify does not support named imports within an ESM context. Instead,
the `default` export is available.

```js
// server.mjs
import Fastify from 'fastify';

const fastify = Fastify();

///...

fastify.listen(3000, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
```

## Handle errors

<a id="handle-errors"></a>

It can happen that one of your plugins fails during startup. Maybe you expect it
and you have a custom logic that will be triggered in that case. How can you
implement this? The `after` API is what you need. `after` simply registers a
callback that will be executed just after a register, and it can take up to
three parameters.

The callback changes based on the parameters you are giving:

1. If no parameter is given to the callback and there is an error, that error
   will be passed to the next error handler.
1. If one parameter is given to the callback, that parameter will be the error
   object.
1. If two parameters are given to the callback, the first will be the error
   object; the second will be the done callback.
1. If three parameters are given to the callback, the first will be the error
   object, the second will be the top-level context unless you have specified
   both server and override, in that case, the context will be what the override
   returns, and the third the done callback.

Let's see how to use it:

```js
fastify.register(require('./database-connector')).after((err) => {
  if (err) throw err;
});
```

## Custom errors

<a id="custom-errors"></a>

If your plugin needs to expose custom errors, you can easily generate consistent
error objects across your codebase and plugins with the
[`fastify-error`](https://github.com/fastify/fastify-error) module.

```js
const createError = require('fastify-error');
const CustomError = createError('ERROR_CODE', 'message');
console.log(new CustomError());
```

## Emit Warnings

<a id="emit-warnings"></a>

If you want to deprecate an API, or you want to warn the user about a specific
use case, you can use the
[`fastify-warning`](https://github.com/fastify/fastify-warning) module.

```js
const warning = require('fastify-warning')();
warning.create('FastifyDeprecation', 'FST_ERROR_CODE', 'message');
warning.emit('FST_ERROR_CODE');
```

## Let's start!

<a id="start"></a>

Awesome, now you know everything you need to know about Fastify and its plugin
system to start building your first plugin, and please if you do, tell us! We
will add it to the [_ecosystem_](https://github.com/fastify/fastify#ecosystem)
section of our documentation!

If you want to see some real-world examples, check out:

- [`point-of-view`](https://github.com/fastify/point-of-view) Templates
  rendering (_ejs, pug, handlebars, marko_) plugin support for Fastify.
- [`fastify-mongodb`](https://github.com/fastify/fastify-mongodb) Fastify
  MongoDB connection plugin, with this you can share the same MongoDB connection
  pool in every part of your server.
- [`fastify-multipart`](https://github.com/fastify/fastify-multipart) Multipart
  support for Fastify
- [`fastify-helmet`](https://github.com/fastify/fastify-helmet) Important
  security headers for Fastify

_Do you feel like something is missing here? Let us know! :)_
