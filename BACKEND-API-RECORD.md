# Backend API Record — Part 125

## Public
- `GET /api/part125/status`
- `GET /api/part125/security-policy`
- `GET /api/part125/catalog`
- `GET /api/part125/demo`

## Logged-in role
- `GET /api/part125/my-actions`
- `GET /api/part125/actions/:actionId`
- `POST /api/part125/actions/preview`
- `POST /api/part125/actions/:actionId/confirm`
- `POST /api/part125/actions/:actionId/execute`
- `POST /api/part125/actions/:actionId/cancel`
- `POST /api/part125/vani/command`

## Models
- `Part125VaniAction`
- `Part125CanonicalActionRecord`
- `Part125ActionOutbox`
- `Part125ActionAudit`

## Adapter export
`registerPart125ActionAdapter(app, actionType, handler, name)`

Part 126 uses this export to connect native Attendance, Fees, Admissions, Assignment and notification modules.
