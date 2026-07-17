# Backend API Record — Part 121

## Public
- `GET /api/part121/status`
- `GET /api/part121/security-policy`
- `GET /api/part121/catalog`
- `GET /api/part121/demo`

## Owner-only
- `GET /api/part121/overview`
- `GET /api/part121/modules`
- `GET /api/part121/activity`
- `GET /api/part121/health`
- `POST /api/part121/module/open`
- `POST /api/part121/vani/command`

## Export
- `getPart121OwnerOverview(...)`

This export is reserved for Part 125 Global VANI orchestration.

## Model
- `Part121OwnerWorkspaceAudit`
