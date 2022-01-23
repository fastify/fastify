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
- [`fastify-couchdb`](https://github.com/nigelhanlon/fastify-couchdb) Plugin Fastify pour ajouter la prise en charge de CouchDB via [nano](https://github.com/apache/nano).
- [`fastify-crud-generator`](https://github.com/heply/fastify-crud-generator) Un plugin pour générer rapidement des routes CRUD pour n'importe quelle entité.
- [`fastify-custom-healthcheck`](https://github.com/gkampitakis/fastify-custom-healthcheck)
  Plugin Fastify pour ajouter une route de santé dans votre serveur qui affirme des fonctions personnalisées.
- [`fastify-decorators`](https://github.com/L2jLiga/fastify-decorators) Plugin Fastify qui fournit l'ensemble des décorateurs TypeScript.
- [`fastify-disablecache`](https://github.com/Fdawgs/fastify-disablecache)
  Plugin Fastify pour désactiver la mise en cache côté client, inspiré de
  [nocache](https://github.com/helmetjs/nocache).
- [`fastify-dynamodb`](https://github.com/matrus2/fastify-dynamodb) Plug-in AWS DynamoDB pour Fastify. Il expose l'objet
  [AWS.DynamoDB.DocumentClient()](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html).

- [`fastify-dynareg`](https://github.com/greguz/fastify-dynareg) Registre de plug-in dynamique pour Fastify.
- [`fastify-early-hints`](https://github.com/zekth/fastify-early-hints) Plugin pour ajouter la fonctionnalité HTTP 103 basée sur [RFC
  8297](https://httpwg.org/specs/rfc8297.html)
- [`fastify-envalid`](https://github.com/alemagio/fastify-envalid) Plugin Fastify pour intégrer [envalid](https://github.com/af/envalid)
  dans votre projet Fastify..
- [`fastify-error-page`](https://github.com/hemerajs/fastify-error-page) Plugin Fastify pour imprimer les erreurs en HTML structuré dans le navigateur.
- [`fastify-esso`](https://github.com/patrickpissurno/fastify-esso) Le plugin d'authentification le plus simple pour Fastify, avec un support intégré pour l'authentification unique (et une excellente documentation).
- [`fastify-explorer`](https://github.com/Eomm/fastify-explorer) Prenez le contrôle de vos décorateurs dans tous les contextes encapsulés.ts.
- [`fastify-favicon`](https://github.com/smartiniOnGitHub/fastify-favicon)
  Plugin Fastify pour servir le favicon par défaut.
- [`fastify-feature-flags`](https://gitlab.com/m03geek/fastify-feature-flags)
  Fastify feature flags plugin avec prise en charge de plusieurs fournisseurs (e.g. env,
  [config](https://lorenwest.github.io/node-config/),
  [unleash](https://unleash.github.io/)).
- [`fastify-file-routes`](https://github.com/spa5k/fastify-file-routes)
  Obtenez le routage du système de fichiers basé sur Next.js dans fastify.
- [`fastify-file-upload`](https://github.com/huangang/fastify-file-upload)
  Plugin Fastify pour télécharger des fichiers.
- [`fastify-firebase`](https://github.com/now-ims/fastify-firebase) Plugin Fastify pour [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
  pour Fastify afin que vous puissiez facilement utiliser Firebase Auth, Firestore, Cloud Storage, Cloud Messaging, et plus encore.
- [`fastify-firebase-auth`](https://github.com/oxsav/fastify-firebase-auth)
  Firebase Authentication for Fastify prenant en charge toutes les méthodes relatives à l'API d'authentification.
- [`fastify-formidable`](https://github.com/climba03003/fastify-formidable)
  Plugin pratique pour fournir un support en plusieurs parties et une intégration rapide.
- [`fastify-gcloud-trace`](https://github.com/mkinoshi/fastify-gcloud-trace)
  [Google Cloud Trace API](https://cloud.google.com/trace/docs/reference)
  Connecteur pour Fastify.
- [`fastify-get-head`](https://github.com/MetCoder95/fastify-get-head) Petit plugin pour définir un nouveau gestionnaire de route HEAD pour chaque route GET précédemment enregistrée dans Fastify.
- [`fastify-get-only`](https://github.com/DanieleFedeli/fastify-get-only) Petit plugin utilisé pour que fastify n'accepte que les requêtes GET
- [`fastify-good-sessions`](https://github.com/Phara0h/fastify-good-sessions) Un bon plugin de sessions Fastify axé sur la vitesse.
- [`fastify-google-cloud-storage`](https://github.com/carlozamagni/fastify-google-cloud-storage)
  Plug-in Fastify qui expose une instance de client GCP Cloud Storage.
- [`fastify-grant`](https://github.com/simov/fastify-grant)
  Plugin d'authentification/autorisation pour Fastify qui prend en charge plus de 200 fournisseurs OAuth.
- [`fastify-guard`](https://github.com/hsynlms/fastify-guard) Un plug-in Fastify qui protège les terminaux en vérifiant les rôles et/ou les étendues des utilisateurs authentifiés.
- [`fastify-graceful-shutdown`](https://github.com/hemerajs/fastify-graceful-shutdown)
  Met hors service Fastify gracieusement et de manière asynchrone.
- [`fastify-hasura`](https://github.com/ManUtopiK/fastify-hasura) Un plugin Fastify pour s'amuser avec [Hasura](https://github.com/hasura/graphql-engine).
- [`fastify-healthcheck`](https://github.com/smartiniOnGitHub/fastify-healthcheck)
  Plugin Fastify pour servir une route de vérification de l'état et un script de sonde.
- [`fastify-hemera`](https://github.com/hemerajs/fastify-hemera) Plugin Fastify Hemera, pour écrire des microservices fiables et tolérants aux pannes avec
  [nats.io](https://nats.io/).
- [`fastify-http-context`](https://github.com/thorough-developer/fastify-http-context)
  Plugin Fastify pour "simuler" un thread d'exécution afin de permettre à un véritable contexte HTTP d'avoir lieu par appel d'API dans le cycle de vie Fastify des appels
- [`fastify-http2https`](https://github.com/lolo32/fastify-http2https) Redirigez les requêtes HTTP vers HTTPS, en utilisant le même numéro de port ou une réponse différente sur HTTP et HTTPS.
- [`fastify-http-client`](https://github.com/kenuyx/fastify-http-client) Plugin pour envoyer des requêtes HTTP(s). Construit sur
  [urllib](https://github.com/node-modules/urllib).
- [`fastify-http-errors-enhanced`](https://github.com/ShogunPanda/fastify-http-errors-enhanced)
  Un plugin de gestion des erreurs pour Fastify qui utilise des erreurs HTTP améliorées.
- [`fastify-https-redirect`](https://github.com/tomsvogel/fastify-https-redirect)
  Plugin Fastify pour la redirection automatique de HTTP vers HTTPS.
- [`fastify-influxdb`](https://github.com/alex-ppg/fastify-influxdb) Plugin Fastify InfluxDB se connectant à une instance InfluxDB via le package par défaut Influx.
- [`fastify-jwt-authz`](https://github.com/Ethan-Arrowood/fastify-jwt-authz) Vérificateur de portée utilisateur JWT.
- [`fastify-jwt-webapp`](https://github.com/charlesread/fastify-jwt-webapp) Authentification JWT pour les applications Web basées sur Fastify.
- [`fastify-knexjs`](https://github.com/chapuletta/fastify-knexjs) Plugin Fastify pour le support KnexJS Query Builder.
- [`fastify-knexjs-mock`](https://github.com/chapuletta/fastify-knexjs-mock)
  Fastify Mock KnexJS pour tester la prise en charge.
- [`fastify-kubernetes`](https://github.com/greguz/fastify-kubernetes) plug-in Fastify du client Kubernetes.
- [`fastify-language-parser`](https://github.com/lependu/fastify-language-parser)
  Plugin Fastify pour analyser le langage de la requête.
- [`fastify-loader`](https://github.com/TheNoim/fastify-loader) Chargez les routes depuis un répertoire et injectez l'instance Fastify dans chaque fichier.
- [`fastify-lured`](https://github.com/lependu/fastify-lured) Plugin pour charger des scripts lua avec [fastify-redis](https://github.com/fastify/fastify-redis) et
  [lured](https://github.com/enobufs/lured).
- [`fastify-mailer`](https://github.com/coopflow/fastify-mailer) Plugin pour initialiser et encapsuler les instances de transporteurs de [Nodemailer](https://nodemailer.com) dans Fastify.
- [`fastify-markdown`](https://github.com/freezestudio/fastify-markdown) Plugin pour la prise en charge du Markdown.
- [`fastify-method-override`](https://github.com/corsicanec82/fastify-method-override)
  Plugin pour Fastify, qui permet l'utilisation de verbes HTTP, tels que DELETE, PATCH, HEAD, PUT, OPTIONS au cas où le client ne les prend pas en charge.
- [`fastify-metrics`](https://gitlab.com/m03geek/fastify-metrics) Plugin pour exporter les métriques [Prometheus](https://prometheus.io) metrics.
- [`fastify-minify`](https://github.com/Jelenkee/fastify-minify) Plugin pour la minification et la transformation des réponses.
- [`fastify-mongo-memory`](https://github.com/chapuletta/fastify-mongo-memory)
  Fastify MongoDB Memory Plugin pour tester la prise en charge.
- [`fastify-mongoose-api`](https://github.com/jeka-kiselyov/fastify-mongoose-api)
  Plugin Fastify pour créer des méthodes API REST basées sur les modèles Mongoose MongoDB.
- [`fastify-mongoose-driver`](https://github.com/alex-ppg/fastify-mongoose)
  Plugin Fastify Mongoose qui se connecte à MongoDB via le plugin Mongoose avec prise en charge des modèles.
- [`fastify-msgpack`](https://github.com/kenriortega/fastify-msgpack) Fastify et MessagePack, enfin ensemble. Utilise @msgpack/msgpack par défaut..
- [`fastify-multer`](https://github.com/fox1t/fastify-multer) Multer est un plugin pour gérer les données multipart/form, qui est principalement utilisé pour télécharger des fichiers.
- [`fastify-nats`](https://github.com/mahmed8003/fastify-nats) Plugin pour partager le client
  [NATS](https://nats.io) sur Fastify.
- [`fastify-no-additional-properties`](https://github.com/greguz/fastify-no-additional-properties)
  Ajouter `additionalProperties: false` par défaut à vos schémas JSON.
- [`fastify-no-icon`](https://github.com/jsumners/fastify-no-icon) Plugin pour éliminer les erreurs générées pour les requêtes `/favicon.ico`.
- [`fastify-nodemailer`](https://github.com/lependu/fastify-nodemailer) Plugin pour partager [nodemailer](https://nodemailer.com) transporteur à travers Fastify.
- [`fastify-normalize-request-reply`](https://github.com/ericrglass/fastify-normalize-request-reply)
  Plugin pour normaliser la requête et répondre à la requête et à la réponse de la version 4.x d'Express, qui permet l'utilisation d'un middleware, comme swagger-stats, initialement écrit pour Express.
- [`fastify-now`](https://github.com/yonathan06/fastify-now) Structurez vos terminaux dans un dossier et chargez-les dynamiquement avec Fastify.
- [`fastify-nuxtjs`](https://github.com/gomah/fastify-nuxtjs) Prise en charge du rendu côté serveur Vue pour Fastify avec Nuxt.js Framework.
- [`fastify-oas`](https://gitlab.com/m03geek/fastify-oas) Génère la documentation OpenAPI 3.0+ à partir des schémas de routes pour Fastify.
- [`fastify-objectionjs`](https://github.com/jarcodallo/fastify-objectionjs)
  Plugin pour le framework Fastify qui fournit une intégration avec l'ORM d'objectionjs.
- [`fastify-objectionjs-classes`](https://github.com/kamikazechaser/fastify-objectionjs-classes)
  Plugin pour sélectionner les classes cheery-pick à partir de l'ORM d'objectionjs.
- [`fastify-openapi-docs`](https://github.com/ShogunPanda/fastify-openapi-docs)
  Un plugin Fastify qui génère automatiquement les spécifications OpenAPI.
- [`fastify-openapi-glue`](https://github.com/seriousme/fastify-openapi-glue)
  Colle pour les spécifications OpenAPI dans Fastify, génère automatiquement des routes basées sur une spécification OpenAPI
- [`fastify-opentelemetry`](https://github.com/autotelic/fastify-opentelemetry)
  Un plug-in Fastify qui utilise l' [OpenTelemetry
  API](https://github.com/open-telemetry/opentelemetry-js-api) pour fournir un suivi des demandes.
- [`fastify-oracle`](https://github.com/cemremengu/fastify-oracle) Attache un
  [`oracledb`](https://github.com/oracle/node-oracledb) pool de connexion à une instance de serveur Fastify.
- [`fastify-orientdb`](https://github.com/mahmed8003/fastify-orientdb) Plug-in de connexion Fastify OrientDB, avec lequel vous pouvez partager la connexion OrientDB sur chaque partie de votre serveur.
- [`fastify-piscina`](https://github.com/piscinajs/fastify-piscina) Un plugin de pool de threads de travail utilisant [Piscina](https://github.com/piscinajs/piscina).
- [`fastify-peekaboo`](https://github.com/simone-sanfratello/fastify-peekaboo)
  Plugin Fastify pour mémoriser les réponses par des paramètres expressifs.
- [`fastify-polyglot`](https://github.com/heply/fastify-polyglot) Un plugin pour gérer i18n en utilisant
  [node-polyglot](https://www.npmjs.com/package/node-polyglot).
- [`fastify-postgraphile`](https://github.com/alemagio/fastify-postgraphile)
  Plugin pour intégrer [PostGraphile](https://www.graphile.org/postgraphile/) dans un projet Fastify.
- [`fastify-prettier`](https://github.com/hsynlms/fastify-prettier) Un plugin Fastify qui utilise [prettier](https://github.com/prettier/prettier) sous le capot pour embellir les réponses sortantes et/ou d'autres choses dans le serveur Fastify.
- [`fastify-print-routes`](https://github.com/ShogunPanda/fastify-print-routes)
  Un plugin Fastify qui imprime toutes les routes disponibles.
- [`fastify-protobufjs`](https://github.com/kenriortega/fastify-protobufjs)
  Fastify et protobufjs, enfin ensemble. Utilise protobufjs par défaut.
- [`fastify-qrcode`](https://github.com/chonla/fastify-qrcode) Ce plugin utilise [qrcode](https://github.com/soldair/node-qrcode) pour générer un code QR.
- [`fastify-qs`](https://github.com/webdevium/fastify-qs) Un plugin pour Fastify qui ajoute la prise en charge de l'analyse des paramètres de requête d'URL avec
  [qs](https://github.com/ljharb/qs).
- [`fastify-raw-body`](https://github.com/Eomm/fastify-raw-body) Ajoutez le champ `request.rawBody`.
- [`fastify-rbac`](https://gitlab.com/m03geek/fastify-rbac) plug-in de contrôle d'accès basé sur les rôles.
- [`fastify-recaptcha`](https://github.com/qwertyforce/fastify-recaptcha)
  Plugin Fastify pour la vérification recaptcha.
- [`fastify-redis-channels`](https://github.com/hearit-io/fastify-redis-channels)
  Un plugin pour une implémentation de canaux rapide, fiable et évolutive basée sur les flux Redis.
- [`fastify-register-routes`](https://github.com/israeleriston/fastify-register-routes)
  Plugin pour charger automatiquement les routes à partir d'un chemin spécifié et éventuellement limiter les noms de fichiers chargés par une expression régulière.
- [`fastify-response-time`](https://github.com/lolo32/fastify-response-time) Ajouter
  `X-Response-Time` un en-tête à chaque demande de Fastify, en millisecondes.
- [`fastify-response-caching`](https://github.com/codeaholicguy/fastify-response-caching)
  Un plugin Fastify pour mettre en cache la réponse.
- [`fastify-resty`](https://github.com/FastifyResty/fastify-resty) Framework Web basé sur Fastify avec génération automatique de routes d'API REST pour les entités TypeORM à l'aide de DI et de décorateurs.
- [`fastify-reverse-routes`](https://github.com/dimonnwc3/fastify-reverse-routes)
  Ce plug-in permet de définir des routes nommées et de créer un chemin en utilisant le nom et les paramètres.
- [`fastify-rob-config`](https://github.com/jeromemacias/fastify-rob-config)
  Accélérez l'intégration de Rob-Config.
- [`fastify-route-group`](https://github.com/TakNePoidet/fastify-route-group)
  Regroupement pratique et héritage des itinéraires
- [`fastify-schema-constraint`](https://github.com/Eomm/fastify-schema-constraint)
  Choisissez le schéma JSON à utiliser en fonction des paramètres de la requête.
- [`fastify-schema-to-typescript`](https://github.com/thomasthiebaud/fastify-schema-to-typescript)
  Générez des types basés sur vos schémas de validation JSON/YAML afin qu'ils soient toujours synchronisés.
- [`fastify-secure-session`](https://github.com/mcollina/fastify-secure-session)
  Créez une session de cookie sécurisée sans état pour Fastify.
- [`fastify-sentry`](https://github.com/alex-ppg/fastify-sentry) Plugin Fastify pour ajouter le gestionnaire d'erreurs Sentry SDK aux requêtes.
- [`fastify-sequelize`](https://github.com/lyquocnam/fastify-sequelize) Le plugin Fastify fonctionne avec Sequelize (adaptateur pour NodeJS -> Sqlite, Mysql, Mssql, Postgres).
- [`fastify-server-session`](https://github.com/jsumners/fastify-server-session)
  Un plug-in de session prenant en charge les caches de sauvegarde arbitraires via
  `fastify-caching`.
- [`fastify-slonik`](https://github.com/Unbuttun/fastify-slonik) Fastify Slonik plugin, avec cela, vous pouvez utiliser slonik dans chaque partie de votre serveur.
- [`fastify-soap-client`](https://github.com/fastify/fastify-soap-client) un plugin client SOAP pour Fastify.
- [`fastify-socket.io`](https://github.com/alemagio/fastify-socket.io) un plugin Socket.io pour Fastify.
- [`fastify-split-validator`](https://github.com/MetCoder95/fastify-split-validator) Petit plugin pour vous permettre d'utiliser plusieurs validateurs dans une route en fonction de chaque partie HTTP de la requête.
- [`fastify-sse`](https://github.com/lolo32/fastify-sse) pour fournir des événements envoyés par le serveur `reply.sse( … )` à Fastify.
- [`fastify-sse-v2`](https://github.com/nodefactoryio/fastify-sse-v2) pour fournir des événements envoyés par le serveur à l'aide d'itérateurs asynchrones (prend en charge les nouvelles versions de Fastify)
- [`fastify-stripe`](https://github.com/coopflow/fastify-stripe) Plugin pour initialiser et encapsuler les instances [Stripe
  Node.js](https://github.com/stripe/stripe-node) dans Fastify.
- [`fastify-supabase`](https://github.com/coopflow/fastify-supabase) Plugin pour initialiser et encapsuler les instances [Supabase](https://github.com/supabase/supabase-js)
  dans Fastify.
- [`fastify-tls-keygen`](https://gitlab.com/sebdeckers/fastify-tls-keygen)
  Générez automatiquement un certificat TLS compatible avec le navigateur, approuvé, auto-signé et réservé à l'hôte local.
- [`fastify-tokenize`](https://github.com/Bowser65/fastify-tokenize)
  [Tokenize](https://github.com/Bowser65/Tokenize) pour Fastify qui supprime la douleur de la gestion des jetons d'authentification, avec une intégration intégrée pour `fastify-auth`.
- [`fastify-totp`](https://github.com/heply/fastify-totp) Un plugin pour gérer TOTP (par exemple pour 2FA).
- [`fastify-twitch-ebs-tools`](https://github.com/lukemnet/fastify-twitch-ebs-tools)
  Fonctions utiles pour Twitch Extension Backend Services (EBS).
- [`fastify-typeorm-plugin`](https://github.com/inthepocket/fastify-typeorm-plugin)
  Plugin Fastify pour fonctionner avec TypeORM.
- [`fastify-vhost`](https://github.com/patrickpissurno/fastify-vhost) Requêtes HTTP de sous-domaine proxy vers un autre serveur (utile si vous souhaitez faire pointer plusieurs sous-domaines vers la même adresse IP, tout en exécutant différents serveurs sur la même machine).
- [`fastify-vite`](https://github.com/galvez/fastify-vite)
  [Vite](https://vitejs.dev/) pour Fastify avec prise en charge des données SSR.
- [`fastify-vue-plugin`](https://github.com/TheNoim/fastify-vue)
  [Nuxt.js](https://nuxtjs.org) pour Fastify. Contrôlez les routes que nuxt doit utiliser.
- [`fastify-wamp-router`](https://github.com/lependu/fastify-wamp-router) Routeur Web Application Messaging Protocol pour Fastify.
- [`fast-water`](https://github.com/tswayne/fast-water)Un plugin Fastify pour la ligne de flottaison. Décore Fastify avec des modèles de lignes de flottaison.
- [`fastify-webpack-hmr`](https://github.com/lependu/fastify-webpack-hmr)
  Plug-in de rechargement de module Webpack pour Fastify.
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
