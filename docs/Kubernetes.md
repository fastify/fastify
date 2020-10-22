<h1 align="center">Fastify</h1>

## Kubernetes

Please consider following points if you want to run fastify on kubernetes.

### Readiness Probe

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
```

The `readinessProbe` use [(by default](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)) the pod IP as hostname. Fastify listen on `127.0.0.1` by default. Your probe won't be able to reach your application. In order to make it work you have to listen on `0.0.0.0` or specify a custom hostname in the `readinessProbe.httpGet` spec.