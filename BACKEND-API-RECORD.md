# Backend API Record — Part 126

## Public
- `GET /api/part126/status`
- `GET /api/part126/security-policy`
- `GET /api/part126/catalog`
- `GET /api/part126/demo`

## Authenticated
- `GET /api/part126/health`
- `GET /api/part126/actions/pending`
- `POST /api/part126/actions/:actionId/retry-preview`
- `POST /api/part126/actions/:actionId/retry-confirmed`
- `GET /api/part126/executions`
- `GET /api/part126/notifications`
- `POST /api/part126/notifications/:notificationId/read`
- `GET /api/part126/deliveries`

## Owner-only
- `GET /api/part126/e2e/acceptance`

## Export
- `getPart126Acceptance({ app, instituteId })`
