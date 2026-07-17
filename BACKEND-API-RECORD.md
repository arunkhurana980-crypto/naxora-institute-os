# Backend API Record — Part 124

## Public
- `GET /api/part124/status`
- `GET /api/part124/security-policy`
- `GET /api/part124/catalog`
- `GET /api/part124/demo`

## Supported role or Owner
- `GET /api/part124/overview`
- `GET /api/part124/modules`
- `GET /api/part124/activity`
- `GET /api/part124/health`
- `POST /api/part124/module/open`
- `POST /api/part124/vani/command`

Pass workspace role through:
- `x-naxora-workspace-role`, or
- `workspaceRole` query/body.

Non-owner workspace role must match login role.

## Owner-only scope management
- `GET /api/part124/admin/scope-accounts`
- `POST /api/part124/admin/scope-preview`
- `POST /api/part124/admin/scope-confirmed`

## Models
- `Part124RoleScopeAssignment`
- `Part124RoleWorkspaceAudit`

## Export
- `getPart124RoleOverview(...)`
