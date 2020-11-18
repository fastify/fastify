<h1 align="center">Fastify</h1>

## Recommendations

This document contains a set recommendations, or best practices, when using
Fastify.

* [Use A Reverse Proxy](#reverseproxy)
* [Kubernetes](#kubernetes)

## Use A Reverse Proxy
<a id="reverseproxy"></a>

Node.js is an early adopter of frameworks shipping with an easy to use web
server within the standard library. Previously, with languages like PHP or
Python, one would need either a web server with specific support for the
language or the ability to setup some sort of [CGI gateway][cgi] that works
with the language. With Node.js, one can simply write an application that
_directly_ handles HTTP requests. As a result, the temptation is to write
applications that handle requests for multiple domains, listen on multiple
ports (i.e. HTTP _and_ HTTPS), and various other scenarios and combinations
thereof. Further, the temptation is to then expose these applications directly
to the Internet to handle requests.

The Fastify team **strongly** considers this to be an anti-pattern and extremely
bad practice:

1. It adds unnecessary complexity to the application by diluting its focus.
2. It prevents [horizontal scalability][scale-horiz].

See [Why should I use a Reverse Proxy if Node.js is Production Ready?][why-use]
for a more thorough discussion of why one should opt to use a reverse proxy.

For a concrete example, consider the situation where:

1. The app needs multiple instances to handle load.
1. The app needs TLS termination.
1. The app needs to redirect HTTP requests to HTTPS.
1. The app needs to serve multiple domains.
1. The app needs to serve static resources, e.g. jpeg files.

There are many reverse proxy solutions available, and your environment may
dictate the solution to use, e.g. AWS or GCP. But given the above, we could use
[HAProxy][haproxy] to solve these requirements:

```conf
# The global section defines base HAProxy (engine) instance configuration.
global
  log /dev/log syslog
  maxconn 4096
  chroot /var/lib/haproxy
  user haproxy
  group haproxy

  # Set some baseline TLS options.
  tune.ssl.default-dh-param 2048
  ssl-default-bind-options no-sslv3 no-tlsv10 no-tlsv11
  ssl-default-bind-ciphers ECDH+AESGCM:DH+AESGCM:ECDH+AES256:DH+AES256:ECDH+AES128:DH+AES:RSA+AESGCM:RSA+AES:!aNULL:!MD5:!DSS
  ssl-default-server-options no-sslv3 no-tlsv10 no-tlsv11
  ssl-default-server-ciphers ECDH+AESGCM:DH+AESGCM:ECDH+AES256:DH+AES256:ECDH+AES128:DH+AES:RSA+AESGCM:RSA+AES:!aNULL:!MD5:!DSS

# Each defaults section defines options that will apply to each subsequent
# subsection until another defaults section is encountered.
defaults
  log   global
  mode  http
  option        httplog
  option        dontlognull
  retries       3
  option redispatch
  # The following option make haproxy close connections to backend servers
  # instead of keeping them open. This can alleviate unexpected connection
  # reset errors in the Node process.
  option http-server-close
  maxconn       2000
  timeout connect 5000
  timeout client 50000
  timeout server 50000

  # Enable content compression for specific content types.
  compression algo gzip
  compression type text/html text/plain text/css application/javascript

# A "frontend" section defines a public listener, i.e. an "http server"
# as far as clients are concerned.
frontend proxy
  # The IP address here would be the _public_ IP address of the server.
  # Here, we use a private address as an example.
  bind 10.0.0.10:80
  # This redirect rule will redirect all traffic that is not TLS traffic
  # to the same incoming request URL on the HTTPS port.
  redirect scheme https code 308 if !{ ssl_fc }
  # Technically this use_backend directive is useless since we are simply
  # redirecting all traffic to this frontend to the HTTPS frontend. It is
  # merely included here for completeness sake.
  use_backend default-server

# This frontend defines our primary, TLS only, listener. It is here where
# we will define the TLS certificates to expose and how to direct incoming
# requests.
frontend proxy-ssl
  # The `/etc/haproxy/certs` directory in this example contains a set of
  # certificate PEM files that are named for the domains the certificates are
  # issued for. When HAProxy starts, it will read this directory, load all of
  # the certificates it finds here, and use SNI matching to apply the correct
  # certificate to the connection.
  bind 10.0.0.10:443 ssl crt /etc/haproxy/certs

  # Here we define rule pairs to handle static resources. Any incoming request
  # that has a path starting with `/static`, e.g.
  # `https://one.example.com/static/foo.jpeg`, will be redirected to the
  # static resources server.
  acl is_static path -i -m beg /static
  use_backend static-backend if is_static

  # Here we define rule pairs to direct requests to appropriate Node.js
  # servers based on the requested domain. The `acl` line is used to match
  # the incoming hostname and define a boolean indicating if it is a match.
  # The `use_backend` line is used to direct the traffic if the boolean is
  # true.
  acl example1 hdr_sub(Host) one.example.com
  use_backend example1-backend if example1

  acl example2 hdr_sub(Host) two.example.com
  use_backend example2-backend if example2

  # Finally, we have a fallback redirect if none of the requested hosts
  # match the above rules.
  default_backend default-server

# A "backend" is used to tell HAProxy where to request information for the
# proxied request. These sections are where we will define where our Node.js
# apps live and any other servers for things like static assets.
backend default-server
  # In this example we are defaulting unmatched domain requests to a single
  # backend server for all requests. Notice that the backend server does not
  # have to be serving TLS requests. This is called "TLS termination": the TLS
  # connection is "terminated" at the reverse proxy.
  # It is possible to also proxy to backend servers that are themselves serving
  # requests over TLS, but that is outside the scope of this example.
  server server1 10.10.10.2:80

# This backend configuration will serve requests for `https://one.example.com`
# by proxying requests to three backend servers in a round-robin manner.
backend example1-backend
  server example1-1 10.10.11.2:80
  server example1-2 10.10.11.2:80
  server example2-2 10.10.11.3:80

# This one serves requests for `https://two.example.com`
backend example2-backend
  server example2-1 10.10.12.2:80
  server example2-2 10.10.12.2:80
  server example2-3 10.10.12.3:80

# This backend handles the static resources requests.
backend static-backend
  server static-server1 10.10.9.2:80
```

[cgi]: https://en.wikipedia.org/wiki/Common_Gateway_Interface
[scale-horiz]: https://en.wikipedia.org/wiki/Scalability#Horizontal
[why-use]: https://web.archive.org/web/20190821102906/https://medium.com/intrinsic/why-should-i-use-a-reverse-proxy-if-node-js-is-production-ready-5a079408b2ca
[haproxy]: https://www.haproxy.org/

## Kubernetes
<a id="kubernetes"></a>

The `readinessProbe` uses [(by default](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)) the pod IP as the hostname. Fastify listens on `127.0.0.1` by default. The probe will not be able to reach the application in this case. In order to make it work, the application must listen on `0.0.0.0` or specify a custom hostname in the `readinessProbe.httpGet` spec, as per the following example:

```yaml
readinessProbe:
    httpGet:
        path: /health
        port: 4000
    initialDelaySeconds: 30
    periodSeconds: 30
    timeoutSeconds: 3
    successThreshold: 1
    failureThreshold: 5
