# Backend API Record — Part 119

## Public
- `GET /api/part119/status`
- `GET /api/part119/catalog`
- `GET /api/part119/security-policy`
- `GET /api/part119/health`
- `GET /api/part119/demo`

## Logged-in roles
- `GET /api/part119/session`
- `GET /api/part119/navigation`
- `POST /api/part119/module/open`
- `POST /api/part119/vani/command`

## Security
- JWT is verified server-side.
- instituteId from JWT/request must match.
- Module routes come from a server allowlist.
- Role is checked server-side.
- Paid and V3 modules use Part 116 entitlements.
- Billing controls remain institute_owner-only.
- VANI cannot provide arbitrary URLs.
