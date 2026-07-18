# START HERE — Part 136.1

## Purpose

This hotfix solves two runtime blockers:

1. `/login` was opening the old Student/Teacher/Parent page.
2. No secure first Institute Owner and Institute ID creation flow existed.

## Included

- Early `/login` redirect to `/common-login`.
- `/owner-bootstrap` secure one-time setup page.
- Automatic Institute ID generation.
- First `institute_owner` creation in Part 120 unified identity.
- Part 120-compatible scrypt password hashing.
- Part 120-compatible JWT with `instituteId`.
- Preview and exact confirmation.
- Private Render bootstrap secret.
- Permanent one-time bootstrap lock.
- Common Login link shown only while bootstrap is available.

## Install

```powershell
node .\VERIFY-PART136.js
node --check .\backend\src\server.js
node .\APPLY-PART1361.js
node .\VERIFY-PART1361.js
```
