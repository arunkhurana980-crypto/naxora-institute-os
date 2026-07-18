# Part 129 Backend API Record

## Public

- `GET /api/part129/status`
- `GET /api/part129/security-policy`
- `GET /api/part129/catalog`
- `GET /api/part129/templates/:datasetType`
- `GET /api/part129/demo`

## Owner-only

- `POST /api/part129/vani/command`
- `POST /api/part129/imports/preview`
- `POST /api/part129/imports/:importId/confirm`
- `POST /api/part129/imports/:importId/cancel`
- `GET /api/part129/imports`
- `GET /api/part129/imports/:importId`

## Models

- `Part129BulkImport`
- `Part129BulkImportAudit`

The imported native data is written into Part 120, Part 124 and Part 128 models.
