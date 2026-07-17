# Security and Role Tests — Part 116

## Mandatory
- `VERIFY-PART116.js` shows Parts 112–116 before the 404 handler.
- No JWT returns 401.
- Institute mismatch returns 403.
- `active` can unlock.
- `authenticated`, `pending`, `halted`, `cancelled`, `completed`, `expired` do not unlock.
- Teacher cannot use owner-only feature.
- Student cannot use fee-management API.
- Parent cannot use branch command centre.
- Business active without V3 denies owner AI.
- V3 active without Business allows owner AI but not Business modules.
- V3 active with teacher/student/parent still denies owner AI.
- Direct backend URL must deny unauthorized access even if a button is manually unhidden.
- Access checks create audit records without JWT or provider secrets.
