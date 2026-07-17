# Backend API Record — Part 127

## Public

- `GET /api/part127/status`
- `GET /api/part127/security-policy`
- `GET /api/part127/demo-template`
- `GET /api/part127/demo`

## Owner-only

- `GET /api/part127/demo-status`
- `POST /api/part127/demo-import/preview`
- `POST /api/part127/demo-import/confirmed`
- `POST /api/part127/demo-reset/preview`
- `POST /api/part127/demo-reset/confirmed`
- `GET /api/part127/acceptance`
- `POST /api/part127/freeze/preview`
- `POST /api/part127/freeze/confirmed`
- `GET /api/part127/release`
- `GET /api/part127/release-manifest.json`

## Export

- `getPart127FinalAcceptance(...)`

## Important models

- `Part127DemoDataset`
- `Part127DemoImportPreview`
- `Part127ReleaseFreeze`
- `Part127FinalAudit`
- linked `Part127Demo*` operational models.
