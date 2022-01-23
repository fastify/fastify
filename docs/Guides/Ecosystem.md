<h1 align="center">Fastify</h1>

## Écosystème

Les plugins maintenus par l'équipe Fastify sont répertoriés sous [Core](#core) tandis que les plugins maintenus par la communauté sont répertoriés dans la section [Communauté](#community)
section.

#### [Core](#core)

- [`fastify-accepts`](https://github.com/fastify/fastify-accepts) utilisé
  [accepts](https://www.npmjs.com/package/accepts) dans votre objet de requête.
- [`fastify-accepts-serializer`](https://github.com/fastify/fastify-accepts-serializer)
  à sérialiser en sortie en fonction de l'en-tête. `Accept`.
- [`fastify-auth`](https://github.com/fastify/fastify-auth) Exécutez plusieurs fonctions d'authentification dans Fastify.
- [`fastify-autoload`](https://github.com/fastify/fastify-autoload) Charger tous les plugins dans un répertoire.
- [`fastify-awilix`](https://github.com/fastify/fastify-awilix) Prise en charge de l'injection de dépendances pour Fastify, basée sur
  [awilix](https://github.com/jeffijoe/awilix).
- [`fastify-bankai`](https://github.com/fastify/fastify-bankai)
  [Bankai](https://github.com/yoshuawuyts/bankai) Compilateur d'actifs Bankai pour Fastify.
- [`fastify-basic-auth`](https://github.com/fastify/fastify-basic-auth) Plugin d'authentification de base pour Fastify.
- [`fastify-bearer-auth`](https://github.com/fastify/fastify-bearer-auth) Plugin d'authentification du porteur pour Fastify.
- [`fastify-caching`](https://github.com/fastify/fastify-caching) Prise en charge générale du cache côté serveur et de l'ETag.
- [`fastify-circuit-breaker`](https://github.com/fastify/fastify-circuit-breaker)
  Un disjoncteur aérien bas pour vos routes.
- [`fastify-compress`](https://github.com/fastify/fastify-compress) Fastify utilitaires de compression.
- [`fastify-cookie`](https://github.com/fastify/fastify-cookie) Analysez et définissez les en-têtes de cookies.
- [`fastify-cors`](https://github.com/fastify/fastify-cors) Permet l'utilisation de CORS dans une application Fastify.
- [`fastify-csrf`](https://github.com/fastify/fastify-csrf) Un plugin pour ajouter la protection
  [CSRF](https://en.wikipedia.org/wiki/Cross-site_request_forgery) à Fastify.
- [`fastify-diagnostics-channel`](https://github.com/fastify/fastify-diagnostics-channel)
  Plugin pour gérer `diagnostics_channel` sur Fastify
- [`fastify-elasticsearch`](https://github.com/fastify/fastify-elasticsearch)
  Plugin pour partager le même client ES.
- [`fastify-env`](https://github.com/fastify/fastify-env) Charger et vérifier la configuration.
- [`fastify-etag`](https://github.com/fastify/fastify-etag) Générez automatiquement des ETags pour les réponses HTTP.
- [`fastify-flash`](https://github.com/fastify/fastify-flash) Définissez et obtenez des messages flash à l'aide de la session.
- [`fastify-formbody`](https://github.com/fastify/fastify-formbody) Plugin pour analyser les corps x-www-form-urlencoded.
- [`fastify-funky`](https://github.com/fastify/fastify-funky) Rend la programmation fonctionnelle dans Fastify plus pratique. Ajoute la prise en charge des routes Fastify renvoyant des structures fonctionnelles, telles que Soit, Tâche ou une fonction simple sans paramètre.
- [`fastify-helmet`](https://github.com/fastify/fastify-helmet) En-têtes de sécurité importants pour Fastify.
- [`fastify-http-proxy`](https://github.com/fastify/fastify-http-proxy) Proxy vos requêtes HTTP vers un autre serveur, avec des crochets.
- [`fastify-jwt`](https://github.com/fastify/fastify-jwt) Utilitaires JWT pour Fastify, utilise en interne [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken).
- [`fastify-leveldb`](https://github.com/fastify/fastify-leveldb) Plugin pour partager une connexion LevelDB commune sur Fastify.
- [`fastify-mongodb`](https://github.com/fastify/fastify-mongodb) Le plug-in de connexion Fastify MongoDB, avec lequel vous pouvez partager le même pool de connexions MongoDB sur toutes les parties de votre serveur.
- [`fastify-multipart`](https://github.com/fastify/fastify-multipart) Prise en charge en plusieurs parties de Fastify.
- [`fastify-oauth2`](https://github.com/fastify/fastify-oauth2) Enroulez autour
  [`simple-oauth2`](https://github.com/lelylan/simple-oauth2).
- [`fastify-postgres`](https://github.com/fastify/fastify-postgres) Fastify PostgreSQL plugin de connexion, avec cela, vous pouvez partager le même pool de connexions PostgreSQL dans chaque partie de votre serveur.
- [`fastify-rate-limit`](https://github.com/fastify/fastify-rate-limit) Un limiteur de débit à faible surcharge pour vos routes.
- [`fastify-request-context`](https://github.com/fastify/fastify-request-context)
  Stockage à portée de demande, basé sur
  [AsyncLocalStorage](https://nodejs.org/api/async_hooks.html#async_hooks_class_asynclocalstorage)
  (avec renvoie sur [cls-hooked](https://github.com/Jeff-Lewis/cls-hooked)),
  fonctionnalités similaires aux stockages locaux de threads.
- [`fastify-response-validation`](https://github.com/fastify/fastify-response-validation)
  Un plugin simple qui permet la validation des réponses pour Fastify.
- [`fastify-nextjs`](https://github.com/fastify/fastify-nextjs) Prise en charge du rendu côté serveur pour Fastify avec React
  [Next](https://github.com/zeit/next.js/).
- [`fastify-redis`](https://github.com/fastify/fastify-redis) Le plug-in de connexion Fastify Redis, avec lequel vous pouvez partager la même connexion Redis sur toutes les parties de votre serveur.
- [`fastify-reply-from`](https://github.com/fastify/fastify-reply-from) Plugin pour transférer la requête HTTP en cours vers un autre serveur.
- [`fastify-routes`](https://github.com/fastify/fastify-routes) Plugin qui fournit un `Map` sur l'ensemble des routes.
- [`fastify-schedule`](https://github.com/fastify/fastify-schedule) Plugin pour planifier des tâches périodiques, basé sur
  [toad-scheduler](https://github.com/kibertoad/toad-scheduler).
- [`fastify-sensible`](https://github.com/fastify/fastify-sensible) Des valeurs par défaut pour Fastify sur lesquelles tout le monde peut s'entendre. Il ajoute quelques décorateurs utiles tels que les erreurs HTTP et les assertions, mais aussi plus de méthodes de requête et de réponse.
- [`@fastify/session`](https://github.com/fastify/session) un plugin de session pour Fastify.
- [`fastify-static`](https://github.com/fastify/fastify-static) Plugin pour servir des fichiers statiques aussi rapidement que possible.
- [`fastify-swagger`](https://github.com/fastify/fastify-swagger) Plugin pour servir la documentation Swagger/OpenAPI pour Fastify, prenant en charge la génération dynamique.
- [`fastify-websocket`](https://github.com/fastify/fastify-websocket) Prise en charge de WebSocket pour Fastify. Construit sur [ws](https://github.com/websockets/ws).
- [`fastify-url-data`](https://github.com/fastify/fastify-url-data) Décore
  `Request` avec une méthode pour accéder aux composants d'URL bruts.
- [`middie`](https://github.com/fastify/middie) Moteur middleware pour Fastify.
- [`point-of-view`](https://github.com/fastify/point-of-view) Prise en charge du plugin de rendu de modèles (_ejs, pug, handlebars, marko_) pour Fastify.
- [`under-pressure`](https://github.com/fastify/under-pressure) Mesurez la charge du processus avec la gestion automatique du plug-in _"Service Unavailable"_ pour Fastify.

#### [Communauté](#community)

- [`@applicazza/fastify-nextjs`](https://github.com/applicazza/fastify-nextjs)
  Alternative d'intégration de Fastify et Next.js.
- [`@coobaha/typed-fastify`](https://github.com/Coobaha/typed-fastify) Routes fortement typées avec une validation d'exécution utilisant le schéma JSON généré à partir des types.
- [`@dnlup/fastify-doc`](https://github.com/dnlup/fastify-doc) Un plugin pour l'échantillonnage des métriques de processus.
- [`@dnlup/fastify-traps`](https://github.com/dnlup/fastify-traps) Un plugin pour fermer gracieusement le serveur `SIGINT` et `SIGTERM`.
- [`@gquittet/graceful-server`](https://github.com/gquittet/graceful-server)
  Bibliothèque Node.JS minuscule (~ 5k), rapide, KISS et sans dépendance pour rendre votre API Fastify gracieuse.
- [`@immobiliarelabs/fastify-metrics`](https://github.com/immobiliare/fastify-metrics)
  Plugin minimaliste et opiniâtre qui collecte les métriques d'utilisation/processus et les envoie à [statsd](https://github.com/statsd/statsd).
- [`@mgcrea/fastify-graceful-exit`](https://github.com/mgcrea/fastify-graceful-exit)
  Un plugin pour fermer le serveur de manière élégante.
- [`@mgcrea/fastify-request-logger`](https://github.com/mgcrea/fastify-request-logger)
  Un plugin pour activer la journalisation compacte des requêtes pour Fastify
- [`@mgcrea/fastify-session-redis-store`](https://github.com/mgcrea/fastify-session-redis-store)
  Store Redis pour @mgcrea/fastify-session en utilisant ioredis
- [`@mgcrea/fastify-session-sodium-crypto`](https://github.com/mgcrea/fastify-session-sodium-crypto)
  Crypto rapide à base de sodium pour @mgcrea/fastify-session
- [`@mgcrea/fastify-session`](https://github.com/mgcrea/fastify-session) Plugin de session pour Fastify qui prend en charge les sessions sans état et avec état
- [`@mgcrea/pino-pretty-compact`](https://github.com/mgcrea/pino-pretty-compact)
  Un embellisseur compact personnalisé à base de pino
- [`@trubavuong/fastify-seaweedfs`](https://github.com/trubavuong/fastify-seaweedfs)
  SeaweedFS pour Fastify
- [`apollo-server-fastify`](https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-fastify)
  Exécutze un [Apollo Server](https://github.com/apollographql/apollo-server) pour servir GraphQL avec Fastify.
- [`arecibo`](https://github.com/nucleode/arecibo) Fastify répondeur ping pour Kubernetes Liveness and Readiness Probes.
- [`cls-rtracer`](https://github.com/puzpuzpuz/cls-rtracer) Middleware Fastify pour la génération d'ID de demande basée sur CLS. Une solution prête à l'emploi pour ajouter des ID de demande dans vos journaux.
- [`fastify-405`](https://github.com/Eomm/fastify-405) Plugin Fastify qui ajoute le statut HTTP 405 à vos routes
- [`fastify-allow`](https://github.com/mattbishop/fastify-allow) Plugin Fastify qui ajoute automatiquement un en-tête Autoriser aux réponses avec des routes. Envoie également des réponses 405 pour les routes qui ont un gestionnaire mais pas pour la méthode de la requête.
- [`fastify-amqp`](https://github.com/RafaelGSS/fastify-amqp) Plugin de connexion Fastify AMQP, à utiliser avec RabbitMQ ou un autre connecteur. Juste un emballage pou [`amqplib`](https://github.com/squaremo/amqp.node).
- [`fastify-angular-universal`](https://github.com/exequiel09/fastify-angular-universal)
  Prise en charge du rendu angular côté serveur à l'aide
  [`@angular/platform-server`](https://github.com/angular/angular/tree/master/packages/platform-server)
  de Fastify
- [`fastify-api-key`](https://github.com/arkerone/fastify-api-key) Plugin Fastify pour authentifier les requêtes HTTP basées sur la clé API et la signature
- [`fastify-appwrite`](https://github.com/Dev-Manny/fastify-appwrite) Fastify Plugin pour interagir avec le serveur Appwrite.
- [`fastify-auth0-verify`](https://github.com/nearform/fastify-auth0-verify):
  plugin de vérification Auth0 pour Fastify, utilise en interne
  [fastify-jwt](https://npm.im/fastify-jwt) et
  [jsonwebtoken](https://npm.im/jsonwebtoken).
- [`fastify-autocrud`](https://github.com/paranoiasystem/fastify-autocrud)
  Plugin pour générer automatiquement des routes CRUD aussi rapidement que possible.
- [`fastify-autoroutes`](https://github.com/GiovanniCardamone/fastify-autoroutes)
  Plugin pour analyser et charger les routes en fonction du chemin du système de fichiers à partir d'un répertoire personnalisé.
- [`fastify-axios`](https://github.com/davidedantonio/fastify-axios) Plugin pour envoyer des requêtes HTTP via [axios](https://github.com/axios/axios).
- [`fastify-babel`](https://github.com/cfware/fastify-babel) Plugin Fastify pour les serveurs de développement qui nécessitent des transformations Babel des sources JavaScript.
- [`fastify-bcrypt`](https://github.com/heply/fastify-bcrypt) Un générateur et un vérificateur de hachage Bcrypt.
- [`fastify-blipp`](https://github.com/PavelPolyakov/fastify-blipp) Imprime vos routes sur la console, afin que vous sachiez exactement quels points de terminaison sont disponibles.
- [`fastify-bookshelf`](https://github.com/butlerx/fastify-bookshelfjs) Plugin Fastify pour ajouter le support ORM de [bookshelf.js](https://bookshelfjs.org/).
- [`fastify-boom`](https://github.com/jeromemacias/fastify-boom) Plugin Fastify pour ajouter le support ded [boom](https://github.com/hapijs/boom).
- [`fastify-bree`](https://github.com/climba03003/fastify-bree) Plugin Fastify pour ajouter le support de [bree](https://github.com/breejs/bree).
- [`fastify-casbin`](https://github.com/nearform/fastify-casbin) Prise en charge de Casbin pour Fastify.
- [`fastify-casbin-rest`](https://github.com/nearform/fastify-casbin-rest)
  Prise en charge de Casbin pour Fastify basée sur un modèle RESTful.
- [`fastify-casl`](https://github.com/Inlecom/fastify-casl) Plug-in Fastify
  [CASL](https://github.com/stalniy/casl) qui prend en charge la protection des points de terminaison de type ACL via un crochet preSerialization & preHandler, en nettoyant les entrées et les sorties de votre application en fonction des droits de l'utilisateur.
- [`fastify-cloudevents`](https://github.com/smartiniOnGitHub/fastify-cloudevents)
  Plugin Fastify pour générer et transférer des événements Fastify au format Cloudevents.
- [`fastify-cockroachdb`](https://github.com/alex-ppg/fastify-cockroachdb)
  Plugin Fastify pour se connecter à une instance CockroachDB PostgreSQL via l'ORM Sequelize.
- [`fastify-couchdb`](https://github.com/nigelhanlon/fastify-couchdb) Fastify
  plugin to add CouchDB support via [nano](https://github.com/apache/nano).
- [`fastify-crud-generator`](https://github.com/heply/fastify-crud-generator) A
  plugin to rapidly generate CRUD routes for any entity.
- [`fastify-custom-healthcheck`](https://github.com/gkampitakis/fastify-custom-healthcheck)
  Fastify plugin to add health route in your server that asserts custom
  functions.
- [`fastify-decorators`](https://github.com/L2jLiga/fastify-decorators) Fastify
  plugin that provides the set of TypeScript decorators.
- [`fastify-disablecache`](https://github.com/Fdawgs/fastify-disablecache)
  Fastify plugin to disable client-side caching, inspired by
  [nocache](https://github.com/helmetjs/nocache).
- [`fastify-dynamodb`](https://github.com/matrus2/fastify-dynamodb) AWS DynamoDB
  plugin for Fastify. It exposes
  [AWS.DynamoDB.DocumentClient()](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html)
  object.
- [`fastify-dynareg`](https://github.com/greguz/fastify-dynareg) Dynamic plugin
  register for Fastify.
- [`fastify-early-hints`](https://github.com/zekth/fastify-early-hints) Plugin
  to add HTTP 103 feature based on [RFC
  8297](https://httpwg.org/specs/rfc8297.html)
- [`fastify-envalid`](https://github.com/alemagio/fastify-envalid) Fastify
  plugin to integrate [envalid](https://github.com/af/envalid) in your Fastify
  project.
- [`fastify-error-page`](https://github.com/hemerajs/fastify-error-page) Fastify
  plugin to print errors in structured HTML to the browser.
- [`fastify-esso`](https://github.com/patrickpissurno/fastify-esso) The easiest
  authentication plugin for Fastify, with built-in support for Single sign-on
  (and great documentation).
- [`fastify-explorer`](https://github.com/Eomm/fastify-explorer) Get control of
  your decorators across all the encapsulated contexts.
- [`fastify-favicon`](https://github.com/smartiniOnGitHub/fastify-favicon)
  Fastify plugin to serve default favicon.
- [`fastify-feature-flags`](https://gitlab.com/m03geek/fastify-feature-flags)
  Fastify feature flags plugin with multiple providers support (e.g. env,
  [config](https://lorenwest.github.io/node-config/),
  [unleash](https://unleash.github.io/)).
- [`fastify-file-routes`](https://github.com/spa5k/fastify-file-routes)
  Get Next.js based file system routing into fastify.
- [`fastify-file-upload`](https://github.com/huangang/fastify-file-upload)
  Fastify plugin for uploading files.
- [`fastify-firebase`](https://github.com/now-ims/fastify-firebase) Fastify
  plugin for [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
  to Fastify so you can easily use Firebase Auth, Firestore, Cloud Storage,
  Cloud Messaging, and more.
- [`fastify-firebase-auth`](https://github.com/oxsav/fastify-firebase-auth)
  Firebase Authentication for Fastify supporting all of the methods relating to
  the authentication API.
- [`fastify-formidable`](https://github.com/climba03003/fastify-formidable)
  Handy plugin to provide multipart support and fastify-swagger integration.
- [`fastify-gcloud-trace`](https://github.com/mkinoshi/fastify-gcloud-trace)
  [Google Cloud Trace API](https://cloud.google.com/trace/docs/reference)
  Connector for Fastify.
- [`fastify-get-head`](https://github.com/MetCoder95/fastify-get-head) Small
  plugin to set a new HEAD route handler for each GET route previously
  registered in Fastify.
- [`fastify-get-only`](https://github.com/DanieleFedeli/fastify-get-only) Small
  plugin used to make fastify accept only GET requests
- [`fastify-good-sessions`](https://github.com/Phara0h/fastify-good-sessions) A
  good Fastify sessions plugin focused on speed.
- [`fastify-google-cloud-storage`](https://github.com/carlozamagni/fastify-google-cloud-storage)
  Fastify plugin that exposes a GCP Cloud Storage client instance.
- [`fastify-grant`](https://github.com/simov/fastify-grant)
  Authentication/Authorization plugin for Fastify that supports 200+ OAuth
  Providers.
- [`fastify-guard`](https://github.com/hsynlms/fastify-guard) A Fastify plugin
  that protects endpoints by checking authenticated user roles and/or scopes.
- [`fastify-graceful-shutdown`](https://github.com/hemerajs/fastify-graceful-shutdown)
  Shutdown Fastify gracefully and asynchronously.
- [`fastify-hasura`](https://github.com/ManUtopiK/fastify-hasura) A Fastify
  plugin to have fun with [Hasura](https://github.com/hasura/graphql-engine).
- [`fastify-healthcheck`](https://github.com/smartiniOnGitHub/fastify-healthcheck)
  Fastify plugin to serve a health check route and a probe script.
- [`fastify-hemera`](https://github.com/hemerajs/fastify-hemera) Fastify Hemera
  plugin, for writing reliable & fault-tolerant microservices with
  [nats.io](https://nats.io/).
- [`fastify-http-context`](https://github.com/thorough-developer/fastify-http-context)
  Fastify plugin for "simulating" a thread of execution to allow for true HTTP
  context to take place per API call within the Fastify lifecycle of calls.
- [`fastify-http2https`](https://github.com/lolo32/fastify-http2https) Redirect
  HTTP requests to HTTPS, both using the same port number, or different response
  on HTTP and HTTPS.
- [`fastify-http-client`](https://github.com/kenuyx/fastify-http-client) Plugin
  to send HTTP(s) requests. Built upon
  [urllib](https://github.com/node-modules/urllib).
- [`fastify-http-errors-enhanced`](https://github.com/ShogunPanda/fastify-http-errors-enhanced)
  An error handling plugin for Fastify that uses enhanced HTTP errors.
- [`fastify-https-redirect`](https://github.com/tomsvogel/fastify-https-redirect)
  Fastify plugin for auto-redirect from HTTP to HTTPS.
- [`fastify-influxdb`](https://github.com/alex-ppg/fastify-influxdb) Fastify
  InfluxDB plugin connecting to an InfluxDB instance via the Influx default
  package.
- [`fastify-jwt-authz`](https://github.com/Ethan-Arrowood/fastify-jwt-authz) JWT
  user scope verifier.
- [`fastify-jwt-webapp`](https://github.com/charlesread/fastify-jwt-webapp) JWT
  authentication for Fastify-based web apps.
- [`fastify-knexjs`](https://github.com/chapuletta/fastify-knexjs) Fastify
  plugin for support KnexJS Query Builder.
- [`fastify-knexjs-mock`](https://github.com/chapuletta/fastify-knexjs-mock)
  Fastify Mock KnexJS for testing support.
- [`fastify-kubernetes`](https://github.com/greguz/fastify-kubernetes) Fastify
  Kubernetes client plugin.
- [`fastify-language-parser`](https://github.com/lependu/fastify-language-parser)
  Fastify plugin to parse request language.
- [`fastify-loader`](https://github.com/TheNoim/fastify-loader) Load routes from
  a directory and inject the Fastify instance in each file.
- [`fastify-lured`](https://github.com/lependu/fastify-lured) Plugin to load lua
  scripts with [fastify-redis](https://github.com/fastify/fastify-redis) and
  [lured](https://github.com/enobufs/lured).
- [`fastify-mailer`](https://github.com/coopflow/fastify-mailer) Plugin to
  initialize and encapsulate [Nodemailer](https://nodemailer.com)'s transporters
  instances in Fastify.
- [`fastify-markdown`](https://github.com/freezestudio/fastify-markdown) Plugin
  to markdown support.
- [`fastify-method-override`](https://github.com/corsicanec82/fastify-method-override)
  Plugin for Fastify, which allows the use of HTTP verbs, such as DELETE, PATCH,
  HEAD, PUT, OPTIONS in case the client doesn't support them.
- [`fastify-metrics`](https://gitlab.com/m03geek/fastify-metrics) Plugin for
  exporting [Prometheus](https://prometheus.io) metrics.
- [`fastify-minify`](https://github.com/Jelenkee/fastify-minify) Plugin for
  minification and transformation of responses.
- [`fastify-mongo-memory`](https://github.com/chapuletta/fastify-mongo-memory)
  Fastify MongoDB in Memory Plugin for testing support.
- [`fastify-mongoose-api`](https://github.com/jeka-kiselyov/fastify-mongoose-api)
  Fastify plugin to create REST API methods based on Mongoose MongoDB models.
- [`fastify-mongoose-driver`](https://github.com/alex-ppg/fastify-mongoose)
  Fastify Mongoose plugin that connects to a MongoDB via the Mongoose plugin
  with support for Models.
- [`fastify-msgpack`](https://github.com/kenriortega/fastify-msgpack) Fastify
  and MessagePack, together at last. Uses @msgpack/msgpack by default.
- [`fastify-multer`](https://github.com/fox1t/fastify-multer) Multer is a plugin
  for handling multipart/form-data, which is primarily used for uploading files.
- [`fastify-nats`](https://github.com/mahmed8003/fastify-nats) Plugin to share
  [NATS](https://nats.io) client across Fastify.
- [`fastify-no-additional-properties`](https://github.com/greguz/fastify-no-additional-properties)
  Add `additionalProperties: false` by default to your JSON Schemas.
- [`fastify-no-icon`](https://github.com/jsumners/fastify-no-icon) Plugin to
  eliminate thrown errors for `/favicon.ico` requests.
- [`fastify-nodemailer`](https://github.com/lependu/fastify-nodemailer) Plugin
  to share [nodemailer](https://nodemailer.com) transporter across Fastify.
- [`fastify-normalize-request-reply`](https://github.com/ericrglass/fastify-normalize-request-reply)
  Plugin to normalize the request and reply to the Express version 4.x request
  and response, which allows use of middleware, like swagger-stats, that was
  originally written for Express.
- [`fastify-now`](https://github.com/yonathan06/fastify-now) Structure your
  endpoints in a folder and load them dynamically with Fastify.
- [`fastify-nuxtjs`](https://github.com/gomah/fastify-nuxtjs) Vue server-side
  rendering support for Fastify with Nuxt.js Framework.
- [`fastify-oas`](https://gitlab.com/m03geek/fastify-oas) Generates OpenAPI 3.0+
  documentation from routes schemas for Fastify.
- [`fastify-objectionjs`](https://github.com/jarcodallo/fastify-objectionjs)
  Plugin for the Fastify framework that provides integration with objectionjs
  ORM.
- [`fastify-objectionjs-classes`](https://github.com/kamikazechaser/fastify-objectionjs-classes)
  Plugin to cherry-pick classes from objectionjs ORM.
- [`fastify-openapi-docs`](https://github.com/ShogunPanda/fastify-openapi-docs)
  A Fastify plugin that generates OpenAPI spec automatically.
- [`fastify-openapi-glue`](https://github.com/seriousme/fastify-openapi-glue)
  Glue for OpenAPI specifications in Fastify, autogenerates routes based on an
  OpenAPI Specification.
- [`fastify-opentelemetry`](https://github.com/autotelic/fastify-opentelemetry)
  A Fastify plugin that uses the [OpenTelemetry
  API](https://github.com/open-telemetry/opentelemetry-js-api) to provide
  request tracing.
- [`fastify-oracle`](https://github.com/cemremengu/fastify-oracle) Attaches an
  [`oracledb`](https://github.com/oracle/node-oracledb) connection pool to a
  Fastify server instance.
- [`fastify-orientdb`](https://github.com/mahmed8003/fastify-orientdb) Fastify
  OrientDB connection plugin, with which you can share the OrientDB connection
  across every part of your server.
- [`fastify-piscina`](https://github.com/piscinajs/fastify-piscina) A worker
  thread pool plugin using [Piscina](https://github.com/piscinajs/piscina).
- [`fastify-peekaboo`](https://github.com/simone-sanfratello/fastify-peekaboo)
  Fastify plugin for memoize responses by expressive settings.
- [`fastify-polyglot`](https://github.com/heply/fastify-polyglot) A plugin to
  handle i18n using
  [node-polyglot](https://www.npmjs.com/package/node-polyglot).
- [`fastify-postgraphile`](https://github.com/alemagio/fastify-postgraphile)
  Plugin to integrate [PostGraphile](https://www.graphile.org/postgraphile/) in
  a Fastify project.
- [`fastify-prettier`](https://github.com/hsynlms/fastify-prettier) A Fastify
  plugin that uses [prettier](https://github.com/prettier/prettier) under the
  hood to beautify outgoing responses and/or other things in the Fastify server.
- [`fastify-print-routes`](https://github.com/ShogunPanda/fastify-print-routes)
  A Fastify plugin that prints all available routes.
- [`fastify-protobufjs`](https://github.com/kenriortega/fastify-protobufjs)
  Fastify and protobufjs, together at last. Uses protobufjs by default.
- [`fastify-qrcode`](https://github.com/chonla/fastify-qrcode) This plugin
  utilizes [qrcode](https://github.com/soldair/node-qrcode) to generate QR Code.
- [`fastify-qs`](https://github.com/webdevium/fastify-qs) A plugin for Fastify
  that adds support for parsing URL query parameters with
  [qs](https://github.com/ljharb/qs).
- [`fastify-raw-body`](https://github.com/Eomm/fastify-raw-body) Add the
  `request.rawBody` field.
- [`fastify-rbac`](https://gitlab.com/m03geek/fastify-rbac) Fastify role-based
  access control plugin.
- [`fastify-recaptcha`](https://github.com/qwertyforce/fastify-recaptcha)
  Fastify plugin for recaptcha verification.
- [`fastify-redis-channels`](https://github.com/hearit-io/fastify-redis-channels)
  A plugin for fast, reliable, and scalable channels implementation based on
  Redis streams.
- [`fastify-register-routes`](https://github.com/israeleriston/fastify-register-routes)
  Plugin to automatically load routes from a specified path and optionally limit
  loaded file names by a regular expression.
- [`fastify-response-time`](https://github.com/lolo32/fastify-response-time) Add
  `X-Response-Time` header at each request for Fastify, in milliseconds.
- [`fastify-response-caching`](https://github.com/codeaholicguy/fastify-response-caching)
  A Fastify plugin for caching the response.
- [`fastify-resty`](https://github.com/FastifyResty/fastify-resty) Fastify-based
  web framework with REST API routes auto-generation for TypeORM entities using
  DI and decorators.
- [`fastify-reverse-routes`](https://github.com/dimonnwc3/fastify-reverse-routes)
  Fastify reverse routes plugin, allows to defined named routes and build path
  using name and parameters.
- [`fastify-rob-config`](https://github.com/jeromemacias/fastify-rob-config)
  Fastify Rob-Config integration.
- [`fastify-route-group`](https://github.com/TakNePoidet/fastify-route-group)
  Convenient grouping and inheritance of routes
- [`fastify-schema-constraint`](https://github.com/Eomm/fastify-schema-constraint)
  Choose the JSON schema to use based on request parameters.
- [`fastify-schema-to-typescript`](https://github.com/thomasthiebaud/fastify-schema-to-typescript)
  Generate typescript types based on your JSON/YAML validation schemas so they
  are always in sync.
- [`fastify-secure-session`](https://github.com/mcollina/fastify-secure-session)
  Create a secure stateless cookie session for Fastify.
- [`fastify-sentry`](https://github.com/alex-ppg/fastify-sentry) Fastify plugin
  to add the Sentry SDK error handler to requests.
- [`fastify-sequelize`](https://github.com/lyquocnam/fastify-sequelize) Fastify
  plugin work with Sequelize (adapter for NodeJS -> Sqlite, Mysql, Mssql,
  Postgres).
- [`fastify-server-session`](https://github.com/jsumners/fastify-server-session)
  A session plugin with support for arbitrary backing caches via
  `fastify-caching`.
- [`fastify-slonik`](https://github.com/Unbuttun/fastify-slonik) Fastify Slonik
  plugin, with this you can use slonik in every part of your server.
- [`fastify-soap-client`](https://github.com/fastify/fastify-soap-client) a SOAP
  client plugin for Fastify.
- [`fastify-socket.io`](https://github.com/alemagio/fastify-socket.io) a
  Socket.io plugin for Fastify.
- [`fastify-split-validator`](https://github.com/MetCoder95/fastify-split-validator) Small plugin to allow you use multiple validators in one route based on each HTTP part of the request.
- [`fastify-sse`](https://github.com/lolo32/fastify-sse) to provide Server-Sent
  Events with `reply.sse( … )` to Fastify.
- [`fastify-sse-v2`](https://github.com/nodefactoryio/fastify-sse-v2) to provide
  Server-Sent Events using Async Iterators (supports newer versions of Fastify).
- [`fastify-stripe`](https://github.com/coopflow/fastify-stripe) Plugin to
  initialize and encapsulate [Stripe
  Node.js](https://github.com/stripe/stripe-node) instances in Fastify.
- [`fastify-supabase`](https://github.com/coopflow/fastify-supabase) Plugin to
  initialize and encapsulate [Supabase](https://github.com/supabase/supabase-js)
  instances in Fastify.
- [`fastify-tls-keygen`](https://gitlab.com/sebdeckers/fastify-tls-keygen)
  Automatically generate a browser-compatible, trusted, self-signed,
  localhost-only, TLS certificate.
- [`fastify-tokenize`](https://github.com/Bowser65/fastify-tokenize)
  [Tokenize](https://github.com/Bowser65/Tokenize) plugin for Fastify that
  removes the pain of managing authentication tokens, with built-in integration
  for `fastify-auth`.
- [`fastify-totp`](https://github.com/heply/fastify-totp) A plugin to handle
  TOTP (e.g. for 2FA).
- [`fastify-twitch-ebs-tools`](https://github.com/lukemnet/fastify-twitch-ebs-tools)
  Useful functions for Twitch Extension Backend Services (EBS).
- [`fastify-typeorm-plugin`](https://github.com/inthepocket/fastify-typeorm-plugin)
  Fastify plugin to work with TypeORM.
- [`fastify-vhost`](https://github.com/patrickpissurno/fastify-vhost) Proxy
  subdomain HTTP requests to another server (useful if you want to point
  multiple subdomains to the same IP address, while running different servers on
  the same machine).
- [`fastify-vite`](https://github.com/galvez/fastify-vite)
  [Vite](https://vitejs.dev/) plugin for Fastify with SSR data support.
- [`fastify-vue-plugin`](https://github.com/TheNoim/fastify-vue)
  [Nuxt.js](https://nuxtjs.org) plugin for Fastify. Control the routes nuxt
  should use.
- [`fastify-wamp-router`](https://github.com/lependu/fastify-wamp-router) Web
  Application Messaging Protocol router for Fastify.
- [`fast-water`](https://github.com/tswayne/fast-water) A Fastify plugin for
  waterline. Decorates Fastify with waterline models.
- [`fastify-webpack-hmr`](https://github.com/lependu/fastify-webpack-hmr)
  Webpack hot module reloading plugin for Fastify.
- [`fastify-ws`](https://github.com/gj/fastify-ws) WebSocket integration for
  Fastify — with support for WebSocket lifecycle hooks instead of a single
  handler function. Built upon [ws](https://github.com/websockets/ws) and
  [uws](https://github.com/uNetworking/uWebSockets).
- [`fastify-xml-body-parser`](https://github.com/NaturalIntelligence/fastify-xml-body-parser)
  Parse XML payload / request body into JS / JSON object.
- [`fastify-xray`](https://github.com/jeromemacias/fastify-xray) Fastify plugin
  for AWS XRay recording.
- [`i18next-http-middleware`](https://github.com/i18next/i18next-http-middleware#fastify-usage)
  An [i18next](https://www.i18next.com) based i18n (internationalization)
  middleware to be used with Node.js web frameworks like Express or Fastify and
  also for Deno.
- [`k-fastify-gateway`](https://github.com/jkyberneees/fastify-gateway) API
  Gateway plugin for Fastify, a low footprint implementation that uses the
  `fastify-reply-from` HTTP proxy library.
- [`mercurius`](https://mercurius.dev/) A fully-featured and performant GraphQL
  server implementation for Fastify.
- [`nstats`](https://github.com/Phara0h/nstats) A fast and compact way to get
  all your network and process stats for your node application. Websocket,
  HTTP/S, and prometheus compatible!
- [`oas-fastify`](https://github.com/ahmadnassri/node-oas-fastify) OAS 3.x to
  Fastify routes automation. Automatically generates route handlers with fastify
  configuration and validation.
- [`openapi-validator-middleware`](https://github.com/PayU/openapi-validator-middleware#fastify)
  Swagger and OpenAPI 3.0 spec-based request validation middleware that supports
  Fastify.
- [`sequelize-fastify`](https://github.com/hsynlms/sequelize-fastify) A simple
  and lightweight Sequelize plugin for Fastify.
