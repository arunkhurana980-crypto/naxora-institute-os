# Backend API Record — Part 120

## Public
- `GET /api/part120/status`
- `GET /api/part120/security-policy`
- `POST /api/part120/auth/login`
- `GET /api/part120/demo`

## Valid session
- `GET /api/part120/auth/session`
- `POST /api/part120/auth/adopt-session`
- `POST /api/part120/auth/change-password`
- `POST /api/part120/auth/logout-all`

## Owner-only
- `GET /api/part120/admin/accounts`
- `POST /api/part120/admin/accounts/create-preview`
- `POST /api/part120/admin/accounts/create-confirmed`
- `POST /api/part120/admin/accounts/status-confirmed`
- `POST /api/part120/admin/accounts/reset-password-confirmed`

## Models
- `Part120UnifiedIdentity`
- `Part120AuthAudit`

Passwords are stored as scrypt hashes with unique random salts. Passwords and hashes are never returned by APIs.
