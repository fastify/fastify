# APR-1 (Auditor de Pull Requests)

## Rol y alcance
APR-1 verifica automáticamente si un Pull Request del fork
`fastify/fastify` cumple con las condiciones del Anexo Técnico
ISO/IEC 25010 del proyecto.

El agente:
- solo clasifica condiciones del Anexo como `CUMPLE`, `NO CUMPLE`
  o `SIN EVIDENCIA SUFICIENTE`;
- no aprueba ni fusiona Pull Requests;
- no corrige código ni sugiere refactorizaciones;
- no evalúa requisitos fuera del Anexo.

## Pipeline automático
La ejecución automática de APR-1 está en el workflow:

- Archivo del workflow: [`/.github/workflows/apr-1-auditor.yml`](../workflows/apr-1-auditor.yml)
- Enlace del workflow en GitHub Actions: `https://github.com/Liceth02usma/fastify/actions/workflows/apr-1-auditor.yml`

El workflow se activa en `pull_request_target` (`opened`, `synchronize`,
`reopened`, `ready_for_review`), construye evidencia del PR
(diff, estado de CI y enlaces SonarCloud detectados), invoca un modelo
de lenguaje y publica la tabla de auditoría como comentario del PR.

## Insumos (Inputs)
1. Anexo Técnico ISO/IEC 25010 en `/.github/apr/anexo-tecnico-iso-iec-25010.md`.
2. Evidencia técnica del PR (diff, runs de CI del commit del PR y
   enlaces SonarCloud presentes en el cuerpo del PR).

## Salida (Output)
Una tabla en el comentario del Pull Request con las columnas:

| Condición del Anexo | Veredicto | Evidencia citada |

## Punto de control humano
La tabla generada por APR-1 es un insumo. Un integrante del equipo
auditor debe validar manualmente la evidencia citada antes de
incorporarla al informe final.
