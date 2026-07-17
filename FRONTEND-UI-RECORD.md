# Frontend UI Record — Part 120

## Common login
`/login`

Fields:
- Institute ID / Code.
- Email, Phone or Login ID.
- Password.
- Remember me.

## First password change
`/change-password`

Temporary-password users must replace it before using `/app`.

## Account Access Manager
`/account-access-manager`

Owner can:
- list institute accounts,
- create role accounts,
- disable/enable accounts,
- reset temporary passwords.

Sensitive actions require exact confirmation and private Owner Action Secret.

## Unified app integration
Part 120 inserts `/naxora-common-session.js` into the Part 119 shell. `/app` redirects to `/login` when the session is missing/invalid and redirects to `/change-password` when required.
