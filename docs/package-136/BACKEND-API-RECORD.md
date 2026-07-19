# Part 136 API Record

## Public

- `GET /api/part136/status`
- `GET /api/part136/security-policy`
- `GET /api/part136/acceptance-matrix`

## Authenticated

- `GET /api/part136/runs`
- `GET /api/part136/runs/:runId`
- `POST /api/part136/runs/:runId/role-self-test`
- `POST /api/part136/runs/:runId/workflow-evidence`
- `POST /api/part136/runs/:runId/button-coverage`
- `GET /api/part136/runs/:runId/certificate`

## Owner-only

- `POST /api/part136/runs`
- `POST /api/part136/runs/:runId/baseline`
- `POST /api/part136/runs/:runId/security-probes`
- `POST /api/part136/runs/:runId/finalize`

## Models

- `Part136AcceptanceRun`
- `Part136AcceptanceAudit`
