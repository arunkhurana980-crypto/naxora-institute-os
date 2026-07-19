# Part 134 APIs

## Public
- `GET /api/part134/status`
- `GET /api/part134/security-policy`
- `GET /api/part134/catalog`
- `GET /api/part134/demo`
- `GET /api/part134/download/:ticket`

## Authenticated
- `POST /api/part134/actions/preview`
- `POST /api/part134/vani/command`
- `POST /api/part134/actions/:actionId/confirm`
- `POST /api/part134/actions/:actionId/cancel`
- `GET /api/part134/actions`
- `GET /api/part134/reports`
- `GET /api/part134/reports/:reportId`
- `GET /api/part134/exports`
- `POST /api/part134/exports/:exportId/ticket`

## Models
- Part134ReportAction
- Part134ReportSnapshot
- Part134Export
- Part134ReportAudit
